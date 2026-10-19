package App;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * UserRepository — Data Access Object for the users table.
 * Implements the generic Repository<User> interface.
 * Uses prepared statements to prevent SQL injection.
 */
public class UserRepository implements Repository<User> {

    @Override
    public void save(User user) {
        String sql;
        if (user.getId() == 0) {
            // INSERT new user
            sql = "INSERT INTO users (username, email, password_hash, level, xp, streak, city, province, country, avatar, email_verified) " +
                  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            try (Connection conn = DatabaseManager.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, user.getUsername());
                ps.setString(2, user.getEmail() != null ? user.getEmail() : "");
                ps.setString(3, user.getPasswordHash());
                ps.setInt(4, user.getLevel());
                ps.setInt(5, user.getXp());
                ps.setInt(6, user.getStreak());
                ps.setString(7, user.getCity() != null ? user.getCity() : "");
                ps.setString(8, user.getProvince() != null ? user.getProvince() : "");
                ps.setString(9, user.getCountry() != null ? user.getCountry() : "Indonesia");
                ps.setString(10, user.getAvatar() != null ? user.getAvatar() : "boy");
                ps.setInt(11, user.isEmailVerified() ? 1 : 0);
                ps.executeUpdate();
                ResultSet keys = ps.getGeneratedKeys();
                if (keys.next()) {
                    user.setId(keys.getInt(1));
                }
            } catch (Exception e) {
                System.err.println("[UserRepository] save (insert) error: " + e.getMessage());
            }
        } else {
            // UPDATE existing user
            sql = "UPDATE users SET username=?, email=?, level=?, xp=?, streak=?, city=?, province=?, avatar=?, email_verified=?, last_login_date=? WHERE id=?";
            try (Connection conn = DatabaseManager.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, user.getUsername());
                ps.setString(2, user.getEmail() != null ? user.getEmail() : "");
                ps.setInt(3, user.getLevel());
                ps.setInt(4, user.getXp());
                ps.setInt(5, user.getStreak());
                ps.setString(6, user.getCity() != null ? user.getCity() : "");
                ps.setString(7, user.getProvince() != null ? user.getProvince() : "");
                ps.setString(8, user.getAvatar() != null ? user.getAvatar() : "boy");
                ps.setInt(9, user.isEmailVerified() ? 1 : 0);
                ps.setString(10, user.getLastLoginDate() != null ? user.getLastLoginDate() : "");
                ps.setInt(11, user.getId());
                ps.executeUpdate();
            } catch (Exception e) {
                System.err.println("[UserRepository] save (update) error: " + e.getMessage());
            }
        }
    }

    @Override
    public User findById(int id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapRow(rs);
            }
        } catch (Exception e) {
            System.err.println("[UserRepository] findById error: " + e.getMessage());
        }
        return null;
    }

    /**
     * Find a user by username (case-insensitive).
     */
    public User findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE LOWER(username) = LOWER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapRow(rs);
            }
        } catch (Exception e) {
            System.err.println("[UserRepository] findByUsername error: " + e.getMessage());
        }
        return null;
    }

    /**
     * Find a user by email (case-insensitive).
     */
    public User findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE LOWER(email) = LOWER(?)";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapRow(rs);
            }
        } catch (Exception e) {
            System.err.println("[UserRepository] findByEmail error: " + e.getMessage());
        }
        return null;
    }

    @Override
    public List<User> findAll() {
        List<User> users = new ArrayList<>();
        String sql = "SELECT * FROM users ORDER BY xp DESC";
        try (Connection conn = DatabaseManager.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                users.add(mapRow(rs));
            }
        } catch (Exception e) {
            System.err.println("[UserRepository] findAll error: " + e.getMessage());
        }
        return users;
    }

    /**
     * Get top N users by XP for a specific city (leaderboard).
     */
    public List<User> findLeaderboardByCity(String city, int limit) {
        List<User> users = new ArrayList<>();
        String sql = "SELECT * FROM users WHERE LOWER(city) = LOWER(?) ORDER BY xp DESC LIMIT ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, city);
            ps.setInt(2, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) users.add(mapRow(rs));
        } catch (Exception e) {
            System.err.println("[UserRepository] leaderboard by city error: " + e.getMessage());
        }
        return users;
    }

    /**
     * Get top N users by XP for a specific province (leaderboard).
     */
    public List<User> findLeaderboardByProvince(String province, int limit) {
        List<User> users = new ArrayList<>();
        String sql = "SELECT * FROM users WHERE LOWER(province) = LOWER(?) ORDER BY xp DESC LIMIT ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, province);
            ps.setInt(2, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) users.add(mapRow(rs));
        } catch (Exception e) {
            System.err.println("[UserRepository] leaderboard by province error: " + e.getMessage());
        }
        return users;
    }

    /**
     * Get top N users by XP for a specific country (leaderboard).
     */
    public List<User> findLeaderboardByCountry(String country, int limit) {
        List<User> users = new ArrayList<>();
        String sql = "SELECT * FROM users WHERE LOWER(country) = LOWER(?) ORDER BY xp DESC LIMIT ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, country);
            ps.setInt(2, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) users.add(mapRow(rs));
        } catch (Exception e) {
            System.err.println("[UserRepository] leaderboard by country error: " + e.getMessage());
        }
        return users;
    }

    @Override
    public void deleteById(int id) {
        String sql = "DELETE FROM users WHERE id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("[UserRepository] deleteById error: " + e.getMessage());
        }
    }

    /**
     * Check if a username is already taken.
     */
    public boolean usernameExists(String username) {
        return findByUsername(username) != null;
    }

    /**
     * Update user password hash.
     */
    public void updatePassword(int userId, String newHash) {
        String sql = "UPDATE users SET password_hash = ? WHERE id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newHash);
            ps.setInt(2, userId);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("[UserRepository] updatePassword error: " + e.getMessage());
        }
    }

    private User mapRow(ResultSet rs) throws SQLException {
        User u = new User();
        u.setId(rs.getInt("id"));
        u.setUsername(rs.getString("username"));
        u.setEmail(rs.getString("email"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setLevel(rs.getInt("level"));
        u.setXp(rs.getInt("xp"));
        u.setStreak(rs.getInt("streak"));
        u.setCity(rs.getString("city"));
        u.setProvince(rs.getString("province"));
        u.setCountry(rs.getString("country"));
        
        // Handle new columns gracefully if they might be missing before a restart/update
        try { u.setAvatar(rs.getString("avatar")); } catch (Exception e) { u.setAvatar("boy"); }
        try { u.setEmailVerified(rs.getInt("email_verified") == 1); } catch (Exception e) { u.setEmailVerified(false); }

        u.setLastLoginDate(rs.getString("last_login_date"));
        u.setCreatedAt(rs.getString("created_at"));
        return u;
    }
}
