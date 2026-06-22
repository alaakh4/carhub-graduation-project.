package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class Car {
    private int id;
    private String brand;
    private String model;
    private Integer year_from;  // nullable
    private Integer year_to;    // nullable
    private String details;
    private int shop_id;

    private final ODB odb = new ODB();

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getYear_from() { return year_from; }
    public void setYear_from(Integer year_from) { this.year_from = year_from; }

    public Integer getYear_to() { return year_to; }
    public void setYear_to(Integer year_to) { this.year_to = year_to; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public int getShop_id() { return shop_id; }
    public void setShop_id(int shop_id) { this.shop_id = shop_id; }

    public boolean add() {
        String sql =
            "INSERT INTO cars (brand, model, year_from, year_to, details, shop_id) " +
            "VALUES (?, ?, ?, ?, ?, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getBrand());
            stmt.setString(2, getModel());

            if (getYear_from() == null) stmt.setNull(3, java.sql.Types.INTEGER);
            else stmt.setInt(3, getYear_from());

            if (getYear_to() == null) stmt.setNull(4, java.sql.Types.INTEGER);
            else stmt.setInt(4, getYear_to());

            stmt.setString(5, getDetails());
            stmt.setInt(6, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean update() {
        String sql =
            "UPDATE cars SET brand=?, model=?, year_from=?, year_to=?, details=? WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getBrand());
            stmt.setString(2, getModel());

            if (getYear_from() == null) stmt.setNull(3, java.sql.Types.INTEGER);
            else stmt.setInt(3, getYear_from());

            if (getYear_to() == null) stmt.setNull(4, java.sql.Types.INTEGER);
            else stmt.setInt(4, getYear_to());

            stmt.setString(5, getDetails());
            stmt.setInt(6, getId());
            stmt.setInt(7, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean delete() {
        String sql = "DELETE FROM cars WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
            stmt.setInt(2, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public JSONArray listByShop(int shopId) {
        String sql =
            "SELECT id, brand, model, year_from, year_to, details, shop_id, created_at, updated_at " +
            "FROM cars WHERE shop_id=? ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray findById(int id) {
        String sql =
            "SELECT id, brand, model, year_from, year_to, details, shop_id, created_at, updated_at " +
            "FROM cars WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }
}
