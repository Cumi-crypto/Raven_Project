package App;

/**
 * Quiz — A vocabulary quiz challenge.
 * Extends the Challenge abstract class to demonstrate inheritance.
 *
 * Note: This class contains only business logic (no UI/JOptionPane).
 * The old GUI-based mulaiQuizGUI method has been removed.
 * Quiz question serving is now done via the REST API (GET /quiz).
 */
public class Quiz extends Challenge {

    private String currentQuestion;
    private String correctAnswer;
    private int totalQuestions;
    private int answeredQuestions;
    private int correctCount;

    public Quiz() {
        super();
        this.totalQuestions = 10;
    }

    public Quiz(int totalQuestions) {
        super();
        this.totalQuestions = totalQuestions;
    }

    // ===== Challenge abstract method implementations =====

    @Override
    public void start() {
        this.startTime = System.currentTimeMillis();
        this.score = 0;
        this.answeredQuestions = 0;
        this.correctCount = 0;
        this.completed = false;
    }

    /**
     * Evaluate the user's answer against the correct answer.
     * Case-insensitive, trimmed comparison.
     *
     * @param input The user's typed answer
     * @return true if the answer matches the correct answer
     */
    @Override
    public boolean evaluate(String input) {
        if (input == null || correctAnswer == null) return false;

        boolean isCorrect = input.trim().equalsIgnoreCase(correctAnswer.trim());
        answeredQuestions++;

        if (isCorrect) {
            correctCount++;
            score += 10; // Base score per correct answer
        }

        if (answeredQuestions >= totalQuestions) {
            completed = true;
            xpReward = calculateXP();
        }

        return isCorrect;
    }

    @Override
    public int calculateXP() {
        // XP based on correctness percentage: max 20 XP for a perfect quiz
        if (totalQuestions == 0) return 0;
        double pct = (double) correctCount / totalQuestions;
        return (int) Math.round(pct * 20);
    }

    // ===== Quiz-specific methods =====

    /**
     * Set the current question and its correct answer.
     */
    public void setQuestion(String question, String answer) {
        this.currentQuestion = question;
        this.correctAnswer = answer;
    }

    public String getCurrentQuestion() {
        return currentQuestion;
    }

    public String getCorrectAnswer() {
        return correctAnswer;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public int getAnsweredQuestions() {
        return answeredQuestions;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    /**
     * Get score percentage (0–100).
     */
    public double getScorePercent() {
        if (totalQuestions == 0) return 0;
        return (double) correctCount / totalQuestions * 100;
    }

    @Override
    public String toString() {
        return "Quiz [score=" + score + ", correct=" + correctCount + "/" + totalQuestions + ", xpReward=" + xpReward + "]";
    }
}
