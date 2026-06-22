package com.carhub;

import com.carhub.middleware.Auth;
import com.carhub.models.*;

import spark.utils.IOUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import static spark.Spark.*;

import javax.servlet.http.Part;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.util.UUID;
import java.net.URL;

import javax.servlet.MultipartConfigElement;

import com.carhub.DBCRUD.ODB;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Properties;

import javax.mail.Message;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

public class App {

    // Helper: parse JSON body safely
    private static JSONObject bodyJson(String body) {
        if (body == null || body.trim().isEmpty())
            return new JSONObject();
        return new JSONObject(body);
    }

    private static boolean sendResetEmail(String toEmail, String resetLink) {
        final String smtpHost = "smtp.gmail.com";
        final String smtpPort = "587";
        final String smtpUser = "alkaheel12345678@gmail.com";
        final String smtpPass = "wzek yjez qotz zufq";
        final String fromEmail = "alkaheel12345678@gmail.com";

        if (smtpHost == null || smtpPort == null || smtpUser == null || smtpPass == null || fromEmail == null) {
            System.out.println("SMTP env vars are missing.");
            return false;
        }

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", smtpHost);
        props.put("mail.smtp.port", smtpPort);

        Session session = Session.getInstance(props, new javax.mail.Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(smtpUser, smtpPass);
            }
        });

        try {
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(fromEmail, "CarHub"));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(toEmail));
            message.setSubject("Reset Your CarHub Password");

            String html = ""
                    + "<div style='font-family:Arial,sans-serif;line-height:1.6;color:#222'>"
                    + "<h2>Reset Your Password</h2>"
                    + "<p>We received a request to reset your password.</p>"
                    + "<p>Click the link below to continue:</p>"
                    + "<p><a href='" + resetLink + "'>" + resetLink + "</a></p>"
                    + "<p>This link will expire in 30 minutes.</p>"
                    + "<p>If you did not request this, you can ignore this email.</p>"
                    + "</div>";

            message.setContent(html, "text/html; charset=utf-8");
            Transport.send(message);
            return true;
        } catch (Exception ex) {
            System.out.println("Email send failed: " + ex.getClass().getName());
            System.out.println("Message: " + ex.getMessage());
            ex.printStackTrace();
            return false;
        }
    }

    // Helper: read token from either `token` header or `Authorization: Bearer ...`
    private static String tokenFrom(spark.Request req) {
        String t = req.headers("token");
        if (t != null && !t.trim().isEmpty())
            return t.trim();
        String auth = req.headers("Authorization");
        if (auth != null) {
            auth = auth.trim();
            if (auth.toLowerCase().startsWith("bearer ")) {
                return auth.substring(7).trim();
            }
        }
        return "";
    }

    // Helper: call the AI model:
    private static JSONObject callAiService(String text) throws Exception {
        URL url = new URL("http://127.0.0.1:5000/predict");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(3000);
        conn.setReadTimeout(5000);
        conn.setDoOutput(true);

        JSONObject payload = new JSONObject();
        payload.put("text", text);
        payload.put("complaint", text);

        try (OutputStream os = conn.getOutputStream()) {
            byte[] input = payload.toString().getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        int status = conn.getResponseCode();

        InputStream stream = (status >= 200 && status < 300)
                ? conn.getInputStream()
                : conn.getErrorStream();

        StringBuilder response = new StringBuilder();
        if (stream != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(stream, "utf-8"))) {
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line.trim());
                }
            }
        }

        conn.disconnect();

        JSONObject responseJson = response.length() == 0 ? new JSONObject() : new JSONObject(response.toString());
        if (status < 200 || status >= 300) {
            String errorMessage = responseJson.optString("error",
                    responseJson.optString("msg", "AI service returned status " + status));
            throw new RuntimeException(errorMessage);
        }

        return responseJson;
    }

    public static void main(String[] args) {

        // -----------------------------
        // Server config
        // -----------------------------
        port(4567);

        // -----------------------------
        // Static files (Images)
        // -----------------------------
        // Configure where images are stored on disk.
        // You can override this path using env var: CARHUB_FILES_DIR
        // Example (Windows): G:/CARHUB/CarHubFiles
        final String FILES_BASE_DIR;
        {
            String p = System.getenv("CARHUB_FILES_DIR");
            if (p == null || p.trim().isEmpty()) {
                p = "G:/CARHUB/CarHubFiles";
            }
            FILES_BASE_DIR = new File(p).getAbsolutePath();
        }

        // Serve CarHubFiles under /carhubfiles/*
        // So: CarHubFiles/uploads/shops/a.jpg ->
        // http://localhost:4567/carhubfiles/uploads/shops/a.jpg
        get("/carhubfiles/*", (req, res) -> {
            String rel = req.splat()[0];
            if (rel == null)
                rel = "";
            rel = rel.replace('\\', '/');

            File base = new File(FILES_BASE_DIR);
            File f = new File(base, rel);

            // Security: prevent ../ traversal
            if (!f.getCanonicalPath().startsWith(base.getCanonicalPath())) {
                halt(403);
                return "";
            }
            if (!f.exists() || f.isDirectory()) {
                halt(404);
                return "";
            }

            String ct = Files.probeContentType(f.toPath());
            if (ct != null)
                res.type(ct);

            try (OutputStream out = res.raw().getOutputStream()) {
                Files.copy(f.toPath(), out);
                out.flush();
            }
            return res.raw();
        });

        // -----------------------------
        // CORS (same style as your old project)
        // -----------------------------
        options("/*", (request, response) -> {
            response.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE,OPTIONS");
            response.header("Access-Control-Allow-Headers",
                    "Content-Type,Authorization,X-Requested-With,token,Content-Length,Accept,Origin");
            response.header("Access-Control-Allow-Credentials", "true");
            response.type("application/json");
            return "OK";
        });

        before((request, response) -> {
            response.header("Access-Control-Allow-Origin", "*");
            response.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,DELETE,OPTIONS");
            response.header("Access-Control-Allow-Headers",
                    "Content-Type,Authorization,X-Requested-With,token,Content-Length,Accept,Origin");
            response.header("Access-Control-Allow-Credentials", "true");
            response.type("application/json");
        });

        // Global error handler (optional but useful)
        exception(Exception.class, (ex, req, res) -> {
            res.status(500);
            JSONObject r = new JSONObject();
            r.put("success", false);
            r.put("error", ex.getMessage());
            res.body(r.toString());
        });

        notFound((req, res) -> {
            res.type("application/json");
            res.status(404);
            return new JSONObject().put("success", false).put("error", "Route not found").toString();
        });

        // -----------------------------
        // Objects (models + auth)
        // -----------------------------
        final Auth auth = new Auth();

        final ClientAccount client = new ClientAccount();
        final ShopAccount shop = new ShopAccount();
        final AdminAccount admin = new AdminAccount();

        final City city = new City();
        final Car car = new Car();

        final PartShop part = new PartShop();
        final PartImage partImage = new PartImage();
        final PartCar partCar = new PartCar();

        final PartsOrder partsOrder = new PartsOrder();
        final HelpOrder helpOrder = new HelpOrder();

        final PartReview partReview = new PartReview();
        final ShopReview shopReview = new ShopReview();
        final PasswordReset passwordReset = new PasswordReset();
        // -----------------------------
        // Health
        // -----------------------------
        get("/api/health", (req, res) -> {
            JSONObject r = new JSONObject();
            r.put("success", true);
            r.put("project", "CARHUB");
            return r;
        });

        // =========================================================
        // AUTH (Client / Shop / Admin)
        // =========================================================

        post("/api/client/login", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                String email = body.getString("email");
                String rawPassword = body.getString("password");

                JSONArray data = client.findByEmailWithPassword(email);

                if (data != null && data.length() > 0) {
                    JSONObject userObj = data.getJSONObject(0);

                    if (userObj.optInt("is_active", 1) != 1) {
                        res.status(403);
                        return r.put("success", false).put("msg", "Account is inactive");
                    }

                    String storedHash = userObj.optString("password", "");
                    if (auth.verifyPassword(rawPassword, storedHash)) {
                        String token = auth.createToken("client", userObj.getInt("id"));
                        userObj.remove("password");
                        r.put("success", true);
                        r.put("token", token);
                        r.put("client", userObj);
                        res.status(200);
                        return r;
                    }
                }

                res.status(401);
                return r.put("success", false).put("msg", "Email or password is wrong");
            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });
        // Client register
        post("/api/client/register", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                String email = body.optString("email", "").trim();
                String rawPassword = body.optString("password", "").trim();
                if (email.isEmpty() || rawPassword.isEmpty()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Email and password are required");
                }

                String password = auth.hashPassword(rawPassword);

                client.setEmail(email);
                client.setPassword(password);
                client.setPhone(body.optString("phone", ""));
                client.setAddress(body.optString("address", ""));
                client.setCar_type(body.optString("car_type", null));
                client.setAvatar_url(body.optString("avatar_url", null));
                client.setFname(body.optString("fname", ""));
                client.setLname(body.optString("lname", ""));

                if (body.has("city")) {
                    if (body.isNull("city"))
                        client.setCity(null);
                    else
                        client.setCity(body.getInt("city"));
                } else {
                    client.setCity(null);
                }

                if (!client.register()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to create account");
                }

                // Return created user (login query avoids returning password)
                JSONArray data = client.findByEmail(email);
                res.status(201);
                r.put("success", true);
                r.put("client", (data != null && data.length() > 0) ? data.getJSONObject(0) : new JSONObject());
                return r;

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        post("/api/shop/login", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                String email = body.getString("email");
                String rawPassword = body.getString("password");

                shop.setEmail(email);
                JSONArray data = shop.login();

                if (data != null && data.length() > 0) {
                    JSONObject shopObj = data.getJSONObject(0);
                    String storedHash = shopObj.optString("password", "");

                    if (auth.verifyPassword(rawPassword, storedHash)) {
                        String token = auth.createToken("shop", shopObj.getInt("id"));
                        shopObj.remove("password");
                        r.put("success", true);
                        r.put("token", token);
                        r.put("shop", shopObj);
                        res.status(200);
                        return r;
                    }
                }

                JSONArray any = shop.findByEmailAnyStatus();
                if (any != null && any.length() > 0) {
                    JSONObject row = any.getJSONObject(0);
                    String storedHash = row.optString("password", "");
                    if (auth.verifyPassword(rawPassword, storedHash)) {
                        int st = row.optInt("is_active", 0);
                        res.status(403);
                        if (st == 0)
                            return r.put("success", false).put("msg", "Shop not approved yet");
                        if (st == 2)
                            return r.put("success", false).put("msg", "Shop account is deactivated");
                        return r.put("success", false).put("msg", "Shop account is not active");
                    }
                }

                res.status(401);
                return r.put("success", false).put("msg", "Email or password is wrong");
            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });
        // Shop register (creates non-active account, requires admin approval)
        // NOTE: shops table column is now: description (renamed from our_cars)
        post("/api/shop/register", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                String email = body.optString("email", "").trim();
                String rawPassword = body.optString("password", "").trim();
                String password = auth.hashPassword(rawPassword);
                String name = body.optString("name", "").trim();
                String phone = body.optString("phone", "").trim();
                String address = body.optString("address", "").trim();
                String photoUrl = body.optString("photo_url", "").trim();
                String description = body.optString("description", "").trim();
                String services = body.optString("services", "").trim();

                if (email.isEmpty() || rawPassword.isEmpty() || name.isEmpty() || phone.isEmpty()
                        || address.isEmpty()) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "name, email, password, phone, address are required");
                }

                Integer cityId = null;
                if (body.has("city") && !body.isNull("city")) {
                    cityId = body.getInt("city");
                }

                // Use direct SQL insert to avoid depending on unshared ShopAccount methods.
                // Table name follows same convention as clients_accounts.
                ODB odb = new ODB();
                String sql = "INSERT INTO shops_accounts (name, email, password, phone, address, photo_url, is_active, description, city, services) "
                        +
                        "VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)";
                PreparedStatement stmt = odb.prepareStmt(sql);
                stmt.setString(1, name);
                stmt.setString(2, email);
                stmt.setString(3, password);
                stmt.setString(4, phone);
                stmt.setString(5, address);
                stmt.setString(6, photoUrl);
                stmt.setString(7, description);
                if (cityId == null)
                    stmt.setNull(8, java.sql.Types.INTEGER);
                else
                    stmt.setInt(8, cityId);
                stmt.setString(9, services);

                int rows = odb.ExecuteUpdate(stmt);
                if (rows <= 0) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to create workshop account");
                }

                res.status(201);
                return r.put("success", true).put("msg", "Workshop account created. Waiting for admin approval.");

            } catch (SQLException ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        post("/api/admin/login", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                admin.setEmail(body.getString("email"));
                admin.setPassword(body.getString("password"));

                JSONArray data = admin.login();
                if (data != null && data.length() > 0) {
                    JSONObject adminObj = data.getJSONObject(0);
                    String token = auth.createToken("admin", adminObj.getInt("id"));
                    r.put("success", true);
                    r.put("token", token);
                    r.put("admin", adminObj);
                    res.status(200);
                } else {
                    res.status(401);
                    r.put("success", false);
                    r.put("msg", "Email or password is wrong");
                }
            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });

        post("/api/auth/forgot-password", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                String email = body.optString("email", "").trim().toLowerCase();
                String accountType = body.optString("account_type", "").trim().toLowerCase();

                if (email.isEmpty() || accountType.isEmpty()) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "email and account_type are required");
                }

                if (!"client".equals(accountType) && !"shop".equals(accountType)) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "account_type must be client or shop");
                }

                boolean exists = false;

                if ("client".equals(accountType)) {
                    JSONArray rows = client.findByEmail(email);
                    exists = rows != null && rows.length() > 0;
                } else {
                    shop.setEmail(email);
                    JSONArray rows = shop.findByEmailAnyStatus();
                    exists = rows != null && rows.length() > 0;
                }

                if (!exists) {
                    res.status(404);
                    return r.put("success", false)
                            .put("msg", "Email is not registered");
                }

                passwordReset.markAllUnusedAsUsedByEmail(email, accountType);

                String token = UUID.randomUUID().toString().replace("-", "")
                        + UUID.randomUUID().toString().replace("-", "");

                Timestamp expiresAt = Timestamp.from(Instant.now().plusSeconds(60 * 30));

                PasswordReset pr = new PasswordReset();
                pr.setEmail(email);
                pr.setAccount_type(accountType);
                pr.setToken(token);
                pr.setExpires_at(expiresAt);

                if (!pr.create()) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "Failed to create reset request");
                }

                String resetLink = "http://localhost:8000/reset-password?root=reset-password&token=" + token;

                boolean mailSent = sendResetEmail(email, resetLink);
                if (!mailSent) {
                    res.status(500);
                    return r.put("success", false)
                            .put("msg", "Failed to send reset email");
                }

                res.status(200);
                return r.put("success", true)
                        .put("msg", "Email exists, reset link has been sent.");

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        post("/api/auth/reset-password", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());

                String token = body.optString("token", "").trim();
                String newPassword = body.optString("new_password", "").trim();

                if (token.isEmpty() || newPassword.isEmpty()) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "token and new_password are required");
                }

                JSONArray rows = passwordReset.findValidByToken(token);
                if (rows == null || rows.length() == 0) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "Invalid or expired reset token");
                }

                JSONObject resetObj = rows.getJSONObject(0);

                String email = resetObj.optString("email", "").trim().toLowerCase();
                String accountType = resetObj.optString("account_type", "").trim().toLowerCase();

                String hashedPassword = auth.hashPassword(newPassword);
                boolean updated = false;

                if ("client".equals(accountType)) {
                    JSONArray clientRows = client.findByEmail(email);

                    if (clientRows != null && clientRows.length() > 0) {
                        int clientId = clientRows.getJSONObject(0).optInt("id");

                        client.setId(clientId);
                        client.setPassword(hashedPassword);

                        updated = client.updatePassword();
                    }

                } else if ("shop".equals(accountType)) {
                    shop.setEmail(email);
                    JSONArray shopRows = shop.findByEmailAnyStatus();

                    if (shopRows != null && shopRows.length() > 0) {
                        int shopId = shopRows.getJSONObject(0).optInt("id");

                        shop.setId(shopId);
                        shop.setPassword(hashedPassword);

                        updated = shop.updatePassword();
                    }
                }

                if (!updated) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "Failed to update password");
                }

                passwordReset.markUsedByToken(token);

                res.status(200);
                return r.put("success", true)
                        .put("msg", "Password reset successfully");

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false)
                        .put("error", ex.getMessage());
            }
        });

        // Get current user by token
        // Returns: { success:true, role:"client|shop|admin", user:{...} }
        get("/api/me", (req, res) -> {
            JSONObject r = new JSONObject();

            String token = tokenFrom(req);
            if (!auth.verifyToken(token)) {
                res.status(401);
                return r.put("success", false).put("msg", "Invalid or expired token");
            }

            String role = auth.getRole(token);
            int userId = auth.getUserId(token);

            r.put("success", true);
            r.put("role", role);

            if ("client".equals(role)) {
                JSONArray rows = client.findById(userId);
                r.put("user", (rows != null && rows.length() > 0) ? rows.getJSONObject(0) : new JSONObject());
            } else if ("shop".equals(role)) {
                JSONArray rows = shop.findById(userId);
                r.put("user", (rows != null && rows.length() > 0) ? rows.getJSONObject(0) : new JSONObject());
            } else {
                // Admin (or unknown role): we at least return the id
                r.put("user", new JSONObject().put("id", userId));
            }

            res.status(200);
            return r;
        });

        // Update client profile (PUT/PATCH) - token must be for a client
        spark.Route updateClientProfile = (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = tokenFrom(req);
                if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int clientId = auth.getUserId(token);
                JSONArray existing = client.findById(clientId);
                if (existing == null || existing.length() == 0) {
                    res.status(404);
                    return r.put("success", false).put("msg", "Client not found");
                }
                JSONObject cur = existing.getJSONObject(0);
                JSONObject body = bodyJson(req.body());

                client.setId(clientId);
                client.setPhone(body.has("phone") ? body.optString("phone", null) : cur.optString("phone", null));
                client.setAddress(
                        body.has("address") ? body.optString("address", null) : cur.optString("address", null));
                client.setCar_type(
                        body.has("car_type") ? body.optString("car_type", null) : cur.optString("car_type", null));
                client.setAvatar_url(body.has("avatar_url") ? body.optString("avatar_url", null)
                        : cur.optString("avatar_url", null));
                client.setFname(body.has("fname") ? body.optString("fname", null) : cur.optString("fname", null));
                client.setLname(body.has("lname") ? body.optString("lname", null) : cur.optString("lname", null));

                if (body.has("city")) {
                    if (body.isNull("city"))
                        client.setCity(null);
                    else
                        client.setCity(body.getInt("city"));
                } else {
                    Object curCity = cur.opt("city");
                    if (curCity == null || curCity == JSONObject.NULL)
                        client.setCity(null);
                    else
                        client.setCity(cur.getInt("city"));
                }

                if (!client.updateProfile()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to update profile");
                }

                JSONArray after = client.findById(clientId);
                res.status(200);
                r.put("success", true);
                r.put("client", (after != null && after.length() > 0) ? after.getJSONObject(0) : new JSONObject());
                return r;
            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        };
        put("/api/client/profile", updateClientProfile);
        patch("/api/client/profile", updateClientProfile);

        // =========================================================
        // PUBLIC (Cities, Parts, Part Details)
        // =========================================================

        get("/api/cities", (req, res) -> city.listAll());

        // Upload an image (public)
        // FormData fields:
        // - image: the file
        // - folder: optional (e.g. "shops" or "clients")
        // Returns: { success:true, image_url:"/carhubfiles/uploads/<folder>/<file>" }
        post("/api/upload/image", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                // Enable multipart (FormData)
                req.attribute("org.eclipse.jetty.multipartConfig",
                        new MultipartConfigElement(System.getProperty("java.io.tmpdir")));

                Part filePart = req.raw().getPart("image");
                if (filePart == null) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Missing image file (field name: image)");
                }

                String contentType = filePart.getContentType();
                if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
                    res.status(400);
                    return r.put("success", false).put("msg", "File must be an image");
                }

                // Folder (sanitize)
                String folder = req.raw().getParameter("folder");
                if (folder == null || folder.trim().isEmpty()) {
                    folder = "misc";
                }
                folder = folder.trim().replaceAll("[^a-zA-Z0-9_-]", "");
                if (folder.isEmpty())
                    folder = "misc";

                // Extension (simple)
                String ext = ".jpg";
                String ct = contentType.toLowerCase();
                if (ct.contains("png"))
                    ext = ".png";
                else if (ct.contains("webp"))
                    ext = ".webp";
                else if (ct.contains("jpeg") || ct.contains("jpg"))
                    ext = ".jpg";

                // Save on disk: CarHubFiles/uploads/<folder>/...
                String relDir = "uploads/" + folder + "/";
                File dir = new File(FILES_BASE_DIR, relDir);
                if (!dir.exists())
                    dir.mkdirs();

                String filename = UUID.randomUUID().toString() + ext;
                String relPath = relDir + filename;
                File full = new File(FILES_BASE_DIR, relPath);

                try (InputStream inputStream = filePart.getInputStream();
                        OutputStream outputStream = new FileOutputStream(full)) {
                    IOUtils.copy(inputStream, outputStream);
                    outputStream.close();
                }

                String imageUrl = "/carhubfiles/" + relPath.replace('\\', '/');

                res.status(201);
                return r.put("success", true).put("image_url", imageUrl);

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        // List/search parts (active)
        get("/api/parts", (req, res) -> {
            String q = req.queryParams("q");
            if (q != null && !q.trim().isEmpty()) {
                return part.searchActive(q.trim());
            }
            return part.listActive();
        });

        // List active shops (public)
        get("/api/shops", (req, res) -> shop.listActive());

        // Part details
        get("/api/parts/:id", (req, res) -> {
            int id = Integer.parseInt(req.params(":id"));
            JSONArray rows = part.findById(id);
            if (rows == null || rows.length() == 0)
                return new JSONArray();
            if (rows.getJSONObject(0).optInt("is_active", 0) == 0)
                return new JSONArray();
            return rows;
        });
        // Part details + shop
        get("/api/parts/:id/details", (req, res) -> {
            int id = Integer.parseInt(req.params(":id"));
            JSONArray rows = part.findByIdFullDetails(id);
            JSONObject response = new JSONObject()
                    .put("data", new JSONArray()).put("images", new JSONArray()).put("reviews", new JSONArray());
            if (rows == null || rows.length() == 0)
                return new JSONArray();
            if (rows.getJSONObject(0).optInt("is_active", 0) != 1)
                return new JSONArray();
            JSONArray imagesPart = partImage.listByPart(id);
            JSONArray reviews = partReview.listByPart(id);
            response.put("data", rows);
            response.put("images", imagesPart);
            response.put("reviews", reviews);
            return response;
        });

        // Part images
        get("/api/parts/:id/images", (req, res) -> {
            int partId = Integer.parseInt(req.params(":id"));
            JSONArray rows = part.findById(partId);
            if (rows == null || rows.length() == 0)
                return new JSONArray();
            if (rows.getJSONObject(0).optInt("is_active", 0) != 1)
                return new JSONArray();

            return partImage.listByPart(partId);
        });

        // Part compatible cars
        get("/api/parts/:id/cars", (req, res) -> {
            int partId = Integer.parseInt(req.params(":id"));
            JSONArray rows = part.findById(partId);
            if (rows == null || rows.length() == 0)
                return new JSONArray();
            if (rows.getJSONObject(0).optInt("is_active", 0) != 1)
                return new JSONArray();

            return partCar.listCarsForPart(partId);
        });

        get("/api/parts/:id/similar", (req, res) -> {
            int partId = Integer.parseInt(req.params(":id"));
            int limit = 4;
            String limitParam = req.queryParams("limit");

            if (limitParam != null && !limitParam.trim().isEmpty()) {
                try {
                    limit = Math.max(1, Math.min(Integer.parseInt(limitParam.trim()), 12));
                } catch (NumberFormatException ignored) {
                    limit = 4;
                }
            }

            JSONArray rows = part.findById(partId);
            if (rows == null || rows.length() == 0)
                return new JSONArray();

            JSONObject currentPart = rows.getJSONObject(0);
            if (currentPart.optInt("is_active", 0) != 1)
                return new JSONArray();

            String categoryValue = currentPart.optString("category", "");
            String brandValue = currentPart.optString("brand", "");

            return part.listSimilarActive(partId, categoryValue, brandValue, limit);
        });

        // =========================================================
        // CLIENT (Orders + Help Requests + Reviews)
        // =========================================================

        // Create parts order
        post("/api/client/parts-orders", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = tokenFrom(req);
                if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                JSONObject body = bodyJson(req.body());

                int partId = body.getInt("part_id");
                int qty = body.getInt("quantity");
                if (qty <= 0) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Quantity must be > 0");
                }

                // --- REQUIRED checkout fields ---
                String contactPhone = body.optString("contact_phone", "").trim();
                String shipFname = body.optString("ship_first_name", "").trim();
                String shipLname = body.optString("ship_last_name", "").trim();
                String shipAddress = body.optString("ship_address", "").trim();

                if (contactPhone.isEmpty() || shipFname.isEmpty() || shipLname.isEmpty() || shipAddress.isEmpty()) {
                    res.status(400);
                    return r.put("success", false).put("msg",
                            "contact_phone, ship_first_name, ship_last_name, ship_address are required");
                }

                // --- OPTIONAL checkout fields ---
                String shipApartment = body.optString("ship_apartment", null);
                String shipState = body.optString("ship_neighborhood", null);
                String shipZip = body.optString("ship_zip_code", null);

                Integer shipCityId = null;
                if (body.has("ship_city_id") && !body.isNull("ship_city_id")) {
                    shipCityId = body.getInt("ship_city_id");
                } else if (body.has("ship_city") && !body.isNull("ship_city")) {
                    // if frontend accidentally sends city as number string
                    try {
                        shipCityId = Integer.parseInt(String.valueOf(body.get("ship_city")).trim());
                    } catch (Exception ignored) {
                        shipCityId = null;
                    }
                }

                // --- order_group_id (Solution 2) ---
                String groupId = body.optString("order_group_id", "").trim();
                if (groupId.isEmpty())
                    groupId = UUID.randomUUID().toString();

                // Ensure part exists + active
                JSONArray prow = part.findById(partId);
                if (prow == null || prow.length() == 0 || prow.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Part is not available");
                }

                JSONObject partObj = prow.getJSONObject(0);
                int realShopId = partObj.getInt("shop_id");

                // If client provided shop_id, it must match the part's shop_id
                if (body.has("shop_id") && body.getInt("shop_id") != realShopId) {
                    res.status(400);
                    return r.put("success", false).put("msg", "shop_id does not match part shop");
                }

                // Ensure shop is active
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(realShopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Shop is not available");
                }

                // Reserve stock NOW (atomic)
                if (!part.decrementQuantityIfAvailable(partId, qty)) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Not enough quantity available");
                }

                // IMPORTANT: create a fresh object per request (avoids shared-state bugs)
                PartsOrder po = new PartsOrder();
                po.setClient_id(auth.getUserId(token));
                po.setPart_id(partId);
                po.setShop_id(realShopId);
                po.setQuantity(qty);

                po.setContact_phone(contactPhone);
                po.setShip_first_name(shipFname);
                po.setShip_last_name(shipLname);
                po.setShip_address(shipAddress);
                po.setShip_apartment(shipApartment);
                po.setShip_city_id(shipCityId);
                po.setship_neighborhood(shipState);
                po.setShip_zip_code(shipZip);

                po.setOrder_group_id(groupId);

                if (po.create()) {
                    res.status(201);
                    return r.put("success", true).put("order_group_id", groupId);
                } else {
                    // rollback stock if insert fails
                    part.incrementQuantity(partId, qty);
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to create order");
                }

            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });
        // Client orders list
        get("/api/client/parts-orders", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }

            return partsOrder.listByClient(auth.getUserId(token));
        });
        // Client current orders list
        get("/api/client/parts-orders/current", (req, res) -> {
            String token = tokenFrom(req);
            if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            int clientId = auth.getUserId(token);
            return partsOrder.listCurrentGroupsByClient(clientId);
        });
        // Client completed orders history
        get("/api/client/parts-orders/history", (req, res) -> {
            String token = tokenFrom(req);
            if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            int clientId = auth.getUserId(token);
            return partsOrder.listHistoryGroupsByClient(clientId);
        });
        // Create help order
        post("/api/client/help-orders", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                JSONObject body = bodyJson(req.body());
                int shopId = body.getInt("shop_id");

                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Shop is not available");
                }

                int isHomeService = body.optInt("is_home_service", 0);
                if (isHomeService < 0 || isHomeService > 1) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Invalid is_home_service value");
                }

                helpOrder.setClient_id(auth.getUserId(token));
                helpOrder.setFname(body.getString("fname"));
                helpOrder.setLname(body.getString("lname"));
                helpOrder.setPhone(body.getString("phone"));
                helpOrder.setAddress(body.optString("address", ""));
                helpOrder.setDetails(body.getString("details"));
                helpOrder.setShop_id(shopId);
                helpOrder.setIs_home_service(isHomeService);

                if (helpOrder.create()) {
                    res.status(201);
                    r.put("success", true);
                    r.put("msg", "Help request created successfully");
                } else {
                    res.status(400);
                    r.put("success", false);
                    r.put("msg", "Failed to create help request");
                }
            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });
        // Client help orders list
        get("/api/client/help-orders", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }

            return helpOrder.listByClient(auth.getUserId(token));
        });

        // Add part review + recalc rate
        post("/api/client/parts/:id/reviews", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int partId = Integer.parseInt(req.params(":id"));

                JSONArray prow = part.findById(partId);
                if (prow == null || prow.length() == 0 || prow.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Part is not available");
                }

                JSONObject body = bodyJson(req.body());

                partReview.setPart_id(partId);
                partReview.setClient_id(auth.getUserId(token));
                partReview.setRating(body.getInt("rating"));
                partReview.setComment(body.optString("comment", null));

                if (partReview.saveOrUpdateReview()) {
                    // recalc rate
                    part.recalcRate(partId);
                    res.status(201);
                    r.put("success", true);
                } else {
                    res.status(500);
                    r.put("success", false);
                    r.put("msg", "Failed to add review");
                }

            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });

        get("/api/parts/:id/reviews", (req, res) -> {
            int partId = Integer.parseInt(req.params(":id"));
            JSONArray rows = part.findById(partId);
            if (rows == null || rows.length() == 0)
                return new JSONArray();
            if (rows.getJSONObject(0).optInt("is_active", 0) != 1)
                return new JSONArray();

            return partReview.listByPart(partId);
        });

        // Add shop review + recalc rate
        post("/api/client/shops/:id/reviews", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"client".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = Integer.parseInt(req.params(":id"));

                // Ensure shop is active
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Shop is not available");
                }

                JSONObject body = bodyJson(req.body());

                shopReview.setShop_id(shopId);
                shopReview.setClient_id(auth.getUserId(token));
                shopReview.setRating(body.getInt("rating"));

                shopReview.setComment(body.optString("comment", null));

                if (shopReview.saveOrUpdateReview()) {
                    // recalc rate
                    shopReview.recalcShopRate(shopId);
                    res.status(201);
                    r.put("success", true);
                } else {
                    res.status(400);
                    r.put("success", false);
                    r.put("msg", "Failed to add review");
                }

            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });

        get("/api/shops/:id/reviews", (req, res) -> {
            int shopId = Integer.parseInt(req.params(":id"));
            ShopAccount sa = new ShopAccount();
            JSONArray srows = sa.findById(shopId);
            if (srows == null || srows.length() == 0)
                return new JSONArray();
            if (srows.getJSONObject(0).optInt("is_active", 0) != 1)
                return new JSONArray();

            return shopReview.listByShop(shopId);
        });

        // =========================================================
        // SHOP Dashboard (Parts + Orders + Help Orders)
        // =========================================================
        put("/api/shop/me", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = tokenFrom(req);
                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);
                JSONArray existing = shop.findById(shopId);

                if (existing == null || existing.length() == 0) {
                    res.status(404);
                    return r.put("success", false).put("msg", "Shop not found");
                }

                JSONObject cur = existing.getJSONObject(0);
                JSONObject body = bodyJson(req.body());

                shop.setId(shopId);
                shop.setName(body.has("name") ? body.optString("name", cur.optString("name", ""))
                        : cur.optString("name", ""));
                shop.setPhone(body.has("phone") ? body.optString("phone", cur.optString("phone", ""))
                        : cur.optString("phone", ""));
                shop.setAddress(body.has("address") ? body.optString("address", cur.optString("address", ""))
                        : cur.optString("address", ""));
                shop.setPhoto_url(body.has("photo_url") ? body.optString("photo_url", cur.optString("photo_url", ""))
                        : cur.optString("photo_url", ""));
                shop.setdescription(
                        body.has("description") ? body.optString("description", cur.optString("description", ""))
                                : cur.optString("description", ""));
                shop.setServices(body.has("services") ? body.optString("services", cur.optString("services", ""))
                        : cur.optString("services", ""));

                if (body.has("city")) {
                    if (body.isNull("city"))
                        shop.setCity(null);
                    else
                        shop.setCity(body.getInt("city"));
                } else {
                    Object curCity = cur.opt("city");
                    if (curCity == null || curCity == JSONObject.NULL)
                        shop.setCity(null);
                    else
                        shop.setCity(cur.getInt("city"));
                }

                if (!shop.updateProfile()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to update shop profile");
                }

                JSONArray after = shop.findById(shopId);
                res.status(200);
                return r.put("success", true).put("shop", after.getJSONObject(0));
            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        // ---------------------------------------------------------
        // Shop: Cars (Supported car brands/models for this shop)
        // ---------------------------------------------------------

        // List my cars
        get("/api/shop/cars", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }

            int shopId = auth.getUserId(token);
            return car.listByShop(shopId);
        });

        // Add a car to my shop
        post("/api/shop/cars", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);
                JSONObject body = bodyJson(req.body());

                // Required
                String brand = body.optString("brand", "").trim();
                String modelStr = body.optString("model", "").trim();
                String details = body.optString("details", "").trim();

                if (brand.isEmpty() || modelStr.isEmpty() || details.isEmpty()) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "brand, model and details are required");
                }

                // Optional years
                Integer yearFrom = null;
                Integer yearTo = null;
                if (body.has("year_from") && !body.isNull("year_from")) {
                    yearFrom = body.getInt("year_from");
                }
                if (body.has("year_to") && !body.isNull("year_to")) {
                    yearTo = body.getInt("year_to");
                }

                car.setBrand(brand);
                car.setModel(modelStr);
                car.setDetails(details);
                car.setYear_from(yearFrom);
                car.setYear_to(yearTo);
                car.setShop_id(shopId);

                if (!car.add()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to add car");
                }

                res.status(201);
                return r.put("success", true);

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        // Update an existing car (must belong to this shop)
        put("/api/shop/cars/:id", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);
                int carId = Integer.parseInt(req.params(":id"));
                JSONObject body = bodyJson(req.body());

                // Required
                String brand = body.optString("brand", "").trim();
                String modelStr = body.optString("model", "").trim();
                String details = body.optString("details", "").trim();

                if (brand.isEmpty() || modelStr.isEmpty() || details.isEmpty()) {
                    res.status(400);
                    return r.put("success", false)
                            .put("msg", "brand, model and details are required");
                }

                // Optional years
                Integer yearFrom = null;
                Integer yearTo = null;
                if (body.has("year_from") && !body.isNull("year_from")) {
                    yearFrom = body.getInt("year_from");
                }
                if (body.has("year_to") && !body.isNull("year_to")) {
                    yearTo = body.getInt("year_to");
                }

                car.setId(carId);
                car.setBrand(brand);
                car.setModel(modelStr);
                car.setDetails(details);
                car.setYear_from(yearFrom);
                car.setYear_to(yearTo);
                car.setShop_id(shopId);

                if (!car.update()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to update car");
                }

                res.status(200);
                return r.put("success", true);

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        // Delete an existing car (must belong to this shop)
        delete("/api/shop/cars/:id", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");
                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);
                int carId = Integer.parseInt(req.params(":id"));

                car.setId(carId);
                car.setShop_id(shopId);

                if (!car.delete()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to delete car");
                }

                res.status(200);
                return r.put("success", true);

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        // Public: list cars of a given shop (useful for client view)
        // Get shop by id (public) - active shops only
        get("/api/shops/:id", (req, res) -> {
            int shopId = Integer.parseInt(req.params(":id"));

            ShopAccount sa = new ShopAccount();
            JSONArray rows = sa.findById(shopId);

            JSONObject response = new JSONObject();

            if (rows == null || rows.length() == 0) {
                res.status(404);
                return response.put("success", false).put("msg", "Shop not found");
            }

            JSONObject shopObj = rows.getJSONObject(0);

            int st = shopObj.optInt("is_active", 0);
            if (st != 1) {
                res.status(403);
                return response.put("success", false).put("msg", "Shop is not active");
            }

            String cityName = "";
            int cityId = shopObj.optInt("city", 0);
            if (cityId > 0) {
                JSONArray cityRow = city.findById(cityId);
                if (cityRow != null && cityRow.length() > 0) {
                    cityName = cityRow.getJSONObject(0).optString("name", "");
                }
            }

            JSONArray parts = part.listActiveByShop(shopId);
            JSONArray shopReviews = shopReview.listByShop(shopId);

            res.status(200);
            response.put("success", true);
            response.put("shopData", rows);
            response.put("shopParts", parts);
            response.put("shopCity", cityName);
            response.put("reviews", shopReviews);
            return response;
        });

        get("/api/shops/:id/cars", (req, res) -> {
            int shopId = Integer.parseInt(req.params(":id"));
            return car.listByShop(shopId);
        });

        // Shop: list my parts
        get("/api/shop/parts", (req, res) -> {
            String token = req.headers("token");
            if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            int shopId = auth.getUserId(token);

            // Ensure shop is still active
            ShopAccount sa = new ShopAccount();
            JSONArray srows = sa.findById(shopId);
            if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Shop account is not active");
            }

            return part.listByShop(shopId);
        });

        // Shop: add part
        post("/api/shop/parts", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");
                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);

                // Ensure shop is still active
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Shop account is not active");
                }

                JSONObject body = bodyJson(req.body());

                part.setName(body.getString("name"));
                part.setSlug(body.getString("slug"));
                part.setTags(body.optString("tags", null));
                part.setPrice(body.getDouble("price"));
                part.setBrand(body.optString("brand", null));
                part.setCategory(body.optString("category", null));
                part.setDetails(body.optString("details", null));
                part.setQuantity(body.getInt("quantity"));
                part.setShop_id(shopId);

                if (part.add()) {
                    res.status(201);
                    r.put("success", true);
                } else {
                    res.status(400);
                    r.put("success", false);
                    r.put("msg", "Failed to add part");
                }
            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });

        // Shop: update part
        put("/api/shop/parts/:id", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);

                // Ensure shop is still active
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Shop account is not active");
                }

                int partId = Integer.parseInt(req.params(":id"));
                JSONObject body = bodyJson(req.body());

                part.setId(partId);
                part.setShop_id(shopId);

                part.setName(body.getString("name"));
                part.setSlug(body.getString("slug"));
                part.setTags(body.optString("tags", null));
                part.setPrice(body.getDouble("price"));
                part.setBrand(body.optString("brand", null));
                part.setCategory(body.optString("category", null));
                part.setDetails(body.optString("details", null));
                part.setQuantity(body.getInt("quantity"));
                part.setIs_active(body.optInt("is_active", 1));

                if (part.update()) {
                    res.status(200);
                    r.put("success", true);
                } else {
                    res.status(400);
                    r.put("success", false);
                    r.put("msg", "Failed to update part");
                }
            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });

        // Shop: add image to part
        post("/api/shop/parts/:id/images", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                // Auth (shop)
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }
                int shopId = auth.getUserId(token);

                // Ensure shop is still active
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Shop account is not active");
                }

                int partId = Integer.parseInt(req.params(":id"));

                // Ensure part exists, is active, and belongs to this shop
                JSONArray prow = part.findById(partId);
                if (prow == null || prow.length() == 0 || prow.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(404);
                    return r.put("success", false).put("msg", "Part not found");
                }
                if (prow.getJSONObject(0).getInt("shop_id") != shopId) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                // Enable multipart (FormData)
                req.attribute("org.eclipse.jetty.multipartConfig",
                        new MultipartConfigElement(System.getProperty("java.io.tmpdir")));

                Part filePart = req.raw().getPart("image");
                if (filePart == null) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Missing image file (field name: image)");
                }

                String contentType = filePart.getContentType();
                if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
                    res.status(400);
                    return r.put("success", false).put("msg", "File must be an image");
                }

                // Extension (simple)
                String ext = ".jpg";
                String ct = contentType.toLowerCase();
                if (ct.contains("png"))
                    ext = ".png";
                else if (ct.contains("webp"))
                    ext = ".webp";
                else if (ct.contains("jpeg") || ct.contains("jpg"))
                    ext = ".jpg";

                // Save on disk
                String folder = "parts/" + partId + "/";

                File dir = new File(FILES_BASE_DIR, folder);
                if (!dir.exists())
                    dir.mkdirs();

                String filename = UUID.randomUUID().toString() + ext;
                String filePath = folder + filename;
                File fullFile = new File(FILES_BASE_DIR, filePath);

                try (InputStream inputStream = filePart.getInputStream();
                        OutputStream outputStream = new FileOutputStream(fullFile)) {
                    IOUtils.copy(inputStream, outputStream);
                    outputStream.close();
                }

                // ADD to DB
                int isDefault = 0;
                int sortOrder = 0;
                try {
                    isDefault = Integer.parseInt(req.raw().getParameter("is_default"));
                } catch (Exception ignored) {
                }
                try {
                    sortOrder = Integer.parseInt(req.raw().getParameter("sort_order"));
                } catch (Exception ignored) {
                }

                // Save path in DB
                String dbPath = "/carhubfiles/" + filePath;

                PartImage pi = new PartImage();
                pi.setPart_id(partId);
                pi.setImage_url(dbPath);
                pi.setIs_default(isDefault);
                pi.setSort_order(sortOrder);

                if (pi.add()) {
                    res.status(201);
                    return r.put("success", true).put("image_url", dbPath);
                } else {
                    fullFile.delete();
                    res.status(400);
                    return r.put("success", false).put("msg", "Failed to add image");
                }

            } catch (Exception ex) {
                res.status(400);
                return r.put("success", false).put("error", ex.getMessage());
            }
        });

        // Shop: list orders
        get("/api/shop/parts-orders", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            int shopId = auth.getUserId(token);

            ShopAccount sa = new ShopAccount();
            JSONArray srows = sa.findById(shopId);
            if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Shop account is not active");
            }

            return partsOrder.listByShop(shopId);
        });

        // Shop: update order status
        patch("/api/shop/parts-orders/:id/status", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = tokenFrom(req);
                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);

                // Block old tokens after deactivation
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Shop account is not active");
                }

                int orderId = Integer.parseInt(req.params(":id"));
                JSONObject body = bodyJson(req.body());
                int newStatus = body.getInt("status");

                if (newStatus < 0 || newStatus > 3) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Invalid status");
                }

                // Load order
                PartsOrder po = new PartsOrder();
                JSONArray orows = po.findById(orderId);
                if (orows == null || orows.length() == 0) {
                    res.status(404);
                    return r.put("success", false).put("msg", "Order not found");
                }

                JSONObject o = orows.getJSONObject(0);
                if (o.optInt("shop_id", -1) != shopId) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int oldStatus = o.optInt("status", 0);
                if (newStatus == oldStatus) {
                    res.status(200);
                    return r.put("success", true);
                }

                // Allowed transitions:
                // Pending(0) -> Accepted(1) OR Rejected(2)
                // Accepted(1) -> Completed(3) OR Rejected(2)
                boolean allowed = (oldStatus == 0 && (newStatus == 1 || newStatus == 2)) ||
                        (oldStatus == 1 && (newStatus == 3 || newStatus == 2));

                if (!allowed) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Invalid status transition");
                }

                int partId = o.getInt("part_id");
                int qty = o.optInt("quantity", 1);

                // Pending -> Accepted (NO stock change)
                if (oldStatus == 0 && newStatus == 1) {
                    PartsOrder upd = new PartsOrder();
                    upd.setId(orderId);
                    upd.setShop_id(shopId);
                    upd.setStatus(1);

                    if (upd.updateStatusFrom(0)) {
                        res.status(200);
                        return r.put("success", true);
                    } else {
                        res.status(409);
                        return r.put("success", false).put("msg", "Order status changed. Please refresh.");
                    }
                }

                // Pending -> Rejected (RESTOCK)
                if (oldStatus == 0 && newStatus == 2) {
                    PartsOrder upd = new PartsOrder();
                    upd.setId(orderId);
                    upd.setShop_id(shopId);
                    upd.setStatus(2);

                    if (upd.updateStatusFrom(0)) {
                        boolean restocked = false;
                        if (qty > 0)
                            restocked = part.incrementQuantity(partId, qty);
                        res.status(200);
                        return r.put("success", true).put("restocked", restocked);
                    } else {
                        res.status(409);
                        return r.put("success", false).put("msg", "Order status changed. Please refresh.");
                    }
                }

                // Accepted -> Rejected (RESTOCK)
                if (oldStatus == 1 && newStatus == 2) {
                    PartsOrder upd = new PartsOrder();
                    upd.setId(orderId);
                    upd.setShop_id(shopId);
                    upd.setStatus(2);

                    if (upd.updateStatusFrom(1)) {
                        boolean restocked = false;
                        if (qty > 0)
                            restocked = part.incrementQuantity(partId, qty);
                        res.status(200);
                        return r.put("success", true).put("restocked", restocked);
                    } else {
                        res.status(409);
                        return r.put("success", false).put("msg", "Order status changed. Please refresh.");
                    }
                }

                // Accepted -> Completed (NO stock change)
                PartsOrder upd = new PartsOrder();
                upd.setId(orderId);
                upd.setShop_id(shopId);
                upd.setStatus(newStatus);

                if (upd.updateStatusFrom(oldStatus)) {
                    res.status(200);
                    return r.put("success", true);
                } else {
                    res.status(409);
                    return r.put("success", false).put("msg", "Order status changed. Please refresh.");
                }

            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });
        // Shop: list help orders
        get("/api/shop/help-orders", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            int shopId = auth.getUserId(token);

            ShopAccount sa = new ShopAccount();
            JSONArray srows = sa.findById(shopId);
            if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Shop account is not active");
            }

            return helpOrder.listByShop(shopId);
        });

        // Shop: update help order status
        patch("/api/shop/help-orders/:id/status", (req, res) -> {
            JSONObject r = new JSONObject();
            try {
                String token = req.headers("token");

                if (!auth.verifyToken(token) || !"shop".equals(auth.getRole(token))) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int shopId = auth.getUserId(token);

                // Block old tokens after deactivation
                ShopAccount sa = new ShopAccount();
                JSONArray srows = sa.findById(shopId);
                if (srows == null || srows.length() == 0 || srows.getJSONObject(0).optInt("is_active", 0) != 1) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Shop account is not active");
                }

                int orderId = Integer.parseInt(req.params(":id"));
                JSONObject body = bodyJson(req.body());
                int newStatus = body.getInt("status");

                if (newStatus < 0 || newStatus > 3) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Invalid status");
                }

                HelpOrder ho = new HelpOrder();
                JSONArray orows = ho.findById(orderId);
                if (orows == null || orows.length() == 0) {
                    res.status(404);
                    return r.put("success", false).put("msg", "Order not found");
                }

                JSONObject o = orows.getJSONObject(0);
                if (o.optInt("shop_id", -1) != shopId) {
                    res.status(403);
                    return r.put("success", false).put("msg", "Access denied");
                }

                int oldStatus = o.optInt("status", 0);
                if (newStatus == oldStatus) {
                    res.status(200);
                    return r.put("success", true);
                }

                // Allowed transitions:
                // Pending(0) -> Accepted(1) OR Rejected(2)
                // Accepted(1) -> Completed(3) OR Rejected(2)
                boolean allowed = (oldStatus == 0 && (newStatus == 1 || newStatus == 2)) ||
                        (oldStatus == 1 && (newStatus == 3 || newStatus == 2));

                if (!allowed) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Invalid status transition");
                }

                HelpOrder upd = new HelpOrder();
                upd.setId(orderId);
                upd.setShop_id(shopId);
                upd.setStatus(newStatus);

                if (upd.updateStatusFrom(oldStatus)) {
                    res.status(200);
                    return r.put("success", true);
                } else {
                    res.status(409);
                    return r.put("success", false).put("msg", "Order status changed. Please refresh.");
                }

            } catch (Exception ex) {
                res.status(400);
                r.put("success", false);
                r.put("error", ex.getMessage());
            }
            return r;
        });

        // =========================================================
        // ADMIN (Approve shops)
        // =========================================================

        get("/api/admin/shops/pending", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"admin".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            return admin.getPendingShops();
        });
        // Admin: list all shops (active + pending + deactivated)
        get("/api/admin/shops", (req, res) -> {
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"admin".equals(auth.getRole(token))) {
                res.status(403);
                return new JSONObject().put("success", false).put("msg", "Access denied");
            }
            return new ShopAccount().listAll();
        });

        // Admin: soft delete shop (set is_active=2) + deactivate all its parts
        delete("/api/admin/shops/:id", (req, res) -> {
            JSONObject r = new JSONObject();
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"admin".equals(auth.getRole(token))) {
                res.status(403);
                return r.put("success", false).put("msg", "Access denied");
            }

            int shopId = Integer.parseInt(req.params(":id"));

            boolean okShop = admin.deleteShop(shopId);
            boolean okParts = part.setActiveByShop(shopId, 0);

            if (okShop) {
                res.status(200);
                return r.put("success", true).put("parts_deactivated", okParts);
            }

            res.status(400);
            return r.put("success", false).put("msg", "Failed to delete shop");
        });

        post("/api/admin/shops/:id/approve", (req, res) -> {
            JSONObject r = new JSONObject();
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"admin".equals(auth.getRole(token))) {
                res.status(403);
                return r.put("success", false).put("msg", "Access denied");
            }

            int shopId = Integer.parseInt(req.params(":id"));
            if (admin.approveShop(shopId)) {
                res.status(200);
                r.put("success", true);
            } else {
                res.status(400);
                r.put("success", false);
                r.put("msg", "Failed to approve shop");
            }
            return r;
        });

        post("/api/admin/shops/:id/deactivate", (req, res) -> {
            JSONObject r = new JSONObject();
            String token = req.headers("token");

            if (!auth.verifyToken(token) || !"admin".equals(auth.getRole(token))) {
                res.status(403);
                return r.put("success", false).put("msg", "Access denied");
            }

            int shopId = Integer.parseInt(req.params(":id"));

            boolean okShop = admin.deactivateShop(shopId); // now sets is_active=2
            boolean okParts = part.setActiveByShop(shopId, 0);

            if (okShop) {
                res.status(200);
                r.put("success", true);
                r.put("parts_deactivated", okParts);
            } else {
                res.status(400);
                r.put("success", false);
                r.put("msg", "Failed to deactivate shop");
            }
            return r;
        });
        // AI model
        post("/api/ai/predict-service", (req, res) -> {
            res.type("application/json");

            JSONObject r = new JSONObject();
            try {
                JSONObject body = bodyJson(req.body());
                String text = body.optString("text", body.optString("complaint", "")).trim();

                if (text.isEmpty()) {
                    res.status(400);
                    return r.put("success", false).put("msg", "Text is required").toString();
                }

                JSONObject flaskResponse = callAiService(text);

                return r
                        .put("success", true)
                        .put("msg", "Prediction success")
                        .put("result", flaskResponse)
                        .toString();

            } catch (Exception e) {
                res.status(502);
                return r.put("success", false)
                        .put("msg", "AI prediction failed")
                        .put("error", e.getMessage())
                        .toString();
            }
        });
    }
}
