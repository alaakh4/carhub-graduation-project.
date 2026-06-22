package com.carhub.models;

import com.carhub.DBCRUD.ODB;
import org.json.JSONArray;

import java.sql.PreparedStatement;
import java.sql.SQLException;

public class PartShop {
    private int id;
    private String name;
    private String slug;
    private String tags; // nullable
    private double price;
    private String details;
    private Integer shop_id; // nullable in DB
    private int quantity;
    private int rate; // stored as tinyint (rounded avg)
    private int rate_count; // number of ratings
    private int is_active; // 1 active, 0 hidden
    private String brand; // nullable
    private String category; // nullable

    private final ODB odb = new ODB();

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public Integer getShop_id() {
        return shop_id;
    }

    public void setShop_id(Integer shop_id) {
        this.shop_id = shop_id;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getRate() {
        return rate;
    }

    public void setRate(int rate) {
        this.rate = rate;
    }

    public int getRate_count() {
        return rate_count;
    }

    public void setRate_count(int rate_count) {
        this.rate_count = rate_count;
    }

    public int getIs_active() {
        return is_active;
    }

    public void setIs_active(int is_active) {
        this.is_active = is_active;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public boolean add() {
        String sql = "INSERT INTO parts (name, slug, tags, price, brand, category, details, shop_id, quantity, rate, rate_count, is_active) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1)";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
            stmt.setString(2, getSlug());
            stmt.setString(3, getTags());
            stmt.setDouble(4, getPrice());
            stmt.setString(5, getBrand());
            stmt.setString(6, getCategory());
            stmt.setString(7, getDetails());

            if (getShop_id() == null)
                stmt.setNull(8, java.sql.Types.INTEGER);
            else
                stmt.setInt(8, getShop_id());

            stmt.setInt(9, getQuantity());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean update() {
        String sql = "UPDATE parts SET name=?, slug=?, tags=?, price=?, brand=?, category=?, details=?, quantity=?, is_active=? "
                +
                "WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setString(1, getName());
            stmt.setString(2, getSlug());
            stmt.setString(3, getTags());
            stmt.setDouble(4, getPrice());
            stmt.setString(5, getBrand());
            stmt.setString(6, getCategory());
            stmt.setString(7, getDetails());
            stmt.setInt(8, getQuantity());
            stmt.setInt(9, getIs_active());
            stmt.setInt(10, getId());

            if (getShop_id() == null)
                stmt.setNull(11, java.sql.Types.INTEGER);
            else
                stmt.setInt(11, getShop_id());

        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public boolean delete() {
        String sql = "DELETE FROM parts WHERE id=? AND shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, getId());
            if (getShop_id() == null)
                stmt.setNull(2, java.sql.Types.INTEGER);
            else
                stmt.setInt(2, getShop_id());
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    public JSONArray listActive() {
        String sql = "SELECT p.id, p.name, p.slug, p.tags, p.brand, p.category, p.price, p.details, " +
                "p.shop_id, p.quantity, p.rate, p.rate_count, p.is_active, p.created_at, p.updated_at, " +
                "pi.image_url AS default_img " +
                "FROM parts p " +
                "LEFT JOIN part_images pi ON pi.part_id = p.id AND pi.is_default = 1 " +
                "WHERE p.is_active = 1 " +
                "ORDER BY p.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        return odb.ExecuteQueryJson(stmt);
    }

    public JSONArray listByShop(int shopId) {
        String sql = "SELECT p.id, p.name, p.slug, p.tags, p.brand, p.category, p.price, p.details, " +
                "p.shop_id, p.quantity, p.rate, p.rate_count, p.is_active, p.created_at, p.updated_at, " +
                "pi.image_url AS default_img " +
                "FROM parts p " +
                "LEFT JOIN part_images pi ON pi.part_id = p.id AND pi.is_default = 1 " +
                "WHERE p.shop_id = ? " +
                "ORDER BY p.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray listActiveByShop(int shopId) {
        String sql = "SELECT p.id, p.name, p.slug, p.tags, p.brand, p.category, p.price, p.details, " +
                "p.shop_id, p.quantity, p.rate, p.rate_count, p.is_active, p.created_at, p.updated_at, " +
                "pi.image_url AS default_img " +
                "FROM parts p " +
                "LEFT JOIN part_images pi ON pi.part_id = p.id AND pi.is_default = 1 " +
                "WHERE p.shop_id = ? AND p.is_active = 1 " +
                "ORDER BY p.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, shopId);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray listSimilarActive(int partId, String category, String brand, int limit) {
        String safeCategory = (category == null || category.trim().isEmpty()) ? "__NO_MATCH__" : category.trim();
        String safeBrand = (brand == null || brand.trim().isEmpty()) ? "__NO_MATCH__" : brand.trim();

        String sql = "SELECT p.id, p.name, p.slug, p.tags, p.brand, p.category, p.price, p.details, " +
                "p.shop_id, p.quantity, p.rate, p.rate_count, p.is_active, p.created_at, p.updated_at, " +
                "pi.image_url AS default_img " +
                "FROM parts p " +
                "LEFT JOIN part_images pi ON pi.part_id = p.id AND pi.is_default = 1 " +
                "WHERE p.is_active = 1 AND p.id <> ? AND (p.category = ? OR p.brand = ?) " +
                "ORDER BY CASE WHEN p.category = ? THEN 0 ELSE 1 END, " +
                "CASE WHEN p.brand = ? THEN 0 ELSE 1 END, " +
                "p.rate DESC, p.rate_count DESC, p.id DESC LIMIT ?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, partId);
            stmt.setString(2, safeCategory);
            stmt.setString(3, safeBrand);
            stmt.setString(4, safeCategory);
            stmt.setString(5, safeBrand);
            stmt.setInt(6, limit);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray findById(int id) {
        String sql = "SELECT id, name, slug, tags, brand, category, price, details, shop_id,quantity, rate, rate_count, is_active, created_at, updated_at "
                +
                "FROM parts WHERE id=? LIMIT 1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray findByIdFullDetails(int id) {
        String sql = "SELECT p.id, p.name, p.shop_id, p.slug, p.tags, p.brand, p.category, p.price, p.details, " +
                "p.quantity, p.rate, p.rate_count, p.is_active, p.created_at, p.updated_at," +
                "s.name AS shopname, s.phone, s.email " +
                "FROM parts p JOIN shops_accounts s ON p.shop_id = s.id WHERE p.id = ? LIMIT 1";

        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, id);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public JSONArray searchActive(String q) {
        String sql = "SELECT p.id, p.name, p.slug, p.tags, p.brand, p.category, p.price, p.details, " +
                "p.shop_id, p.quantity, p.rate, p.rate_count, p.is_active, p.created_at, p.updated_at, " +
                "pi.image_url AS default_img " +
                "FROM parts p " +
                "LEFT JOIN part_images pi ON pi.part_id = p.id AND pi.is_default = 1 " +
                "WHERE p.is_active = 1 AND (" +
                "p.name LIKE ? OR COALESCE(p.slug, '') LIKE ? OR COALESCE(p.tags, '') LIKE ? OR " +
                "COALESCE(p.brand, '') LIKE ? OR COALESCE(p.category, '') LIKE ? OR COALESCE(p.details, '') LIKE ?" +
                ") " +
                "ORDER BY CASE " +
                "WHEN LOWER(p.name) = LOWER(?) THEN 0 " +
                "WHEN LOWER(p.name) LIKE LOWER(?) THEN 1 " +
                "WHEN LOWER(COALESCE(p.brand, '')) LIKE LOWER(?) THEN 2 " +
                "WHEN LOWER(COALESCE(p.category, '')) LIKE LOWER(?) THEN 3 " +
                "WHEN LOWER(COALESCE(p.tags, '')) LIKE LOWER(?) THEN 4 " +
                "ELSE 5 END, " +
                "p.rate DESC, p.rate_count DESC, p.id DESC";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            String like = "%" + q + "%";
            String prefix = q + "%";
            stmt.setString(1, like);
            stmt.setString(2, like);
            stmt.setString(3, like);
            stmt.setString(4, like);
            stmt.setString(5, like);
            stmt.setString(6, like);
            stmt.setString(7, q);
            stmt.setString(8, prefix);
            stmt.setString(9, prefix);
            stmt.setString(10, prefix);
            stmt.setString(11, like);
            return odb.ExecuteQueryJson(stmt);
        } catch (SQLException ex) {
            return null;
        }
    }

    public boolean setActive(int partId, int active) {
        String sql = "UPDATE parts SET is_active=? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, active);
            stmt.setInt(2, partId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    /**
     * Set active flag for ALL parts that belong to a shop (used when admin
     * deactivates/deletes a shop)
     */
    public boolean setActiveByShop(int shopId, int active) {
        String sql = "UPDATE parts SET is_active=? WHERE shop_id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, active);
            stmt.setInt(2, shopId);
        } catch (SQLException ex) {
            return false;
        }
        // true even if 0 rows updated (shop might have 0 parts)
        return odb.ExecuteUpdate(stmt) >= 0;
    }

    // Decrement stock atomically when a shop ACCEPTS an order.
    // Returns true only if there was enough quantity and the part is active.
    public boolean decrementQuantityIfAvailable(int partId, int qty) {
        String sql = "UPDATE parts SET quantity = quantity - ? WHERE id=? AND quantity >= ? AND is_active=1";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, qty);
            stmt.setInt(2, partId);
            stmt.setInt(3, qty);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // Increment stock (used when an ACCEPTED order is later REJECTED / canceled).
    public boolean incrementQuantity(int partId, int qty) {
        if (qty <= 0)
            return false;
        String sql = "UPDATE parts SET quantity = quantity + ? WHERE id=?";
        PreparedStatement stmt = odb.prepareStmt(sql);
        try {
            stmt.setInt(1, qty);
            stmt.setInt(2, partId);
        } catch (SQLException ex) {
            return false;
        }
        return odb.ExecuteUpdate(stmt) > 0;
    }

    // called after adding/deleting reviews
    public boolean recalcRate(int partId) {
        String sql = "UPDATE parts " +
                "SET rate = IFNULL((SELECT ROUND(AVG(rating), 2) FROM part_reviews WHERE part_id=?), 0.00), " +
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
