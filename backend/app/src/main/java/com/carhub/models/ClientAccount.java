package com.carhub.models; // change if needed

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;

public class ClientAccount {

    // Fields
    private int id;
    private String email;
    private String password;
    private String phone;
    private String address;
    private String car_type;
    private String avatar_url;
    private Integer city; // can be null
    private int is_active = 1; // default active
    private String fname;
    private String lname;

    private ODB odb = new ODB();

    // Constructor
    public ClientAccount() {
    }

    // Properties (Getters/Setters)
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

    public String getCar_type() {
        return car_type;
    }

    public void setCar_type(String car_type) {
        this.car_type = car_type;
    }

    public String getAvatar_url() {
        return avatar_url;
    }

    public void setAvatar_url(String avatar_url) {
        this.avatar_url = avatar_url;
    }

    public Integer getCity() {
        return city;
    }

    public void setCity(Integer city) {
        this.city = city;
    }

    public int getIs_active() {
        return is_active;
    }

    public void setIs_active(int is_active) {
        this.is_active = is_active;
    }

    public String getFname() {
        return fname;
    }

    public void setFname(String fname) {
        this.fname = fname;
    }

    public String getLname() {
        return lname;
    }

    public void setLname(String lname) {
        this.lname = lname;
    }

    // -------------------------------------------------------
    // Functions (same style as Article.java)
    // -------------------------------------------------------

    /** Find active client by email only */
    public JSONArray login() {
        String sql = "SELECT id, email, password, phone, address, car_type, avatar_url, city, is_active, fname, lname, created_at, updated_at "
                +
                "FROM clients_accounts WHERE email=? AND is_active=1 LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getEmail());
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Register (Insert). id is AUTO_INCREMENT */
    public boolean register() {
        String sql = "INSERT INTO clients_accounts (email, password, phone, address, car_type, avatar_url, city, is_active, fname, lname) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getEmail());
            stmt.setString(2, getPassword()); // later we can hash
            stmt.setString(3, getPhone());
            stmt.setString(4, getAddress());
            stmt.setString(5, getCar_type());
            stmt.setString(6, getAvatar_url());

            if (getCity() == null)
                stmt.setNull(7, Types.INTEGER);
            else
                stmt.setInt(7, getCity());

            stmt.setString(8, getFname());
            stmt.setString(9, getLname());

        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Update profile */
    public boolean updateProfile() {
        String sql = "UPDATE clients_accounts SET phone=?, address=?, car_type=?, avatar_url=?, city=?, fname=?, lname=? "
                +
                "WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getPhone());
            stmt.setString(2, getAddress());
            stmt.setString(3, getCar_type());
            stmt.setString(4, getAvatar_url());

            if (getCity() == null)
                stmt.setNull(5, Types.INTEGER);
            else
                stmt.setInt(5, getCity());

            stmt.setString(6, getFname());
            stmt.setString(7, getLname());
            stmt.setInt(8, getId());

        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Admin/Client: Deactivate account */
    public boolean deactivate() {
        String sql = "UPDATE clients_accounts SET is_active=0 WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /** Admin: list all clients */
    public JSONArray listAll() {
        String sql = "SELECT id, email, phone, address, car_type, avatar_url, city, is_active, fname, lname, created_at, updated_at "
                +
                "FROM clients_accounts ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    /** Find client by id */
    public JSONArray findById(int id) {
        String sql = "SELECT id, email, phone, address, car_type, avatar_url, city, is_active, fname, lname, created_at, updated_at "
                +
                "FROM clients_accounts WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Find client by email (for register validation) */
    public JSONArray findByEmail(String email) {
        String sql = "SELECT id, email, phone, address, car_type, avatar_url, city, is_active, fname, lname, created_at, updated_at "
                +
                "FROM clients_accounts WHERE email=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, email);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** True if an email is already used */
    public boolean emailExists(String email) {
        JSONArray rows = findByEmail(email);
        return rows != null && rows.length() > 0;
    }

    public JSONArray findByEmailWithPassword(String email) {
        String sql = "SELECT id, email, password, phone, address, car_type, avatar_url, city, is_active, fname, lname, created_at, updated_at "
                +
                "FROM clients_accounts WHERE email=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, email);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Find client by id including password */
    public JSONArray findByIdWithPassword(int id) {
        String sql = "SELECT id, email, password, phone, address, car_type, avatar_url, city, is_active, fname, lname, created_at, updated_at "
                +
                "FROM clients_accounts WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    /** Update password */
    public boolean updatePassword() {
        String sql = "UPDATE clients_accounts SET password=? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getPassword());
            stmt.setInt(2, getId());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }
}
