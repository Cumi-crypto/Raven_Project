package App;

/**
 * Challenge — Abstract base class for all learning challenges (Quiz, TypingSession).
 * Demonstrates inheritance and abstraction in OOP design.
 *
 * Concrete subclasses: Quiz, TypingSession
 */
public abstract class Challenge {

    /** Score accumulated during this challenge session */
    protected int score;

    /** XP reward to be granted upon completing the challenge */
    protected int xpReward;

    /** Timestamp when this challenge session started */
    protected long startTime;

    /** Whether this challenge has been completed */
    protected boolean completed;

    public Challenge() {
        this.score = 0;
        this.xpReward = 0;
        this.completed = false;
    }

    // ===== Abstract methods — subclasses must implement =====

    /**
     * Start the challenge session. Sets up initial state.
     */
    public abstract void start();

    /**
     * Evaluate a user response and update score accordingly.
     * @param input The user's answer or typed input
     * @return true if the input was correct/valid, false otherwise
     */
    public abstract boolean evaluate(String input);

    /**
     * Calculate and return the final XP reward for this session.
     * @return XP amount to award
     */
    public abstract int calculateXP();

    // ===== Shared concrete methods =====

    public int getScore() {
        return score;
    }

    public int getXpReward() {
        return xpReward;
    }

    public boolean isCompleted() {
        return completed;
    }

    public long getStartTime() {
        return startTime;
    }

    /**
     * Reset the challenge to its initial state.
     */
    public void reset() {
        this.score = 0;
        this.xpReward = 0;
        this.completed = false;
        this.startTime = 0;
    }

    @Override
    public String toString() {
        return getClass().getSimpleName() + " [score=" + score + ", xpReward=" + xpReward + ", completed=" + completed + "]";
    }
}
