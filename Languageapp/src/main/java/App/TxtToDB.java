/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import java.sql.*;
import java.io.*;

public class TxtToDB {

    public static void main(String[] args) {

        try {

            // ==========================
            // 🔧 GANTI PATH DI SINI
            // ==========================
            String txtPath = "D:/Object Oriented Program/Raven_Project/Languageapp/kamus_clean.txt";
            String dbPath  = "D:/Object Oriented Program/Raven_Project/Languageapp/kamus.db";

            // ==========================
            // 🔍 DEBUG FILE
            // ==========================
            File file = new File(txtPath);
            System.out.println("TXT PATH: " + file.getAbsolutePath());
            System.out.println("FILE EXISTS: " + file.exists());

            if (!file.exists()) {
                System.out.println("❌ File kamus_clean.txt tidak ditemukan!");
                return;
            }

            // ==========================
            // 🔍 DEBUG DB
            // ==========================
            System.out.println("DB PATH: " + dbPath);

            Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbPath);

            // ==========================
            // 📂 READ FILE
            // ==========================
            BufferedReader br = new BufferedReader(new FileReader(file));

            String line;
            String sql = "INSERT INTO kamus(word, meaning) VALUES(?, ?)";
            PreparedStatement ps = conn.prepareStatement(sql);

            int count = 0;

            while ((line = br.readLine()) != null) {

                System.out.println("READ LINE: " + line);

                if (line.trim().isEmpty()) continue;

                String[] parts = line.split(",");

                System.out.println("SPLIT LENGTH: " + parts.length);

                if (parts.length == 2) {

                    String word = parts[0].trim();
                    String meaning = parts[1].trim();

                    System.out.println("INSERT: " + word + " = " + meaning);

                    ps.setString(1, word);
                    ps.setString(2, meaning);
                    ps.executeUpdate();

                    count++;
                }
            }

            br.close();
            conn.close();

            System.out.println("=================================");
            System.out.println("✅ TOTAL DATA MASUK: " + count);
            System.out.println("=================================");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
