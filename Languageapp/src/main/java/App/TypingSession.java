package App;

/**
 * TypingSession — A typing speed and accuracy challenge.
 * Extends the Challenge abstract class to demonstrate inheritance.
 *
 * Tracks words-per-minute (WPM) and accuracy percentage.
 * Results are submitted to the backend via POST /typing/submit.
 */
public class TypingSession extends Challenge {

    private long endTime;
    private int wpm;          // Words per minute
    private int accuracy;     // Accuracy percentage (0–100)
    private int correctChars;
    private int totalChars;

    public TypingSession() {
        super();
        this.wpm = 0;
        this.accuracy = 100;
        this.correctChars = 0;
        this.totalChars = 0;
    }

    // ===== Challenge abstract method implementations =====

    @Override
    public void start() {
        this.startTime = System.currentTimeMillis();
        this.wpm = 0;
        this.accuracy = 100;
        this.correctChars = 0;
        this.totalChars = 0;
        this.completed = false;
    }

    /**
     * Evaluate a typed word against the expected word.
     * Updates character-level correct/total counts.
     *
     * @param input Format: "typed:expected" (e.g. "hello:hello" or "helo:hello")
     * @return true if the typed word exactly matches the expected word
     */
    @Override
    public boolean evaluate(String input) {
        if (input == null || !input.contains(":")) return false;
        String[] parts = input.split(":", 2);
        String typed = parts[0];
        String expected = parts[1];

        // Count correct characters
        int min = Math.min(typed.length(), expected.length());
        int correct = 0;
        for (int i = 0; i < min; i++) {
            if (typed.charAt(i) == expected.charAt(i)) correct++;
        }
        correctChars += correct;
        totalChars += Math.max(typed.length(), expected.length());

        return typed.equals(expected);
    }

    @Override
    public int calculateXP() {
        // XP formula: wpm * accuracy factor, capped at 50
        double factor = accuracy / 100.0;
        return Math.min(50, (int) Math.round(wpm * factor * 0.5));
    }

    // ===== TypingSession-specific methods =====

    /**
     * End the session and compute final WPM and accuracy.
     */
    public void endSession() {
        this.endTime = System.currentTimeMillis();
        this.completed = true;
        this.wpm = calculateWPM();
        this.accuracy = calculateAccuracy();
        this.xpReward = calculateXP();
        this.score = wpm;
    }

    /**
     * Calculate words per minute from correct characters and elapsed time.
     * Standard: 5 chars = 1 word.
     */
    public int calculateWPM() {
        long elapsed = endTime - startTime; // in milliseconds
        if (elapsed <= 0) return 0;
        double minutes = elapsed / 60000.0;
        return (int) Math.round((correctChars / 5.0) / minutes);
    }

    /**
     * Calculate accuracy as percentage of correct characters typed.
     */
    public int calculateAccuracy() {
        if (totalChars == 0) return 100;
        return (int) Math.round((double) correctChars / totalChars * 100);
    }

    // ===== Getters =====

    public int getWpm() { return wpm; }
    public int getAccuracy() { return accuracy; }
    public long getEndTime() { return endTime; }
    public int getCorrectChars() { return correctChars; }
    public int getTotalChars() { return totalChars; }

    /** Set WPM directly (from frontend-calculated value via API). */
    public void setWpm(int wpm) { this.wpm = wpm; }

    /** Set accuracy directly (from frontend-calculated value via API). */
    public void setAccuracy(int accuracy) { this.accuracy = accuracy; }

    @Override
    public String toString() {
        return "TypingSession [wpm=" + wpm + ", accuracy=" + accuracy + "%, xpReward=" + xpReward + "]";
    }
}
