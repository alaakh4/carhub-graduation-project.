package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class PartImage {
    private int id;
    private int part_id;
    private String image_url;
    private int is_default;     // 0/1
    private int sort_order;     // default 0

    private final ODB odb = new ODB();

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getPart_id() { return part_id; }
    public void setPart_id(int part_id) { this.part_id = part_id; }

    public String getImage_url() { return image_url; }
    public void setImage_url(String image_url) { this.image_url = image_url; }

    public int getIs_default() { return is_default; }
    public void setIs_default(int is_default) { this.is_default = is_default; }

    public int getSort_order() { return sort_order; }
    public void setSort_order(int sort_order) { this.sort_order = sort_order; }

    public boolean add() {
        String sql =
            "INSERT INTO part_images (part_id, image_url, is_default, sort_order) " +
            "VALUES (?, ?, ?, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getPart_id());
            stmt.setString(2, getImage_url());
            stmt.setInt(3, getIs_default());
            stmt.setInt(4, getSort_order());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public JSONArray listByPart(int partId) {
        String sql =
            "SELECT id, part_id, image_url, is_default, sort_order, created_at " +
            "FROM part_images WHERE part_id=? ORDER BY is_default DESC, sort_order ASC, id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, partId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public boolean delete() {
        String sql = "DELETE FROM part_images WHERE id=? AND part_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
            stmt.setInt(2, getPart_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean setDefault(int partId, int imageId) {
        // 1) clear default
        String sql1 = "UPDATE part_images SET is_default=0 WHERE part_id=?";
        PreparedStatement s1 = odb.prepareStmt(sql1);
        try { s1.setInt(1, partId); } catch (SQLException ex) { return false; }
        odb.ExecuteUpdate(s1);

        // 2) set default
        String sql2 = "UPDATE part_images SET is_default=1 WHERE id=? AND part_id=?";
        PreparedStatement s2 = odb.prepareStmt(sql2);
        try {
            s2.setInt(1, imageId);
            s2.setInt(2, partId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(s2) > 0;
    }

    public JSONArray getDefaultByPart(int partId) {
        String sql =
            "SELECT id, part_id, image_url FROM part_images " +
            "WHERE part_id=? AND is_default=1 LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, partId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }
}
