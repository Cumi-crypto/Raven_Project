/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import java.io.*;
import java.util.HashSet;

public class CleanDataset {

    public static void main(String[] args) {

        try {
            BufferedReader br = new BufferedReader(new FileReader("ind.txt"));
            BufferedWriter bw = new BufferedWriter(new FileWriter("kamus_clean.txt"));

            String line;
            HashSet<String> unique = new HashSet<>();

            while ((line = br.readLine()) != null) {

                if (line.trim().isEmpty()) continue;

                String[] parts = line.split("\t");

                if (parts.length >= 2) {

                    String eng = parts[0].trim().toLowerCase().replace(".", "");
                    String indo = parts[1].trim().toLowerCase().replace(".", "");

                    String pair = eng + "," + indo;

                    if (!unique.contains(pair)) {
                        unique.add(pair);
                        bw.write(pair);
                        bw.newLine();
                    }
                }
            }

            br.close();
            bw.close();

            System.out.println("Clean selesai: " + unique.size());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}