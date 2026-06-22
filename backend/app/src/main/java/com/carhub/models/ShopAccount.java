package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class ShopAccount {

    // ---- Fields (exactly as shops_accounts table) ----
    private int id;
    private String name;
    private String email;
    private String password;
    private String phone;
    private String address;
    private String photo_url;
    private int is_active; // 0=pending, 1=active, 2=deactivated
    private String description; // varchar(200)
    private Integer city; // nullable
    private int rate; // tinyint unsigned (or int)
    private int rate_count; // number of ratings
    private String services; // services column

    private final ODB odb = new ODB();

    // ---- Getters/Setters ----
    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getServices() {
        return services;
    }

    public void setServices(String services) {
        this.services = services;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhoto_url() {
        return photo_url;
    }

    public void setPhoto_url(String photo_url) {
        this.photo_url = photo_url;
    }

    public int getIs_active() {
        return is_active;
    }

    public void setIs_active(int is_active) {
        this.is_active = is_active;
    }

    // Keep your original method names for compatibility
    public String getdescription() {
        return description;
    }

    public void setdescription(String description) {
        this.description = description;
    }

    public Integer getCity() {
        return city;
    }

    public void setCity(Integer city) {
        this.city = city;
    }

    public int getRate() {
        return rate;
    }

    public void setRate(int rate) {
        this.rate = rate;
    }

    public int getRate_count() {
        return rate_count;
    }

    public void setRate_count(int rate_count) {
        this.rate_count = rate_count;
    }

    // -------------------------------------------------------
    // Functions
    // -------------------------------------------------------

    /** Shop Login (only active shops allowed) */
    public JSONArray login() {
        String sql = "SELECT id, name, email, services, phone, address, photo_url, is_active, description, city, rate, rate_count, password, created_at, updated_at "
                +
                "FROM shops_accounts WHERE email=? AND is_active=1 LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getEmail());
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray findByIdWithPassword(int id) {
        String sql = "SELECT id, name, email, phone, services, address, photo_url, is_active, description, city, rate, rate_count, password, created_at, updated_at "
                +
                "FROM shops_accounts WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Register Shop (pending by default: is_active=0) */
    public boolean register() {
        String sql = "INSERT INTO shops_accounts (name, email, password, phone, address, photo_url, is_active, description, city, rate, services) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
            stmt.setString(2, getEmail());
            stmt.setString(3, getPassword());
            stmt.setString(4, getPhone());
            stmt.setString(5, getAddress());
            stmt.setString(6, getPhoto_url());
            stmt.setString(7, getdescription());

            if (getCity() == null)
                stmt.setNull(8, java.sql.Types.INTEGER);
            else
                stmt.setInt(8, getCity());

            stmt.setString(9, getServices());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Update shop profile */
    public boolean updateProfile() {
        String sql = "UPDATE shops_accounts SET name=?, phone=?, address=?, photo_url=?, description=?, city=?, services=? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
            stmt.setString(2, getPhone());
            stmt.setString(3, getAddress());
            stmt.setString(4, getPhoto_url());
            stmt.setString(5, getdescription());

            if (getCity() == null)
                stmt.setNull(6, java.sql.Types.INTEGER);
            else
                stmt.setInt(6, getCity());

            // FIXED ORDER:
            stmt.setString(7, getServices());
            stmt.setInt(8, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Update password */
    public boolean updatePassword() {
        String sql = "UPDATE shops_accounts SET password=? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getPassword());
            stmt.setInt(2, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Deactivate shop (admin can call it too): is_active=2 */
    public boolean deactivate() {
        String sql = "UPDATE shops_accounts SET is_active=2 WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** List active shops (public) */
    public JSONArray listActive() {
        String sql = "SELECT id, name, phone, address, photo_url, services, is_active, description, city, rate, rate_count, created_at, updated_at "
                +
                "FROM shops_accounts WHERE is_active=1 ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    /**
     * Find by Email regardless of is_active (used to return clear login
     * message)
     */
    public JSONArray findByEmailAnyStatus() {
        String sql = "SELECT id, name, email, services, phone, address, photo_url, is_active, description, city, rate, rate_count, password, created_at, updated_at "
                +
                "FROM shops_accounts WHERE email=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getEmail());
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** List all shops (admin) */
    public JSONArray listAll() {
        String sql = "SELECT id, name, email, phone, services, address, photo_url, is_active, description, city, rate, rate_count, created_at, updated_at "
                +
                "FROM shops_accounts ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    /** List pending shops (for admin approval): is_active=0 */
    public JSONArray listPending() {
        String sql = "SELECT id, name, email, services, phone, address, photo_url, is_active, description, city, rate, rate_count, created_at "
                +
                "FROM shops_accounts WHERE is_active=0 ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    /** Find shop by id */
    public JSONArray findById(int id) {
        String sql = "SELECT id, name, email, phone, services, address, photo_url, is_active, description, city, rate, rate_count, created_at, updated_at "
                +
                "FROM shops_accounts WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Admin: approve shop: is_active=1 */
    public boolean approve(int shopId) {
        String sql = "UPDATE shops_accounts SET is_active=1 WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }
}
