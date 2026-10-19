package App;

/**
 * Spelling — Utility class to break down a word into spaced, uppercase characters.
 * Useful for phonetic spelling practice or visual emphasis on spelling.
 *
 * Example: tampilHurufGUI("apple") -> "Spelling: A - P - P - L - E"
 */
public class Spelling {

    public String tampilHurufGUI(String kata) {
        if (kata == null || kata.isEmpty()) {
            return "Spelling: ";
        }

        StringBuilder hasil = new StringBuilder("Spelling: ");

        for (int i = 0; i < kata.length(); i++) {
            hasil.append(Character.toUpperCase(kata.charAt(i)));

            if (i < kata.length() - 1) {
                hasil.append(" - ");
            }
        }

        return hasil.toString();
    }
}
