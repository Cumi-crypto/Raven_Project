/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import java.util.*;
import java.sql.*;

public class Kamus {

    ArrayList<Word> daftarKata = new ArrayList<>();
    HashMap<String, String> mapKamus = new HashMap<>();
    HashMap<String, ArrayList<String>> prefixMap = new HashMap<>();

    // ==========================
    // TAMBAH DATA
    // ==========================
    public void TambahKata(String eng, String indo) {

        daftarKata.add(new Word(eng, indo));
        mapKamus.put(eng.toLowerCase(), indo);

        // PREFIX INDEX (untuk suggest cepat)
        String prefix = eng.substring(0, 1).toLowerCase();

        prefixMap.putIfAbsent(prefix, new ArrayList<>());
        prefixMap.get(prefix).add(eng);
    }

    // ==========================
    // LOAD DATABASE
    // ==========================
    public void loadDariDatabase() {

        try {
            Class.forName("org.sqlite.JDBC");

            Connection conn = DriverManager.getConnection("jdbc:sqlite:kamus.db");

            Statement st = conn.createStatement();
            ResultSet rs = st.executeQuery("SELECT * FROM kamus");

            int count = 0;

            while (rs.next()) {

                String eng = rs.getString("word");
                String indo = rs.getString("meaning");

                TambahKata(eng, indo);

                count++;
            }

            conn.close();

            System.out.println("=================================");
            System.out.println("DB dimuat: " + count);
            System.out.println("MAP SIZE: " + mapKamus.size());
            System.out.println("=================================");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ==========================
    // CARI
    // ==========================
    public String cariKataGUI(String kata) {

        if (kata == null) return "Input kosong";

        String hasil = mapKamus.get(kata.toLowerCase());

        if (hasil != null) {
            return "Arti: " + hasil;
        } else {
            return "Kata tidak ditemukan";
        }
    }

    // ==========================
    // SUGGEST (OPTIMIZED)
    // ==========================
    public String suggestKata(String input) {

        if (input == null || input.isEmpty()) return "";

        String prefix = input.substring(0,1).toLowerCase();

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

        if (hasil.length() == 0) {
            return "Tidak ada saran";
        }

        return "Saran:\n" + hasil.toString();
    }

    // ==========================
    // QUIZ
    // ==========================
    public String getRandomSoal(int jumlah) {

        StringBuilder hasil = new StringBuilder();

        Random rand = new Random();

        for (int i = 0; i < jumlah; i++) {

            int index = rand.nextInt(daftarKata.size());
            Word w = daftarKata.get(index);

            hasil.append(w.english)
                 .append(",")
                 .append(w.indonesia)
                 .append(";");
        }

        return hasil.toString();
    }
}
