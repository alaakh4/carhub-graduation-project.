package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class City {
    private int id;
    private String name;

    private final ODB odb = new ODB();

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public JSONArray listAll() {
        String sql = "SELECT id, name FROM cities ORDER BY name ASC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    public JSONArray findById(int id) {
        String sql = "SELECT id, name FROM cities WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    // Optional (if you want admin to manage cities)
    public boolean add() {
        String sql = "INSERT INTO cities (name) VALUES (?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }
}
