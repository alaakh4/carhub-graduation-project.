package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class PartReview {
    private int id;
    private int part_id;
    private int client_id;
    private int rating; // 1..5
    private String comment; // nullable

    private final ODB odb = new ODB();

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getPart_id() {
        return part_id;
    }

    public void setPart_id(int part_id) {
        this.part_id = part_id;
    }

    public int getClient_id() {
        return client_id;
    }

    public void setClient_id(int client_id) {
        this.client_id = client_id;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public boolean saveOrUpdateReview() {

        // 1) Try UPDATE (review already exists)
        String updateSql = "UPDATE part_reviews " +
                "SET rating = ?, comment = ? " +
                "WHERE part_id = ? AND client_id = ?";

        try {
            PreparedStatement upStmt = odb.prepareStmt(updateSql);
            upStmt.setInt(1, getRating());
            upStmt.setString(2, getComment());
            upStmt.setInt(3, getPart_id());
            upStmt.setInt(4, getClient_id());

            int updatedRows = odb.ExecuteUpdate(upStmt);

            // If updated => done
            if (updatedRows > 0) {
                return true;
            }

            // 2) If no rows updated, do INSERT (first time review)
            String insertSql = "INSERT INTO part_reviews (part_id, client_id, rating, comment) VALUES (?, ?, ?, ?)";

            PreparedStatement inStmt = odb.prepareStmt(insertSql);
            inStmt.setInt(1, getPart_id());
            inStmt.setInt(2, getClient_id());
            inStmt.setInt(3, getRating());
            inStmt.setString(4, getComment());

            int insertedRows = odb.ExecuteUpdate(inStmt);
            return insertedRows > 0;

        } catch (SQLException ex) {
            System.out.println("DB error in saveOrUpdatePartReview: " + ex);
            return false;
        }
    }

    public JSONArray listByPart(int partId) {
        String sql = "SELECT r.id, r.part_id, r.client_id, c.fname, c.lname, r.rating, r.comment, r.created_at, r.updated_at "
                +
                "FROM part_reviews r JOIN clients_accounts c ON r.client_id = c.id WHERE part_id=? ORDER BY id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, partId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public boolean delete() {
        String sql = "DELETE FROM part_reviews WHERE id=? AND part_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
            stmt.setInt(2, getPart_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // updates parts.rate to rounded AVG(rating) + rate_count
    public boolean recalcPartRate(int partId) {
        String sql = "UPDATE parts " +
                "SET rate = IFNULL((SELECT ROUND(AVG(rating)) FROM part_reviews WHERE part_id=?), 0), " +
                "    rate_count = IFNULL((SELECT COUNT(*) FROM part_reviews WHERE part_id=?), 0) " +
                "WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, partId);
            stmt.setInt(2, partId);
            stmt.setInt(3, partId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }
}
