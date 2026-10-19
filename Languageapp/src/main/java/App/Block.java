package App;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

/**
 * Block — A single block in the Lexify blockchain (local activity ledger).
 * Fields are private with getters (OOP encapsulation).
 * Implements Verifiable for polymorphism.
 * Uses SHA-256 for hashing (upgraded from .hashCode() for credibility).
 *
 * Note: This is a simplified blockchain for educational/demo purposes.
 * It demonstrates the concept of chain integrity, not production-grade security.
 */
public class Block implements Verifiable {

    private String data;
    private long timestamp;
    private String previousHash;
    private String hash;

    public Block(String data, String previousHash) {
        this.data = data;
        this.previousHash = previousHash;
        this.timestamp = System.currentTimeMillis();
        this.hash = generateHash();
    }

    /**
     * Generate a SHA-256 hash of this block's content.
     * (Educational demo: upgraded from .hashCode() for better integrity demonstration)
     */
    public String generateHash() {
        String content = data + previousHash + timestamp;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            // Fallback to simple hash if SHA-256 unavailable (should never happen in Java)
            return Integer.toHexString(content.hashCode());
        }
    }

    // ===== Verifiable implementation =====

    /**
     * Verify this block's integrity by recomputing and comparing the hash.
     */
    @Override
    public boolean verify() {
        String recomputed = generateHash();
        return recomputed.equals(this.hash);
    }

    // ===== Getters =====

    public String getData() { return data; }
    public long getTimestamp() { return timestamp; }
    public String getPreviousHash() { return previousHash; }
    public String getHash() { return hash; }

    @Override
    public String toString() {
        return "Block{hash='" + hash.substring(0, 8) + "...', data='" + data + "'}";
    }
}
