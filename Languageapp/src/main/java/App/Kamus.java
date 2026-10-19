package App;

import java.util.*;
import java.sql.*;

/**
 * Kamus — Dictionary engine for the Lexify platform.
 * Loads vocabulary from kamus.db and supports search, suggestions, and quiz generation.
 */
public class Kamus {

    private ArrayList<Word> daftarKata = new ArrayList<>();
    private HashMap<String, String> mapKamus = new HashMap<>();       // English -> Indonesian
    private HashMap<String, ArrayList<String>> prefixMap = new HashMap<>();  // English prefix -> words

    // Reverse lookup: Indonesian -> English
    private HashMap<String, String> mapReverse = new HashMap<>();
    private HashMap<String, ArrayList<String>> prefixMapReverse = new HashMap<>();

    // Public accessor for backward compatibility
    public ArrayList<Word> getDaftarKata() { return daftarKata; }

    // ==========================
    // ADD WORD
    // ==========================
    public void addWord(String eng, String indo) {
        daftarKata.add(new Word(eng, indo));
        mapKamus.put(eng.toLowerCase(), indo);

        // Prefix index for fast English suggestions
        String prefix = eng.substring(0, 1).toLowerCase();
        prefixMap.putIfAbsent(prefix, new ArrayList<>());
        prefixMap.get(prefix).add(eng);

        // Build reverse lookup (Indonesian -> English)
        // Indonesian meanings may contain multiple synonyms separated by "/" or ","
        String[] parts = indo.split("[,/]");
        for (String part : parts) {
            String key = part.trim().toLowerCase();
            if (!key.isEmpty()) {
                mapReverse.putIfAbsent(key, eng);
                if (!key.isEmpty()) {
                    String rPrefix = String.valueOf(key.charAt(0));
                    prefixMapReverse.putIfAbsent(rPrefix, new ArrayList<>());
                    List<String> rList = prefixMapReverse.get(rPrefix);
                    if (!rList.contains(indo)) rList.add(indo);
                }
            }
        }
    }

    /** @deprecated Use addWord() instead */
    @Deprecated
    public void TambahKata(String eng, String indo) {
        addWord(eng, indo);
    }

    // ==========================
    // LOAD FROM DATABASE
    // ==========================
    public void loadDariDatabase() {
        try {
            Class.forName("org.sqlite.JDBC");
            Connection conn = DriverManager.getConnection(DatabaseManager.DB_URL);
            Statement st = conn.createStatement();
            ResultSet rs = st.executeQuery("SELECT * FROM kamus");

            int count = 0;
            while (rs.next()) {
                String eng = rs.getString("word");
                String indo = rs.getString("meaning");
                addWord(eng, indo);
                count++;
            }

            conn.close();
            System.out.println("=================================");
            System.out.println("DB dimuat: " + count + " kata");
            System.out.println("MAP SIZE: " + mapKamus.size());
            System.out.println("=================================");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ==========================
    // SEARCH WORD (English -> Indonesian)
    // ==========================
    public String cariKataGUI(String kata) {
        if (kata == null) return "Input kosong";
        String hasil = mapKamus.get(kata.toLowerCase());
        return hasil != null ? "Arti: " + hasil : "Kata tidak ditemukan";
    }

    // ==========================
    // REVERSE SEARCH (Indonesian -> English)
    // ==========================
    public String cariKataReverse(String kata) {
        if (kata == null || kata.trim().isEmpty()) return "Input kosong";
        String eng = mapReverse.get(kata.trim().toLowerCase());
        return eng != null ? "English: " + eng : "Kata tidak ditemukan";
    }

    /** @deprecated Use cariKataGUI() for now — will be refactored to searchWord() */
    public String searchWord(String kata) {
        return cariKataGUI(kata);
    }

    // ==========================
    // SUGGEST (English prefix-based)
    // ==========================
    public String suggestKata(String input) {
        if (input == null || input.isEmpty()) return "";

        String prefix = input.substring(0, 1).toLowerCase();
        ArrayList<String> list = prefixMap.get(prefix);
        if (list == null) return "Tidak ada saran";

        StringBuilder hasil = new StringBuilder();
        int count = 0;
        for (String word : list) {
            if (word.toLowerCase().startsWith(input.toLowerCase())) {
                hasil.append(word).append("\n");
                count++;
                if (count == 10) break;
            }
        }

        return hasil.length() == 0 ? "Tidak ada saran" : "Saran:\n" + hasil.toString();
    }

    // ==========================
    // SUGGEST REVERSE (Indonesian prefix-based)
    // ==========================
    public String suggestKataReverse(String input) {
        if (input == null || input.isEmpty()) return "";

        String prefix = input.substring(0, 1).toLowerCase();
        ArrayList<String> list = prefixMapReverse.get(prefix);
        if (list == null) return "Tidak ada saran";

        StringBuilder hasil = new StringBuilder();
        int count = 0;
        for (String meaning : list) {
            if (meaning.toLowerCase().startsWith(input.toLowerCase())) {
                hasil.append(meaning).append("\n");
                count++;
                if (count == 10) break;
            }
        }

        return hasil.length() == 0 ? "Tidak ada saran" : "Saran:\n" + hasil.toString();
    }

    // ==========================
    // QUIZ QUESTIONS
    // ==========================
    public String getRandomSoal(int jumlah) {
        if (daftarKata.isEmpty()) return "";

        StringBuilder hasil = new StringBuilder();
        Random rand = new Random();

        // Cap at actual size to avoid duplicate-only situation
        int actualCount = Math.min(jumlah, daftarKata.size());
        // Shuffle to avoid repetition
        List<Word> shuffled = new ArrayList<>(daftarKata);
        Collections.shuffle(shuffled, rand);

        for (int i = 0; i < actualCount; i++) {
            Word w = shuffled.get(i);
            hasil.append(w.getEnglish())
                 .append(",")
                 .append(w.getIndonesia())
                 .append(";");
        }

        return hasil.toString();
    }
}
