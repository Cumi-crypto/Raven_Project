package App;

/**
 * Achievement — Represents a gamification badge earned by a user.
 * Implements Verifiable to demonstrate polymorphism.
 */
public class Achievement implements Verifiable {

    private int id;
    private int userId;
    private String achievementId;  // e.g. "first_quiz", "streak_7"
    private String title;
    private String description;
    private int xpReward;
    private String timestamp;
    private boolean unlocked;

    // ===== Constructors =====

    public Achievement() {
        this.unlocked = false;
    }

    public Achievement(String achievementId, String title, String description, int xpReward) {
        this();
        this.achievementId = achievementId;
        this.title = title;
        this.description = description;
        this.xpReward = xpReward;
    }

    // ===== Business Logic Methods =====

    /**
     * Unlock this achievement for the given user.
     * @param userId The user who earned this achievement
     */
    public void unlockAchievement(int userId) {
        this.userId = userId;
        this.unlocked = true;
        this.timestamp = java.time.LocalDateTime.now().toString();
    }

    // ===== Verifiable implementation =====

    /**
     * Verify that this achievement is properly formed (has required fields).
     * In a production system, this might verify against a blockchain entry.
     */
    @Override
    public boolean verify() {
        return achievementId != null && !achievementId.isEmpty()
            && title != null && !title.isEmpty()
            && userId > 0
            && unlocked;
    }

    // ===== Getters =====

    public int getId() { return id; }
    public int getUserId() { return userId; }
    public String getAchievementId() { return achievementId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public int getXpReward() { return xpReward; }
    public String getTimestamp() { return timestamp; }
    public boolean isUnlocked() { return unlocked; }

    // ===== Setters =====

    public void setId(int id) { this.id = id; }
    public void setUserId(int userId) { this.userId = userId; }
    public void setAchievementId(String achievementId) { this.achievementId = achievementId; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setXpReward(int xpReward) { this.xpReward = xpReward; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    public void setUnlocked(boolean unlocked) { this.unlocked = unlocked; }

    @Override
    public String toString() {
        return "Achievement{id='" + achievementId + "', title='" + title + "', unlocked=" + unlocked + "}";
    }
}
