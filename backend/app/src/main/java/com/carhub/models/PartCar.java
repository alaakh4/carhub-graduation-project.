package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class PartCar {
    private int id;
    private int part_id;
    private int car_id;

    private final ODB odb = new ODB();

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getPart_id() { return part_id; }
    public void setPart_id(int part_id) { this.part_id = part_id; }

    public int getCar_id() { return car_id; }
    public void setCar_id(int car_id) { this.car_id = car_id; }

    public boolean add() {
        String sql = "INSERT INTO part_car (part_id, car_id) VALUES (?, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getPart_id());
            stmt.setInt(2, getCar_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean delete() {
        String sql = "DELETE FROM part_car WHERE part_id=? AND car_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getPart_id());
            stmt.setInt(2, getCar_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // Useful for client: show cars compatible with part
    public JSONArray listCarsForPart(int partId) {
        String sql =
            "SELECT c.* FROM cars c " +
            "INNER JOIN part_car pc ON pc.car_id=c.id " +
            "WHERE pc.part_id=? ORDER BY c.brand, c.model";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, partId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    // Useful for client: show parts compatible with selected car
    public JSONArray listPartsForCar(int carId) {
        String sql =
            "SELECT p.* FROM parts p " +
            "INNER JOIN part_car pc ON pc.part_id=p.id " +
            "WHERE pc.car_id=? AND p.is_active=1 ORDER BY p.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, carId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }
}
