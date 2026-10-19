package App;

/**
 * User — Represents a registered Lexify user.
 * Includes gamification fields (level, xp, streak) and regional fields (city, province, country)
 * for the leaderboard feature.
 */
public class User {

    private int id;
    private String username;
    private String email;
    private String passwordHash;
    private int level;
    private int xp;
    private int streak;
    private String city;
    private String province;
    private String country;
    private String avatar;
    private boolean emailVerified;
    private String lastLoginDate;
    private String createdAt;

    // ===== Constructors =====

    public User() {
        this.level = 1;
        this.xp = 0;
        this.streak = 0;
        this.city = "";
        this.province = "";
        this.country = "Indonesia";
        this.avatar = "boy";
    }

    public User(String username, String passwordHash) {
        this();
        this.username = username;
        this.passwordHash = passwordHash;
    }

    public User(String username, String email, String passwordHash, String city, String province, String country) {
        this();
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
        this.city = city != null ? city : "";
        this.province = province != null ? province : "";
        this.country = country != null ? country : "Indonesia";
        this.avatar = "boy";
    }

    // ===== Business Logic Methods =====

    /**
     * Register a new user (hash the raw password before calling this).
     * @param rawPassword Plain text password (will be hashed)
     * @return true if registration is valid (username not empty, password not empty)
     */
    public boolean register(String rawPassword) {
        if (username == null || username.trim().isEmpty()) return false;
        if (rawPassword == null || rawPassword.length() < 4) return false;
        this.passwordHash = DatabaseManager.hashPassword(rawPassword);
        return true;
    }

    /**
     * Login check: verify the provided password against the stored hash.
     * @param rawPassword The plain-text password entered by the user
     * @return true if passwords match
     */
    public boolean login(String rawPassword) {
        if (rawPassword == null || passwordHash == null) return false;
        return DatabaseManager.hashPassword(rawPassword).equals(passwordHash);
    }

    /**
     * Update profile fields (username, email, city, province).
     */
    public void updateProfile(String newUsername, String newEmail, String newCity, String newProvince, String newAvatar) {
        if (newUsername != null && !newUsername.trim().isEmpty()) this.username = newUsername.trim();
        if (newEmail != null) this.email = newEmail.trim();
        if (newCity != null) this.city = newCity.trim();
        if (newProvince != null) this.province = newProvince.trim();
        if (newAvatar != null) this.avatar = newAvatar.trim();
    }

    /**
     * Add XP and recalculate level. Level = floor(xp / 100) + 1.
     * @param amount XP to add
     */
    public void addXP(int amount) {
        this.xp += amount;
        this.level = (this.xp / 100) + 1;
    }

    /**
     * Get a summary string for progress viewing.
     */
    public String viewProgress() {
        return String.format("User: %s | Level: %d | XP: %d | Streak: %d days",
            username, level, xp, streak);
    }

    // ===== Getters =====

    public int getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public int getLevel() { return level; }
    public int getXp() { return xp; }
    public int getStreak() { return streak; }
    public String getCity() { return city; }
    public String getProvince() { return province; }
    public String getCountry() { return country; }
    public String getAvatar() { return avatar; }
    public boolean isEmailVerified() { return emailVerified; }
    public String getLastLoginDate() { return lastLoginDate; }
    public String getCreatedAt() { return createdAt; }

    // ===== Setters =====

    public void setId(int id) { this.id = id; }
    public void setUsername(String username) { this.username = username; }
    public void setEmail(String email) { this.email = email; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setLevel(int level) { this.level = level; }
    public void setXp(int xp) { this.xp = xp; }
    public void setStreak(int streak) { this.streak = streak; }
    public void setCity(String city) { this.city = city; }
    public void setProvince(String province) { this.province = province; }
    public void setCountry(String country) { this.country = country; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public void setLastLoginDate(String lastLoginDate) { this.lastLoginDate = lastLoginDate; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return "User{id=" + id + ", username='" + username + "', level=" + level + ", xp=" + xp + "}";
    }
}
