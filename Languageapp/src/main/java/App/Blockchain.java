package App;

import java.util.ArrayList;
import java.util.List;

/**
 * Blockchain — A simple linked chain of Block objects.
 * Used as a local activity ledger for learning events in Lexify.
 *
 * Note: This is a simplified blockchain for educational/demo purposes.
 * It demonstrates chain linking and integrity validation concepts.
 * The frontend also has a LocalLedger (JS-only) for offline activity logging.
 */
public class Blockchain {

    private List<Block> chain;

    public Blockchain() {
        chain = new ArrayList<>();
        // Genesis block — the first block in every chain
        chain.add(new Block("Genesis Block", "0"));
    }

    /**
     * Add a new block to the chain, linked to the previous block's hash.
     * @param data The activity data to record (e.g. "Quiz completed: 90%")
     */
    public void addBlock(String data) {
        Block previousBlock = chain.get(chain.size() - 1);
        Block newBlock = new Block(data, previousBlock.getHash());
        chain.add(newBlock);
    }

    /**
     * Get the full chain as a read-only list.
     */
    public List<Block> getChain() {
        return new ArrayList<>(chain); // defensive copy
    }

    /**
     * Display the chain contents as a formatted string.
     */
    public String displayChain() {
        StringBuilder sb = new StringBuilder();
        for (Block b : chain) {
            sb.append("[Block #").append(chain.indexOf(b)).append("] ")
              .append(b.getData())
              .append(" | Hash: ").append(b.getHash(), 0, 8).append("...")
              .append("\n");
        }
        return sb.toString();
    }

    /**
     * Validate the entire chain by checking hash integrity and chain links.
     * @return true if the chain is valid, false if tampered
     */
    public boolean validateChain() {
        for (int i = 1; i < chain.size(); i++) {
            Block current = chain.get(i);
            Block previous = chain.get(i - 1);

            // Verify current block's own hash
            if (!current.verify()) {
                return false;
            }

            // Verify the link to the previous block
            if (!current.getPreviousHash().equals(previous.getHash())) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get a validation status message.
     */
    public String getValidationStatus() {
        return validateChain() ? "Blockchain VALID ✅" : "Blockchain TIDAK VALID ❌";
    }

    public int size() {
        return chain.size();
    }
}
