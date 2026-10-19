package App;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.net.InetSocketAddress;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

/**
 * SimpleAPI — Lightweight HTTP server for the Lexify backend.
 * Uses Java's built-in HttpServer (intentionally lightweight, not Spring Boot).
 */
public class SimpleAPI {

    private static final UserRepository userRepo = new UserRepository();
    // In-memory session cache: token -> userId
    // Backed by the `sessions` table in kamus.db so sessions survive server restarts.
    private static final Map<String, Integer> sessions = new HashMap<>();

    /** Load all persisted sessions from DB into the in-memory map on startup. */
    private static void loadSessionsFromDB() {
        try (Connection conn = DatabaseManager.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT session_token, user_id FROM sessions")) {
            int count = 0;
            while (rs.next()) {
                sessions.put(rs.getString("session_token"), rs.getInt("user_id"));
                count++;
            }
            System.out.println("[SimpleAPI] Loaded " + count + " sessions from DB.");
        } catch (Exception e) {
            System.err.println("[SimpleAPI] Could not load sessions from DB: " + e.getMessage());
        }
    }

    /** Persist a new session token to the DB. */
    private static void persistSession(String token, int userId) {
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                 "INSERT OR REPLACE INTO sessions (session_token, user_id) VALUES (?, ?)")) {
            ps.setString(1, token);
            ps.setInt(2, userId);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("[SimpleAPI] Could not persist session: " + e.getMessage());
        }
    }

    /** Remove a session token from the DB. */
    private static void deletePersistedSession(String token) {
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM sessions WHERE session_token = ?")) {
            ps.setString(1, token);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("[SimpleAPI] Could not delete session: " + e.getMessage());
        }
    }

    public static void main(String[] args) throws Exception {

        // Initialize all database tables on startup
        DatabaseManager.initializeTables();

        // Restore persisted sessions so server restart doesn't log everyone out
        loadSessionsFromDB();

        // Load vocabulary dictionary
        Kamus kamus = new Kamus();
        kamus.loadDariDatabase();

        String portEnv = System.getenv("PORT");
        int port = portEnv != null ? Integer.parseInt(portEnv) : 8091;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // ==========================
        // GET /cari — Dictionary search (English or Indonesian)
        // ==========================
        server.createContext("/cari", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                String kata = getQueryParam(exchange, "kata");
                if (kata == null) kata = "";
                String lang = getQueryParam(exchange, "lang"); // "id" for Indonesian->English
                
                String localResponse;
                if ("id".equalsIgnoreCase(lang)) {
                    localResponse = kamus.cariKataReverse(kata);
                } else {
                    localResponse = kamus.cariKataGUI(kata);
                }
                
                if ("Kata tidak ditemukan".equals(localResponse)) {
                    String aiResponse = AIService.translateWord(kata, lang);
                    
                    // Optional: Try to parse and insert the AI response into the kamus DB here
                    // so it caches it. But since we just have raw JSON here, we can let 
                    // the frontend send a /progress/save or we can extract it manually.
                    // Actually, it's safer to extract it quickly:
                    if (aiResponse != null && aiResponse.contains("\"content\":")) {
                        try {
                            int contentIdx = aiResponse.indexOf("\"content\":");
                            int startQuote = aiResponse.indexOf("\"", contentIdx + 10);
                            int endQuote = aiResponse.indexOf("\"", startQuote + 1);
                            
                            // A very naive JSON string extraction just to cache it:
                            if (startQuote != -1 && endQuote != -1 && endQuote > startQuote) {
                                String extractedMeaning = aiResponse.substring(startQuote + 1, endQuote);
                                // Unescape basic JSON characters
                                extractedMeaning = extractedMeaning.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\");
                                
                                if (!extractedMeaning.isEmpty()) {
                                    // Cache it in the database and Kamus memory map
                                    String english = "id".equalsIgnoreCase(lang) ? extractedMeaning.split("\n")[0].trim() : kata;
                                    String indonesian = "id".equalsIgnoreCase(lang) ? kata : extractedMeaning;
                                    
                                    kamus.addWord(english, indonesian);
                                    try (java.sql.Connection conn = DatabaseManager.getConnection();
                                         java.sql.PreparedStatement ps = conn.prepareStatement("INSERT INTO kamus (word, meaning) VALUES (?, ?)")) {
                                        ps.setString(1, english);
                                        ps.setString(2, indonesian);
                                        ps.executeUpdate();
                                    } catch (Exception ex) {
                                        ex.printStackTrace();
                                    }
                                }
                            }
                        } catch (Exception ex) {
                            ex.printStackTrace(); // Ignore extraction errors, just don't cache
                        }
                    }

                    String json = "{\"source\":\"ai\", \"raw\":" + aiResponse + "}";
                    sendJson(exchange, 200, json);
                } else {
                    String json = "{\"source\":\"local\", \"result\":\"" + escapeJson(localResponse) + "\"}";
                    sendJson(exchange, 200, json);
                }
            } catch (Exception e) { e.printStackTrace(); }
        });

        // ==========================
        // POST /dictionary/contribute — User word contribution (Round 5 Feature)
        // ==========================
        server.createContext("/dictionary/contribute", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                String english = body.getOrDefault("english", "").trim();
                String indonesian = body.getOrDefault("indonesian", "").trim();
                String example = body.getOrDefault("example_sentence", "").trim();

                if (english.isEmpty() || indonesian.isEmpty()) {
                    sendJson(exchange, 400, "{\"error\":\"English and Indonesian words are required\"}");
                    return;
                }

                // Award 10 XP instantly
                updateUserXP(userId, 10);

                // Insert into word_contributions table
                String insertSql = "INSERT INTO word_contributions (user_id, english, indonesian, example_sentence, submitted_at) VALUES (?, ?, ?, ?, ?)";
                int contributionId = -1;
                try (java.sql.Connection conn = DatabaseManager.getConnection();
                     java.sql.PreparedStatement ps = conn.prepareStatement(insertSql, java.sql.Statement.RETURN_GENERATED_KEYS)) {
                    ps.setInt(1, userId);
                    ps.setString(2, english);
                    ps.setString(3, indonesian);
                    ps.setString(4, example);
                    ps.setString(5, java.time.LocalDateTime.now().toString());
                    ps.executeUpdate();
                    
                    try (java.sql.ResultSet rs = ps.getGeneratedKeys()) {
                        if (rs.next()) contributionId = rs.getInt(1);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }

                // Background AI verification
                final int cid = contributionId;
                new Thread(() -> {
                    try {
                        String aiRes = AIService.verifyContribution(english, indonesian);
                        boolean approved = aiRes != null && aiRes.trim().toUpperCase().startsWith("YA");
                        String status = approved ? "approved" : "rejected";

                        try (java.sql.Connection conn = DatabaseManager.getConnection()) {
                            // Update status in DB
                            String updateSql = "UPDATE word_contributions SET status = ?, ai_reasoning = ? WHERE id = ?";
                            try (java.sql.PreparedStatement ps = conn.prepareStatement(updateSql)) {
                                ps.setString(1, status);
                                ps.setString(2, aiRes);
                                ps.setInt(3, cid);
                                ps.executeUpdate();
                            }
                            
                            // If approved, insert into live Kamus AND kamus table
                            if (approved) {
                                kamus.addWord(english, indonesian);
                                String insertKamus = "INSERT INTO kamus (word, meaning) VALUES (?, ?)";
                                try (java.sql.PreparedStatement ps = conn.prepareStatement(insertKamus)) {
                                    ps.setString(1, english);
                                    ps.setString(2, indonesian);
                                    ps.executeUpdate();
                                }
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }).start();

                sendJson(exchange, 200, "{\"message\":\"Contribution submitted and 10 XP awarded\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // GET /suggest — Autocomplete suggestions (English or Indonesian)
        // ==========================
        server.createContext("/suggest", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                String kata = getQueryParam(exchange, "kata");
                String lang = getQueryParam(exchange, "lang"); // "id" for Indonesian-first
                String response;
                if ("id".equalsIgnoreCase(lang)) {
                    response = kamus.suggestKataReverse(kata != null ? kata : "");
                } else {
                    response = kamus.suggestKata(kata != null ? kata : "");
                }
                sendResponse(exchange, 200, response);
            } catch (Exception e) { e.printStackTrace(); }
        });

        // ==========================
        // GET /quiz — Get random quiz questions
        // ==========================
        server.createContext("/quiz", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                String response = kamus.getRandomSoal(10);
                if (response == null || response.trim().isEmpty()) {
                    sendJson(exchange, 400, "{\"error\":\"No quiz data available\"}");
                    return;
                }
                sendResponse(exchange, 200, response);
            } catch (Exception e) { e.printStackTrace(); }
        });

        // ==========================
        // POST /quiz/submit — Record quiz result to DB
        // ==========================
        server.createContext("/quiz/submit", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                int score = parseInt(body.get("score"), 0);
                int correctAnswers = parseInt(body.get("correct_answers"), 0);
                int totalQuestions = parseInt(body.get("total_questions"), 10);
                int stars = parseInt(body.get("stars"), 0);

                // Server-side score validation: cap at maximum possible XP
                // Max XP per question is 20 (combo 5x), so max total = totalQuestions * 20
                int maxPossible = totalQuestions * 20;
                if (score > maxPossible) {
                    System.out.println("[SimpleAPI] Score clamped: " + score + " -> " + maxPossible + " (userId=" + userId + ")");
                    score = maxPossible;
                }
                if (score < 0) score = 0;

                String sql = "INSERT INTO quiz_history (user_id, score, correct_answers, total_questions, stars) VALUES (?, ?, ?, ?, ?)";
                try (Connection conn = DatabaseManager.getConnection();
                     PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setInt(1, userId);
                    ps.setInt(2, score);
                    ps.setInt(3, correctAnswers);
                    ps.setInt(4, totalQuestions);
                    ps.setInt(5, stars);
                    ps.executeUpdate();
                }

                // XP is updated exclusively via additive updateUserXP — not via /progress/save
                updateUserXP(userId, score);
                incrementUserStat(userId, "completed_quiz");
                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Quiz result saved\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /typing/submit — Record typing test result to DB
        // ==========================
        server.createContext("/typing/submit", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                int wpm = parseInt(body.get("wpm"), 0);
                int accuracy = parseInt(body.get("accuracy"), 0);
                int xpEarned = parseInt(body.get("xp_earned"), 0);

                String sql = "INSERT INTO typing_history (user_id, wpm, accuracy, xp_earned) VALUES (?, ?, ?, ?)";
                try (Connection conn = DatabaseManager.getConnection();
                     PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setInt(1, userId);
                    ps.setInt(2, wpm);
                    ps.setInt(3, accuracy);
                    ps.setInt(4, xpEarned);
                    ps.executeUpdate();
                }

                updateUserXP(userId, xpEarned);
                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Typing result saved\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /register — Create new user account
        // ==========================
        server.createContext("/register", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                String username = body.getOrDefault("username", "").trim();
                String password = body.getOrDefault("password", "").trim();
                String email = body.getOrDefault("email", "").trim();
                String city = body.getOrDefault("city", "").trim();
                String province = body.getOrDefault("province", "").trim();
                String country = body.getOrDefault("country", "Indonesia").trim();

                if (username.isEmpty() || username.length() < 3) {
                    sendJson(exchange, 400, "{\"error\":\"Username must be at least 3 characters\"}");
                    return;
                }
                if (password.isEmpty() || password.length() < 4) {
                    sendJson(exchange, 400, "{\"error\":\"Password must be at least 4 characters\"}");
                    return;
                }
                if (email.isEmpty() || !email.contains("@")) {
                    sendJson(exchange, 400, "{\"error\":\"Email is required and must be valid\"}");
                    return;
                }
                if (city.isEmpty() || province.isEmpty()) {
                    sendJson(exchange, 400, "{\"error\":\"City and Province are required\"}");
                    return;
                }
                if (userRepo.usernameExists(username)) {
                    sendJson(exchange, 409, "{\"error\":\"Username already taken\"}");
                    return;
                }

                User newUser = new User(username, email, DatabaseManager.hashPassword(password), city, province, country);
                userRepo.save(newUser);

                String token = generateToken();
                sessions.put(token, newUser.getId());
                persistSession(token, newUser.getId()); // Persist so restart doesn't invalidate session

                sendJson(exchange, 201,
                    "{\"status\":\"ok\",\"token\":\"" + token + "\",\"userId\":" + newUser.getId() +
                    ",\"username\":\"" + escapeJson(username) + "\"" +
                    ",\"level\":1,\"xp\":0,\"streak\":0" +
                    ",\"email\":\"" + escapeJson(email) + "\"" +
                    ",\"email_verified\":false}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // PUT /profile/update — Update user profile data
        // ==========================
        server.createContext("/profile/update", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("PUT") && !exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                User user = userRepo.findById(userId);
                if (user == null) {
                    sendJson(exchange, 404, "{\"error\":\"User not found\"}");
                    return;
                }

                String city = body.get("city");
                String province = body.get("province");
                String avatar = body.get("avatar");
                
                user.updateProfile(null, null, city, province, avatar);
                userRepo.save(user);

                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Profile updated\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /login — Authenticate existing user
        // ==========================
        server.createContext("/login", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                String username = body.getOrDefault("username", "").trim();
                String password = body.getOrDefault("password", "").trim();

                if (username.isEmpty() || password.isEmpty()) {
                    sendJson(exchange, 400, "{\"error\":\"Username and password required\"}");
                    return;
                }

                User user = userRepo.findByUsername(username);
                if (user == null) {
                    sendJson(exchange, 404, "{\"error\":\"User not found\"}");
                    return;
                }
                
                if (!user.login(password)) {
                    sendJson(exchange, 401, "{\"error\":\"Invalid password\"}");
                    return;
                }

                String today = java.time.LocalDate.now().toString();
                String lastLogin = user.getLastLoginDate();
                int streak = user.getStreak();
                if (!today.equals(lastLogin)) {
                    String yesterday = java.time.LocalDate.now().minusDays(1).toString();
                    if (yesterday.equals(lastLogin)) {
                        streak++;
                    } else if (lastLogin != null && !lastLogin.isEmpty() && !today.equals(lastLogin)) {
                        streak = 1;
                    } else {
                        streak = Math.max(1, streak);
                    }
                    user.setStreak(streak);
                    user.setLastLoginDate(today);
                    userRepo.save(user);
                }

                String token = generateToken();
                sessions.put(token, user.getId());
                persistSession(token, user.getId()); // Persist so restart doesn't invalidate session

                sendJson(exchange, 200,
                    "{\"status\":\"ok\",\"token\":\"" + token + "\",\"userId\":" + user.getId() +
                    ",\"username\":\"" + escapeJson(user.getUsername()) + "\"" +
                    ",\"level\":" + user.getLevel() +
                    ",\"xp\":" + user.getXp() +
                    ",\"streak\":" + user.getStreak() +
                    ",\"city\":\"" + escapeJson(user.getCity()) + "\"" +
                    ",\"province\":\"" + escapeJson(user.getProvince()) + "\"" +
                    ",\"country\":\"" + escapeJson(user.getCountry()) + "\"" +
                    ",\"avatar\":\"" + escapeJson(user.getAvatar()) + "\"" +
                    ",\"email\":\"" + escapeJson(user.getEmail() != null ? user.getEmail() : "") + "\"" +
                    ",\"email_verified\":" + (user.isEmailVerified() ? "true" : "false") + "}");

            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /logout — Invalidate session token
        // ==========================
        server.createContext("/logout", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                Map<String, String> body = parseJsonBody(exchange);
                String token = body.get("token");
                if (token != null) {
                    sessions.remove(token);
                    deletePersistedSession(token); // Remove from DB too
                }
                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Logged out\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /forgot-password — Send OTP to email
        // ==========================
        server.createContext("/forgot-password", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }
                
                Map<String, String> body = parseJsonBody(exchange);
                String email = body.get("email");
                if (email == null || email.trim().isEmpty()) {
                    sendJson(exchange, 400, "{\"error\":\"Email is required\"}");
                    return;
                }
                
                User user = userRepo.findByEmail(email);
                if (user == null) {
                    sendJson(exchange, 404, "{\"error\":\"User not found with that email\"}");
                    return;
                }

                // Generate 6-digit OTP
                String otp = String.format("%06d", new java.util.Random().nextInt(999999));
                
                // Save to password_resets table (expires in 10 mins)
                try (java.sql.Connection conn = DatabaseManager.getConnection();
                     java.sql.PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))")) {
                    ps.setString(1, email);
                    ps.setString(2, otp);
                    ps.executeUpdate();
                }

                // Send email
                EmailService.sendOtpEmail(email, otp);

                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"OTP sent to email\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /verify-otp — Verify OTP
        // ==========================
        server.createContext("/verify-otp", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                String email = body.get("email");
                String otp = body.get("otp");

                boolean isValid = false;
                try (java.sql.Connection conn = DatabaseManager.getConnection();
                     java.sql.PreparedStatement ps = conn.prepareStatement(
                        "SELECT * FROM password_resets WHERE email = ? AND otp = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1")) {
                    ps.setString(1, email);
                    ps.setString(2, otp);
                    java.sql.ResultSet rs = ps.executeQuery();
                    if (rs.next()) {
                        isValid = true;
                    }
                }

                if (isValid) {
                    // Optionally delete the OTP here, or let it be deleted when password is reset
                    sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"OTP verified\"}");
                } else {
                    sendJson(exchange, 400, "{\"error\":\"Invalid or expired OTP\"}");
                }
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /reset-password — Reset password
        // ==========================
        server.createContext("/reset-password", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                String email = body.get("email");
                String otp = body.get("otp");
                String newPassword = body.get("newPassword");

                if (newPassword == null || newPassword.length() < 4) {
                    sendJson(exchange, 400, "{\"error\":\"Password must be at least 4 characters\"}");
                    return;
                }

                // Verify OTP again
                boolean isValid = false;
                try (java.sql.Connection conn = DatabaseManager.getConnection();
                     java.sql.PreparedStatement ps = conn.prepareStatement(
                        "SELECT id FROM password_resets WHERE email = ? AND otp = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1")) {
                    ps.setString(1, email);
                    ps.setString(2, otp);
                    java.sql.ResultSet rs = ps.executeQuery();
                    if (rs.next()) {
                        isValid = true;
                        // Delete the used OTP
                        try (java.sql.PreparedStatement deletePs = conn.prepareStatement("DELETE FROM password_resets WHERE id = ?")) {
                            deletePs.setInt(1, rs.getInt("id"));
                            deletePs.executeUpdate();
                        }
                    }
                }

                if (!isValid) {
                    sendJson(exchange, 400, "{\"error\":\"Invalid or expired OTP\"}");
                    return;
                }

                User user = userRepo.findByEmail(email);
                if (user != null) {
                    String hash = DatabaseManager.hashPassword(newPassword);
                    userRepo.updatePassword(user.getId(), hash);
                    sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Password reset successful\"}");
                } else {
                    sendJson(exchange, 404, "{\"error\":\"User not found\"}");
                }
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /send-verification — Send email verification OTP
        // ==========================
        server.createContext("/send-verification", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                User user = userRepo.findById(userId);
                if (user == null || user.getEmail() == null || user.getEmail().isEmpty()) {
                    sendJson(exchange, 400, "{\"error\":\"User or email not found\"}");
                    return;
                }

                if (user.isEmailVerified()) {
                    sendJson(exchange, 400, "{\"error\":\"Email is already verified\"}");
                    return;
                }

                String otp = String.format("%06d", new java.util.Random().nextInt(999999));
                
                try (java.sql.Connection conn = DatabaseManager.getConnection();
                     java.sql.PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO email_verifications (email, otp, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))")) {
                    ps.setString(1, user.getEmail());
                    ps.setString(2, otp);
                    ps.executeUpdate();
                }

                EmailService.sendVerificationEmail(user.getEmail(), otp);
                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Verification OTP sent\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /verify-email — Verify email using OTP
        // ==========================
        server.createContext("/verify-email", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                String otp = body.get("otp");
                User user = userRepo.findById(userId);
                if (user == null || user.getEmail() == null) {
                    sendJson(exchange, 400, "{\"error\":\"User not found\"}");
                    return;
                }

                boolean isValid = false;
                try (java.sql.Connection conn = DatabaseManager.getConnection();
                     java.sql.PreparedStatement ps = conn.prepareStatement(
                        "SELECT id FROM email_verifications WHERE email = ? AND otp = ? AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1")) {
                    ps.setString(1, user.getEmail());
                    ps.setString(2, otp);
                    java.sql.ResultSet rs = ps.executeQuery();
                    if (rs.next()) {
                        isValid = true;
                        try (java.sql.PreparedStatement deletePs = conn.prepareStatement("DELETE FROM email_verifications WHERE id = ?")) {
                            deletePs.setInt(1, rs.getInt("id"));
                            deletePs.executeUpdate();
                        }
                    }
                }

                if (!isValid) {
                    sendJson(exchange, 400, "{\"error\":\"Invalid or expired OTP\"}");
                    return;
                }

                user.setEmailVerified(true);
                userRepo.save(user);

                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Email verified successfully\"}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // GET /progress — Get user progress from DB
        // ==========================
        server.createContext("/progress", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;

                String token = getQueryParam(exchange, "token");
                int userId = getUserIdFromToken(token);
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                User user = userRepo.findById(userId);
                if (user == null) {
                    sendJson(exchange, 404, "{\"error\":\"User not found\"}");
                    return;
                }

                sendJson(exchange, 200,
                    "{\"userId\":" + user.getId() +
                    ",\"username\":\"" + escapeJson(user.getUsername()) + "\"" +
                    ",\"level\":" + user.getLevel() +
                    ",\"xp\":" + user.getXp() +
                    ",\"streak\":" + user.getStreak() +
                    ",\"city\":\"" + escapeJson(user.getCity()) + "\"" +
                    ",\"province\":\"" + escapeJson(user.getProvince()) + "\"" +
                    ",\"country\":\"" + escapeJson(user.getCountry()) + "\"" +
                    ",\"avatar\":\"" + escapeJson(user.getAvatar()) + "\"" +
                    ",\"email\":\"" + escapeJson(user.getEmail() != null ? user.getEmail() : "") + "\"" +
                    ",\"email_verified\":" + (user.isEmailVerified() ? "true" : "false") + "}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // POST /progress/save — Save user progress to DB
        // ==========================
        server.createContext("/progress/save", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                    sendJson(exchange, 405, "{\"error\":\"Method not allowed\"}");
                    return;
                }

                Map<String, String> body = parseJsonBody(exchange);
                int userId = getUserIdFromToken(body.get("token"));
                if (userId <= 0) {
                    sendJson(exchange, 401, "{\"error\":\"Not authenticated\"}");
                    return;
                }

                User user = userRepo.findById(userId);
                if (user == null) {
                    sendJson(exchange, 404, "{\"error\":\"User not found\"}");
                    return;
                }

                // XP is NOT updated here to avoid overwrite/double-count race condition.
                // All XP changes flow exclusively through /quiz/submit and /typing/submit (additive).
                // /progress/save only persists streak (and nothing else from the browser).
                if (body.containsKey("streak")) user.setStreak(parseInt(body.get("streak"), user.getStreak()));
                user.setLevel((user.getXp() / 100) + 1);

                userRepo.save(user);

                sendJson(exchange, 200, "{\"status\":\"ok\",\"message\":\"Progress saved\",\"level\":" + user.getLevel() + "}");
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // GET /leaderboard — Regional leaderboard (city/province/country)
        // ==========================
        server.createContext("/leaderboard", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;

                String scope = getQueryParam(exchange, "scope");  // city | province | country
                String location = getQueryParam(exchange, "location");
                String limitStr = getQueryParam(exchange, "limit");
                int limit = parseInt(limitStr, 20);
                if (limit > 50) limit = 50;

                if (scope == null) scope = "country";

                List<User> users;
                switch (scope.toLowerCase()) {
                    case "city":
                        users = userRepo.findLeaderboardByCity(location != null ? location : "", limit);
                        break;
                    case "province":
                        users = userRepo.findLeaderboardByProvince(location != null ? location : "", limit);
                        break;
                    default: // country
                        users = userRepo.findLeaderboardByCountry(location != null ? location : "Indonesia", limit);
                        break;
                }

                StringBuilder json = new StringBuilder();
                json.append("{\"scope\":\"").append(escapeJson(scope)).append("\"");
                json.append(",\"location\":\"").append(escapeJson(location != null ? location : "Indonesia")).append("\"");
                json.append(",\"rankings\":[");
                for (int i = 0; i < users.size(); i++) {
                    User u = users.get(i);
                    if (i > 0) json.append(",");
                    json.append("{\"rank\":").append(i + 1)
                        .append(",\"username\":\"").append(escapeJson(u.getUsername())).append("\"")
                        .append(",\"level\":").append(u.getLevel())
                        .append(",\"xp\":").append(u.getXp())
                        .append(",\"streak\":").append(u.getStreak())
                        .append(",\"city\":\"").append(escapeJson(u.getCity())).append("\"")
                        .append(",\"province\":\"").append(escapeJson(u.getProvince())).append("\"")
                        .append(",\"country\":\"").append(escapeJson(u.getCountry())).append("\"")
                        .append("}");
                }
                json.append("]}");

                sendJson(exchange, 200, json.toString());
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        // ==========================
        // GET /ai — AI word explanation
        // ==========================
        server.createContext("/ai", exchange -> {
            try {
                addCorsHeaders(exchange);
                if (handleOptions(exchange)) return;
                String kata = getQueryParam(exchange, "kata");
                if (kata == null || kata.trim().isEmpty()) kata = "word";
                String response = AIService.askAI("Jelaskan arti kata bahasa Inggris ini secara singkat dalam bahasa Indonesia: " + kata);
                sendJson(exchange, 200, response);
            } catch (Exception e) {
                try { sendJson(exchange, 500, "{\"error\":\"" + escapeJson(e.getMessage()) + "\"}"); } catch (Exception ex) {}
            }
        });

        server.start();
        System.out.println("=================================");
        System.out.println("SERVER JALAN: http://localhost:8091");
        System.out.println("Endpoints: /cari /suggest /quiz /quiz/submit");
        System.out.println("           /register /login /logout");
        System.out.println("           /progress /progress/save");
        System.out.println("           /typing/submit /leaderboard /ai");
        System.out.println("=================================");
    }

    // ===== Helper methods =====

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization, ngrok-skip-browser-warning");
    }

    private static boolean handleOptions(HttpExchange exchange) throws Exception {
        if (exchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
            exchange.sendResponseHeaders(204, -1);
            return true;
        }
        return false;
    }

    private static void sendResponse(HttpExchange exchange, int status, String body) throws Exception {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private static void sendJson(HttpExchange exchange, int status, String json) throws Exception {
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        sendResponse(exchange, status, json);
    }

    private static String getQueryParam(HttpExchange exchange, String paramName) {
        URI uri = exchange.getRequestURI();
        String query = uri.getQuery();
        if (query == null) return null;
        for (String part : query.split("&")) {
            if (part.startsWith(paramName + "=")) {
                try {
                    return URLDecoder.decode(part.substring(paramName.length() + 1), "UTF-8");
                } catch (Exception e) {
                    return part.substring(paramName.length() + 1);
                }
            }
        }
        return null;
    }

    private static String readBody(HttpExchange exchange) throws Exception {
        InputStream is = exchange.getRequestBody();
        return new String(is.readAllBytes(), StandardCharsets.UTF_8);
    }

    private static Map<String, String> parseJsonBody(HttpExchange exchange) throws Exception {
        String raw = readBody(exchange);
        Map<String, String> result = new HashMap<>();
        raw = raw.trim();
        if (raw.startsWith("{")) raw = raw.substring(1);
        if (raw.endsWith("}")) raw = raw.substring(0, raw.length() - 1);
        for (String pair : raw.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)")) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) {
                String k = kv[0].trim().replaceAll("\"", "");
                String v = kv[1].trim().replaceAll("^\"|\"$", "");
                result.put(k, v);
            }
        }
        return result;
    }

    private static int getUserIdFromToken(String token) {
        if (token == null || token.isEmpty()) return -1;
        return sessions.getOrDefault(token, -1);
    }

    private static void updateUserXP(int userId, int xpAmount) {
        if (xpAmount <= 0) return;
        String sql = "UPDATE users SET xp = xp + ?, level = ((xp + ?) / 100) + 1 WHERE id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, xpAmount);
            ps.setInt(2, xpAmount);
            ps.setInt(3, userId);
            ps.executeUpdate();
        } catch (Exception e) {
            System.err.println("[SimpleAPI] updateUserXP error: " + e.getMessage());
        }
    }

    private static void incrementUserStat(int userId, String column) {
        String sql = "UPDATE progress SET " + column + " = " + column + " + 1 WHERE user_id = ?";
        try (Connection conn = DatabaseManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            int affected = ps.executeUpdate();
            if (affected == 0) {
                String insert = "INSERT OR IGNORE INTO progress (user_id, " + column + ") VALUES (?, 1)";
                try (PreparedStatement ps2 = conn.prepareStatement(insert)) {
                    ps2.setInt(1, userId);
                    ps2.executeUpdate();
                }
            }
        } catch (Exception e) {
            System.err.println("[SimpleAPI] incrementUserStat error: " + e.getMessage());
        }
    }

    private static int parseInt(String s, int fallback) {
        try { return Integer.parseInt(s); } catch (Exception e) { return fallback; }
    }

    private static String generateToken() {
        return java.util.UUID.randomUUID().toString().replace("-", "");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
