package App;

/**
 * Verifiable — Interface for entities that can be cryptographically verified.
 * Implemented by: Achievement, Block
 * Demonstrates polymorphism in OOP design.
 */
public interface Verifiable {

    /**
     * Verify the integrity or authenticity of this entity.
     * @return true if verification passes, false otherwise
     */
    boolean verify();

    /**
     * Get a human-readable verification status message.
     */
    default String getVerificationStatus() {
        return verify() ? "✅ Verified" : "❌ Verification Failed";
    }
}
