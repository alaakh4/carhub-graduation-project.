package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class PartsOrder {

    // status suggestion:
    // 0 = Pending, 1 = Accepted, 2 = Rejected, 3 = Completed
    private int id;
    private int part_id;
    private Integer shop_id; // nullable
    private int client_id;
    private int quantity;
    private int status;

    // Checkout snapshot fields (from your table)
    private String contact_phone;
    private String ship_first_name;
    private String ship_last_name;
    private String ship_address;
    private String ship_apartment; // nullable
    private Integer ship_city_id; // nullable
    private String ship_neighborhood; // nullable
    private String ship_zip_code; // nullable

    private String order_group_id;

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

    public Integer getShop_id() {
        return shop_id;
    }

    public void setShop_id(Integer shop_id) {
        this.shop_id = shop_id;
    }

    public int getClient_id() {
        return client_id;
    }

    public void setClient_id(int client_id) {
        this.client_id = client_id;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    // ---- getters/setters for checkout fields ----
    public String getContact_phone() {
        return contact_phone;
    }

    public void setContact_phone(String contact_phone) {
        this.contact_phone = contact_phone;
    }

    public String getShip_first_name() {
        return ship_first_name;
    }

    public void setShip_first_name(String ship_first_name) {
        this.ship_first_name = ship_first_name;
    }

    public String getShip_last_name() {
        return ship_last_name;
    }

    public void setShip_last_name(String ship_last_name) {
        this.ship_last_name = ship_last_name;
    }

    public String getShip_address() {
        return ship_address;
    }

    public void setShip_address(String ship_address) {
        this.ship_address = ship_address;
    }

    public String getShip_apartment() {
        return ship_apartment;
    }

    public void setShip_apartment(String ship_apartment) {
        this.ship_apartment = ship_apartment;
    }

    public Integer getShip_city_id() {
        return ship_city_id;
    }

    public void setShip_city_id(Integer ship_city_id) {
        this.ship_city_id = ship_city_id;
    }

    public String getship_neighborhood() {
        return ship_neighborhood;
    }

    public void setship_neighborhood(String ship_neighborhood) {
        this.ship_neighborhood = ship_neighborhood;
    }

    public String getShip_zip_code() {
        return ship_zip_code;
    }

    public void setShip_zip_code(String ship_zip_code) {
        this.ship_zip_code = ship_zip_code;
    }

    public String get_order_group_id() {
        return this.order_group_id;
    }

    public void setOrder_group_id(String orderId) {
        this.order_group_id = orderId;
    }

    public boolean create() {
        String sql = "INSERT INTO parts_orders (" +
                "part_id, shop_id, client_id, quantity, status, " +
                "contact_phone, ship_first_name, ship_last_name, ship_address, " +
                "ship_apartment, ship_city_id, ship_neighborhood, ship_zip_code, " +
                "order_group_id" +
                ") VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            // 1-4
            stmt.setInt(1, getPart_id());
            if (getShop_id() == null)
                stmt.setNull(2, java.sql.Types.INTEGER);
            else
                stmt.setInt(2, getShop_id());
            stmt.setInt(3, getClient_id());
            stmt.setInt(4, getQuantity());

            // 5-8 (required)
            stmt.setString(5, getContact_phone());
            stmt.setString(6, getShip_first_name());
            stmt.setString(7, getShip_last_name());
            stmt.setString(8, getShip_address());

            // 9 (nullable)
            if (getShip_apartment() == null || getShip_apartment().trim().isEmpty())
                stmt.setNull(9, java.sql.Types.VARCHAR);
            else
                stmt.setString(9, getShip_apartment());

            // 10 (nullable)
            if (getShip_city_id() == null)
                stmt.setNull(10, java.sql.Types.INTEGER);
            else
                stmt.setInt(10, getShip_city_id());

            // 11 (nullable)
            if (getship_neighborhood() == null || getship_neighborhood().trim().isEmpty())
                stmt.setNull(11, java.sql.Types.VARCHAR);
            else
                stmt.setString(11, getship_neighborhood());

            // 12 (nullable)
            if (getShip_zip_code() == null || getShip_zip_code().trim().isEmpty())
                stmt.setNull(12, java.sql.Types.VARCHAR);
            else
                stmt.setString(12, getShip_zip_code());

            // 13 (required)
            stmt.setString(13, get_order_group_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean updateStatus() {
        String sql = "UPDATE parts_orders SET status=? WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getStatus());
            stmt.setInt(2, getId());
            if (getShop_id() == null)
                stmt.setNull(3, java.sql.Types.INTEGER);
            else
                stmt.setInt(3, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // Update status only if the current status matches oldStatus (prevents race
    // conditions).
    public boolean updateStatusFrom(int oldStatus) {
        String sql = "UPDATE parts_orders SET status=? WHERE id=? AND shop_id=? AND status=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getStatus());
            stmt.setInt(2, getId());
            if (getShop_id() == null)
                stmt.setNull(3, java.sql.Types.INTEGER);
            else
                stmt.setInt(3, getShop_id());
            stmt.setInt(4, oldStatus);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public JSONArray listByClient(int clientId) {
        String sql = "SELECT po.status, p.name AS part_name, p.price, p.details, p.brand," +
                "s.name as shop_name, image.image_url " +
                "FROM parts_orders po " +
                "LEFT JOIN parts p ON p.id=po.part_id " +
                "LEFT JOIN shops_accounts s ON s.id=po.shop_id " +
                "LEFT JOIN part_images image ON image.part_id=po.part_id AND image.is_default = 1 " +
                "WHERE po.client_id=? ORDER BY po.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, clientId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray listByShop(int shopId) {
        String sql = "SELECT po.*, p.name AS part_name, p.price, p.slug " +
                "FROM parts_orders po " +
                "LEFT JOIN parts p ON p.id=po.part_id " +
                "WHERE po.shop_id=? ORDER BY po.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray findById(int id) {
        String sql = "SELECT * FROM parts_orders WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray listCurrentGroupsByClient(int clientId) {
        String sql = "SELECT " +
        "  po.order_group_id, " +
        "  MAX(po.id) AS order_id, " +
        "  CONCAT('Order #', LPAD(MAX(po.id), 6, '0')) AS order_no, " +

        // group_status: 0 if any item is pending, else 1
        "  CASE " +
        "    WHEN SUM(CASE WHEN po.status = 0 THEN 1 ELSE 0 END) > 0 THEN 0 " +
        "    ELSE 1 " +
        "  END AS group_status, " +

        "  CASE " +
        "    WHEN SUM(CASE WHEN po.status = 0 THEN 1 ELSE 0 END) > 0 THEN 'Pending' " +
        "    ELSE 'In Delivery' " +
        "  END AS status_text, " +

        "  COUNT(*) AS items_count, " +
        "  SUM(po.quantity) AS total_quantity, " +
        "  ROUND(SUM(po.quantity * IFNULL(p.price,0)), 2) AS total_price, " +
        "  MAX(po.created_at) AS created_at, " +
        "  MAX(CASE WHEN img.is_default = 1 THEN img.image_url END) AS preview_image, " +
        "  GROUP_CONCAT(CONCAT(p.name, ' x', po.quantity) ORDER BY po.id SEPARATOR ' • ') AS preview_items " +
        "FROM parts_orders po " +
        "LEFT JOIN parts p ON p.id = po.part_id " +
        "LEFT JOIN part_images img ON img.part_id = po.part_id AND img.is_default = 1 " +
        "WHERE po.client_id = ? AND po.status IN (0,1) " +
        "GROUP BY po.order_group_id " +
        "ORDER BY created_at DESC";

        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, clientId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray listHistoryGroupsByClient(int clientId) {
        String sql = "SELECT " +
        "  COALESCE(po.order_group_id, CONCAT('legacy-', po.id)) AS order_group_id, " +
        "  MAX(po.id) AS order_id, " +
        "  CONCAT('Order #', LPAD(MAX(po.id), 6, '0')) AS order_no, " +
        "  3 AS group_status, " +
        "  'Completed' AS status_text, " +
        "  COUNT(*) AS items_count, " +
        "  SUM(po.quantity) AS total_quantity, " +
        "  ROUND(SUM(po.quantity * IFNULL(p.price,0)), 2) AS total_price, " +
        "  MAX(po.created_at) AS created_at, " +
        "  MAX(CASE WHEN img.is_default = 1 THEN img.image_url END) AS preview_image, " +
        "  GROUP_CONCAT(CONCAT(p.name, ' x', po.quantity) ORDER BY po.id SEPARATOR ' | ') AS preview_items " +
        "FROM parts_orders po " +
        "LEFT JOIN parts p ON p.id = po.part_id " +
        "LEFT JOIN part_images img ON img.part_id = po.part_id AND img.is_default = 1 " +
        "WHERE po.client_id = ? AND po.status = 3 " +
        "GROUP BY COALESCE(po.order_group_id, CONCAT('legacy-', po.id)) " +
        "ORDER BY created_at DESC";

        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, clientId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }
}
