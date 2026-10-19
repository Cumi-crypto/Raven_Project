package App;

/**
 * UserProgress — Tracks a user's cumulative learning statistics.
 */
public class UserProgress {

    private int id;
    private int userId;
    private int completedQuiz;
    private int learnedWords;
    private int totalXp;

    public UserProgress() {
        this.completedQuiz = 0;
        this.learnedWords = 0;
        this.totalXp = 0;
    }

    public UserProgress(int userId) {
        this();
        this.userId = userId;
    }

    // ===== Business Logic =====

    public void incrementQuizCount() { this.completedQuiz++; }
    public void addLearnedWord() { this.learnedWords++; }
    public void addXP(int amount) { this.totalXp += amount; }

    // ===== Getters =====

    public int getId() { return id; }
    public int getUserId() { return userId; }
    public int getCompletedQuiz() { return completedQuiz; }
    public int getLearnedWords() { return learnedWords; }
    public int getTotalXp() { return totalXp; }

    // ===== Setters =====

    public void setId(int id) { this.id = id; }
    public void setUserId(int userId) { this.userId = userId; }
    public void setCompletedQuiz(int completedQuiz) { this.completedQuiz = completedQuiz; }
    public void setLearnedWords(int learnedWords) { this.learnedWords = learnedWords; }
    public void setTotalXp(int totalXp) { this.totalXp = totalXp; }

    @Override
    public String toString() {
        return "UserProgress{userId=" + userId + ", quizzes=" + completedQuiz + ", words=" + learnedWords + ", xp=" + totalXp + "}";
    }
}
