package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class AdminAccount {

    // ---- Fields (exactly as admins_accounts table) ----
    private int id;
    private String name;
    private String email;
    private String password;

    private final ODB odb = new ODB();

    // ---- Getters/Setters ----
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    // -------------------------------------------------------
    // Functions
    // -------------------------------------------------------

    /** Admin Login (returns admin data without password) */
    public JSONArray login() {
        String sql =
            "SELECT id, name, email, created_at, updated_at " +
            "FROM admins_accounts WHERE email=? AND password=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getEmail());
            stmt.setString(2, getPassword());
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Create admin (optional: only if you want admin registration) */
    public boolean create() {
        String sql = "INSERT INTO admins_accounts (name, email, password) VALUES (?, ?, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
            stmt.setString(2, getEmail());
            stmt.setString(3, getPassword());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** List admins */
    public JSONArray listAll() {
        String sql = "SELECT id, name, email, created_at, updated_at FROM admins_accounts ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    /** Find admin by id */
    public JSONArray findById(int id) {
        String sql = "SELECT id, name, email, created_at, updated_at FROM admins_accounts WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Update admin profile (name/email) */
    public boolean updateProfile() {
        String sql = "UPDATE admins_accounts SET name=?, email=? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
            stmt.setString(2, getEmail());
            stmt.setInt(3, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Update admin password */
    public boolean updatePassword() {
        String sql = "UPDATE admins_accounts SET password=? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getPassword());
            stmt.setInt(2, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // -------------------------------------------------------
    // Admin actions (shops approval)
    // -------------------------------------------------------

    /** Admin: list pending shops (is_active=0) */
    public JSONArray getPendingShops() {
        String sql =
            "SELECT id, name, email, phone, address, photo_url, is_active, our_cars, city, rate, created_at " +
            "FROM shops_accounts WHERE is_active=0 ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    /** Admin: approve shop (set is_active=1) */
    public boolean approveShop(int shopId) {
        String sql = "UPDATE shops_accounts SET is_active=1 WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Admin: deactivate shop */
    public boolean deactivateShop(int shopId) {
        String sql = "UPDATE shops_accounts SET is_active=2 WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Soft delete shop (is_active=2) */
    public boolean deleteShop(int shopId) {
        String sql = "UPDATE shops_accounts SET is_active=2 WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

}
