package App;

import java.sql.*;

/**
 * DatabaseManager — Initializes and manages all SQLite database tables.
 * Adds new tables (users, achievements, quiz_history, typing_history, progress, leaderboard)
 * to the existing kamus.db database.
 *
 * All user data lives alongside the vocabulary data in kamus.db for simplicity.
 */
public class DatabaseManager {

    public static final String DB_URL = "jdbc:sqlite:kamus.db";

    /**
     * Initialize all required tables. Safe to call multiple times (uses IF NOT EXISTS).
     */
    public static void initializeTables() {
        try {
            Class.forName("org.sqlite.JDBC");
            Connection conn = DriverManager.getConnection(DB_URL);

            Statement st = conn.createStatement();

            // ===== USERS TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS users (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  username TEXT NOT NULL UNIQUE," +
                "  email TEXT," +
                "  password_hash TEXT NOT NULL," +
                "  level INTEGER DEFAULT 1," +
                "  xp INTEGER DEFAULT 0," +
                "  streak INTEGER DEFAULT 0," +
                "  city TEXT DEFAULT ''," +
                "  province TEXT DEFAULT ''," +
                "  country TEXT DEFAULT 'Indonesia'," +
                "  last_login_date TEXT DEFAULT ''," +
                "  created_at TEXT DEFAULT (datetime('now'))" +
                ")"
            );

            // Safely upgrade existing table to include avatar and email_verified
            try {
                st.execute("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'boy'");
            } catch (SQLException e) {
                // Ignore if column already exists
            }
            try {
                st.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
            } catch (SQLException e) {
                // Ignore if column already exists
            }

            // ===== EMAIL VERIFICATIONS TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS email_verifications (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  email TEXT NOT NULL," +
                "  otp TEXT NOT NULL," +
                "  expires_at TEXT NOT NULL," +
                "  created_at TEXT DEFAULT (datetime('now'))" +
                ")"
            );

            // ===== QUIZ_HISTORY TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS quiz_history (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  user_id INTEGER NOT NULL," +
                "  score INTEGER DEFAULT 0," +
                "  correct_answers INTEGER DEFAULT 0," +
                "  total_questions INTEGER DEFAULT 10," +
                "  stars INTEGER DEFAULT 0," +
                "  timestamp TEXT DEFAULT (datetime('now'))," +
                "  FOREIGN KEY (user_id) REFERENCES users(id)" +
                ")"
            );

            // ===== TYPING_HISTORY TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS typing_history (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  user_id INTEGER NOT NULL," +
                "  wpm INTEGER DEFAULT 0," +
                "  accuracy INTEGER DEFAULT 0," +
                "  xp_earned INTEGER DEFAULT 0," +
                "  timestamp TEXT DEFAULT (datetime('now'))," +
                "  FOREIGN KEY (user_id) REFERENCES users(id)" +
                ")"
            );

            // ===== ACHIEVEMENTS TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS achievements (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  user_id INTEGER NOT NULL," +
                "  achievement_id TEXT NOT NULL," +
                "  achievement_name TEXT NOT NULL," +
                "  xp_reward INTEGER DEFAULT 0," +
                "  timestamp TEXT DEFAULT (datetime('now'))," +
                "  FOREIGN KEY (user_id) REFERENCES users(id)" +
                ")"
            );

            // ===== PROGRESS TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS progress (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  user_id INTEGER NOT NULL UNIQUE," +
                "  completed_quiz INTEGER DEFAULT 0," +
                "  learned_words INTEGER DEFAULT 0," +
                "  total_xp INTEGER DEFAULT 0," +
                "  FOREIGN KEY (user_id) REFERENCES users(id)" +
                ")"
            );

            // ===== SESSIONS TABLE =====
            // Persists session tokens so a server restart doesn't log everyone out.
            st.execute(
                "CREATE TABLE IF NOT EXISTS sessions (" +
                "  session_token TEXT PRIMARY KEY," +
                "  user_id INTEGER NOT NULL," +
                "  created_at TEXT DEFAULT (datetime('now'))," +
                "  FOREIGN KEY (user_id) REFERENCES users(id)" +
                ")"
            );

            // ===== LEADERBOARD VIEW (virtual — computed from users table) =====
            // Leaderboard is derived from the users table XP column,
            // filtered by city, province, or country.

            // ===== PASSWORD_RESETS TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS password_resets (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  email TEXT NOT NULL," +
                "  otp TEXT NOT NULL," +
                "  expires_at TEXT NOT NULL" +
                ")"
            );

            // ===== WORD_CONTRIBUTIONS TABLE =====
            st.execute(
                "CREATE TABLE IF NOT EXISTS word_contributions (" +
                "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "  user_id INTEGER," +
                "  english TEXT," +
                "  indonesian TEXT," +
                "  example_sentence TEXT," +
                "  status TEXT DEFAULT 'pending'," +
                "  ai_reasoning TEXT," +
                "  submitted_at TEXT" +
                ")"
            );

            st.close();
            conn.close();
            System.out.println("[DatabaseManager] All tables initialized in kamus.db");

        } catch (Exception e) {
            System.err.println("[DatabaseManager] Error initializing tables: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Get a new database connection. Caller is responsible for closing it.
     */
    public static Connection getConnection() throws SQLException, ClassNotFoundException {
        Class.forName("org.sqlite.JDBC");
        return DriverManager.getConnection(DB_URL);
    }

    /**
     * Simple SHA-256 password hash (no salt — educational demo).
     * In production, use BCrypt.
     */
    public static String hashPassword(String password) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            return password; // fallback — should never happen
        }
    }
}
