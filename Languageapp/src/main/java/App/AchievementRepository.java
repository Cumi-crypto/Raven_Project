package App;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * AchievementRepository — Data Access Object for the achievements table.
 * Implements the generic Repository<Achievement> interface.
 */
public class AchievementRepository implements Repository<Achievement> {

    @Override
    public void save(Achievement a) {
        String sql = "INSERT OR IGNORE INTO achievements (user_id, achievement_id, achievement_name, xp_reward, timestamp) " +
                     "VALUES (?, ?, ?, ?, datetime('now'))";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, a.getUserId());
            ps.setString(2, a.getAchievementId());
            ps.setString(3, a.getTitle());
            ps.setInt(4, a.getXpReward());
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            if (keys.next()) a.setId(keys.getInt(1));
        } catch (Exception e) {
            System.err.println("[AchievementRepository] save error: " + e.getMessage());
        }
    }

    @Override
    public Achievement findById(int id) {
        String sql = "SELECT * FROM achievements WHERE id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return mapRow(rs);
        } catch (Exception e) {
            System.err.println("[AchievementRepository] findById error: " + e.getMessage());
        }
        return null;
    }

    @Override
    public List<Achievement> findAll() {
        List<Achievement> list = new ArrayList<>();
        String sql = "SELECT * FROM achievements ORDER BY timestamp DESC";
        try (Connection conn = DatabaseManager.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) list.add(mapRow(rs));
        } catch (Exception e) {
            System.err.println("[AchievementRepository] findAll error: " + e.getMessage());
        }
        return list;
    }

    /**
     * Find all achievements earned by a specific user.
     */
    public List<Achievement> findByUserId(int userId) {
        List<Achievement> list = new ArrayList<>();
        String sql = "SELECT * FROM achievements WHERE user_id = ? ORDER BY timestamp DESC";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) list.add(mapRow(rs));
        } catch (Exception e) {
            System.err.println("[AchievementRepository] findByUserId error: " + e.getMessage());
        }
        return list;
    }

    /**
     * Check if a user already has a specific achievement.
     */
    public boolean hasAchievement(int userId, String achievementId) {
        String sql = "SELECT 1 FROM achievements WHERE user_id = ? AND achievement_id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, achievementId);
            ResultSet rs = ps.executeQuery();
            return rs.next();
        } catch (Exception e) {
            System.err.println("[AchievementRepository] hasAchievement error: " + e.getMessage());
        }
        return false;
    }

    @Override
    public void deleteById(int id) {
        String sql = "DELETE FROM achievements WHERE id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("[AchievementRepository] deleteById error: " + e.getMessage());
        }
    }

    private Achievement mapRow(ResultSet rs) throws SQLException {
        Achievement a = new Achievement();
        a.setId(rs.getInt("id"));
        a.setUserId(rs.getInt("user_id"));
        a.setAchievementId(rs.getString("achievement_id"));
        a.setTitle(rs.getString("achievement_name"));
        a.setXpReward(rs.getInt("xp_reward"));
        a.setTimestamp(rs.getString("timestamp"));
        a.setUnlocked(true);
        return a;
    }
}
