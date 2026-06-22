package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class HelpOrder {

    // status suggestion:
    // 0 = Pending, 1 = InProgress, 2 = Done, 3 = Cancelled
    private int id;
    private int client_id;
    private String fname;
    private String lname;
    private String phone;
    private String address;
    private String details;
    private int shop_id;
    private int status;
    private int is_home_service;

    private final ODB odb = new ODB();

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getClient_id() {
        return client_id;
    }

    public void setClient_id(int client_id) {
        this.client_id = client_id;
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

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public int getShop_id() {
        return shop_id;
    }

    public void setShop_id(int shop_id) {
        this.shop_id = shop_id;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public int getIs_home_service() {
        return is_home_service;
    }

    public void setIs_home_service(int is_home_service) {
        this.is_home_service = is_home_service;
    }

    public boolean create() {
        String sql = "INSERT INTO help_orders (client_id, fname, lname, phone, address, details, is_home_service, shop_id, status) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getClient_id());
            stmt.setString(2, getFname());
            stmt.setString(3, getLname());
            stmt.setString(4, getPhone());
            stmt.setString(5, getAddress());
            stmt.setString(6, getDetails());
            stmt.setInt(7, getIs_home_service());
            stmt.setInt(8, getShop_id());
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean updateStatus() {
        String sql = "UPDATE help_orders SET status=? WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getStatus());
            stmt.setInt(2, getId());
            stmt.setInt(3, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean updateStatusFrom(int oldStatus) {
        String sql = "UPDATE help_orders SET status=? WHERE id=? AND shop_id=? AND status=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getStatus());
            stmt.setInt(2, getId());
            stmt.setInt(3, getShop_id());
            stmt.setInt(4, oldStatus);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public JSONArray listByClient(int clientId) {
        String sql = "SELECT * FROM help_orders WHERE client_id=? ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, clientId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray listByShop(int shopId) {
        String sql = "SELECT * FROM help_orders WHERE shop_id=? ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray findById(int id) {
        String sql = "SELECT * FROM help_orders WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }
}