package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;

public class PasswordReset {

    private int id;
    private String email;
    private String account_type; // client | shop
    private String token;
    private Timestamp expires_at;
    private int used;

    private final ODB odb = new ODB();

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    } 

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAccount_type() {
        return account_type;
    }

    public void setAccount_type(String account_type) {
        this.account_type = account_type;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Timestamp getExpires_at() {
        return expires_at;
    }

    public void setExpires_at(Timestamp expires_at) {
        this.expires_at = expires_at;
    }

    public int getUsed() {
        return used;
    }

    public void setUsed(int used) {
        this.used = used;
    }

    public boolean create() {
        String sql = "INSERT INTO password_resets (email, account_type, token, expires_at, used) " +
                     "VALUES (?, ?, ?, ?, 0)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getEmail());
            stmt.setString(2, getAccount_type());
            stmt.setString(3, getToken());
            stmt.setTimestamp(4, getExpires_at());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean markAllUnusedAsUsedByEmail(String email, String accountType) {
        String sql = "UPDATE password_resets SET used=1 " +
                     "WHERE email=? AND account_type=? AND used=0";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, email);
            stmt.setString(2, accountType);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) >= 0;
    }

    public JSONArray findValidByToken(String token) {
        String sql = "SELECT * FROM password_resets WHERE token=? AND used=0 ORDER BY id DESC LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, token);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public boolean markUsedByToken(String token) {
        String sql = "UPDATE password_resets SET used=1 WHERE token=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, token);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }
}