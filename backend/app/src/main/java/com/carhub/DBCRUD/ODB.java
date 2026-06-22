package com.carhub.DBCRUD; // change if your package is different

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Properties;

import org.json.JSONArray;
import org.json.JSONObject;

public class ODB {
    private Connection conn;

    public boolean CloseConnection() {
        try {
            if (conn != null && !conn.isClosed()) conn.close();
            return true;
        } catch (SQLException ex) {
            return false;
        }
    }

    public boolean OpenConnection() {
        try {
            // ✅ MySQL connection
            String url  = System.getenv().getOrDefault("DB_URL",
                    "jdbc:mysql://localhost:3306/samkery?useSSL=false&serverTimezone=UTC");
            String user = System.getenv().getOrDefault("DB_USER", "root");
            String pass = System.getenv().getOrDefault("DB_PASS", "");

            Properties props = new Properties();
            props.put("user", user);
            props.put("password", pass);

            conn = DriverManager.getConnection(url, props);
            return true;
        } catch (SQLException ex) {
            System.out.println("DB Connection Error: " + ex.getMessage());
            return false;
        }
    }

    public PreparedStatement prepareStmt(String sql) {
        try {
            OpenConnection();
            return conn.prepareStatement(sql);
        } catch (SQLException ex) {
            return null;
        }
    }

    public int ExecuteUpdate(PreparedStatement stmt) {
        try {
            return stmt.executeUpdate();
        } catch (SQLException ex) {
            System.out.println("ExecuteUpdate Error: " + ex.getMessage());
            return -1;
        } finally {
            CloseConnection();
        }
    }

    public JSONArray ExecuteQueryJson(PreparedStatement stmt) {
        try {
            ResultSet rs = stmt.executeQuery();
            return ResultSet2Json(rs);
        } catch (SQLException ex) {
            System.out.println("ExecuteQueryJson Error: " + ex.getMessage());
            return null;
        } finally {
            CloseConnection();
        }
    }

    private JSONArray ResultSet2Json(ResultSet result) {
        JSONArray jsonRows = new JSONArray();
        try {
            while (result.next()) {
                int colsCount = result.getMetaData().getColumnCount();
                JSONObject jsonRow = new JSONObject();
                for (int x = 1; x <= colsCount; x++) {
                    jsonRow.put(result.getMetaData().getColumnLabel(x),
                            result.getObject(x));
                }
                jsonRows.put(jsonRow);
            }
            return jsonRows;
        } catch (SQLException ex) {
            return null;
        }
    }
}
