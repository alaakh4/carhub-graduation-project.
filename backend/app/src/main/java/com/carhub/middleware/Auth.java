package com.carhub.middleware;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import org.mindrot.jbcrypt.BCrypt;

public class Auth {

    private static final String SECRET = "CARHUB_SECRET_CHANGE_ME";
    private static final SecureRandom RANDOM = new SecureRandom();

    // =========================
    // AUTH TOKENS
    // =========================
    public String createToken(String role, int userId) {
        long exp = System.currentTimeMillis() + (1000L * 60 * 60 * 24); // 24h
        String payload = role + "|" + userId + "|" + exp;
        String sig = hmac(payload);
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString((payload + "|" + sig).getBytes(StandardCharsets.UTF_8));
    }

    public boolean verifyToken(String token) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length != 4)
                return false;

            String role = parts[0];
            String userId = parts[1];
            long exp = Long.parseLong(parts[2]);
            String sig = parts[3];

            if (System.currentTimeMillis() > exp)
                return false;

            String payload = role + "|" + userId + "|" + exp;
            return hmac(payload).equals(sig);
        } catch (Exception e) {
            return false;
        }
    }

    public String getRole(String token) {
        String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
        return decoded.split("\\|")[0];
    }

    public int getUserId(String token) {
        String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
        return Integer.parseInt(decoded.split("\\|")[1]);
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] sig = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // =========================
    // PASSWORD HASHING
    // =========================
    public String hashPassword(String rawPassword) {
        try {
            byte[] salt = new byte[16];
            RANDOM.nextBytes(salt);

            int iterations = 65536;
            int keyLength = 256;

            PBEKeySpec spec = new PBEKeySpec(rawPassword.toCharArray(), salt, iterations, keyLength);
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] hash = skf.generateSecret(spec).getEncoded();

            return iterations + ":" +
                    Base64.getEncoder().encodeToString(salt) + ":" +
                    Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

public boolean verifyPassword(String rawPassword, String storedHash) {
    if (rawPassword == null || storedHash == null || storedHash.isBlank()) {
        return false;
    }

    try {
        // Existing accounts use BCrypt.
        if (storedHash.startsWith("$2a$")) {
            return BCrypt.checkpw(rawPassword, storedHash);
        }

        // New accounts use PBKDF2.
        String[] parts = storedHash.split(":");
        if (parts.length != 3) {
            return false;
        }

        int iterations = Integer.parseInt(parts[0]);
        byte[] salt = Base64.getDecoder().decode(parts[1]);
        byte[] expectedHash = Base64.getDecoder().decode(parts[2]);

        PBEKeySpec spec = new PBEKeySpec(
                rawPassword.toCharArray(),
                salt,
                iterations,
                expectedHash.length * 8
        );

        SecretKeyFactory factory =
                SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");

        byte[] actualHash = factory.generateSecret(spec).getEncoded();

        if (actualHash.length != expectedHash.length) {
            return false;
        }

        int difference = 0;
        for (int i = 0; i < actualHash.length; i++) {
            difference |= actualHash[i] ^ expectedHash[i];
        }

        return difference == 0;
    } catch (Exception e) {
        return false;
    }
}
    // =========================
    // RESET TOKEN
    // =========================
    public String createResetToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}