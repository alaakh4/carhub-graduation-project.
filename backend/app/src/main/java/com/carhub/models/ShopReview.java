package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class ShopReview {
    private int id;
    private int shop_id;
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

    public int getShop_id() {
        return shop_id;
    }

    public void setShop_id(int shop_id) {
        this.shop_id = shop_id;
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
        String updateSql = "UPDATE shop_reviews " +
                "SET rating = ?, comment = ? " +
                "WHERE shop_id = ? AND client_id = ?";

        try {
            PreparedStatement upStmt = odb.prepareStmt(updateSql);
            upStmt.setInt(1, getRating());
            upStmt.setString(2, getComment());
            upStmt.setInt(3, getShop_id());
            upStmt.setInt(4, getClient_id());
            int updatedRows = odb.ExecuteUpdate(upStmt);

            // If updated => done
            if (updatedRows > 0) {
                return true;
            }

            String insertSql = "INSERT INTO shop_reviews (shop_id, client_id, rating, comment) VALUES (?, ?, ?, ?)";
            PreparedStatement inStmt = odb.prepareStmt(insertSql);
            inStmt.setInt(1, getShop_id());
            inStmt.setInt(2, getClient_id());
            inStmt.setInt(3, getRating());
            inStmt.setString(4, getComment());
            int insertedRows = odb.ExecuteUpdate(inStmt);
            return insertedRows > 0;

        } catch (SQLException ex) {
            System.out.println("DB error in saveOrUpdateReview: " + ex);
            return false;
        }
    }

    public JSONArray listByShop(int shopId) {
    String sql = "SELECT sr.id, sr.shop_id, sr.client_id, c.lname, c.fname, sr.rating, sr.comment, sr.created_at, sr.updated_at " +
        "FROM shop_reviews sr " +
        "JOIN clients_accounts c ON sr.client_id = c.id " +
        "WHERE sr.shop_id=? " +
        "ORDER BY COALESCE(sr.updated_at, sr.created_at) DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public boolean delete() {
        String sql = "DELETE FROM shop_reviews WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
            stmt.setInt(2, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // updates shops_accounts.rate to rounded AVG(rating) + rate_count
    public boolean recalcShopRate(int shopId) {
        String sql = "UPDATE shops_accounts " +
                "SET rate = IFNULL((SELECT ROUND(AVG(rating), 2) FROM shop_reviews WHERE shop_id=?), 0.00), " +
                "    rate_count = IFNULL((SELECT COUNT(*) FROM shop_reviews WHERE shop_id=?), 0) " +
                "WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            stmt.setInt(2, shopId);
            stmt.setInt(3, shopId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }
}
