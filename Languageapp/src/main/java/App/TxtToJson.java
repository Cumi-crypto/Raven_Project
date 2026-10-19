/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import java.io.*;

public class TxtToJson {

    public static void main(String[] args) {

        try {
            BufferedReader br = new BufferedReader(new FileReader("kamus.txt"));
            BufferedWriter bw = new BufferedWriter(new FileWriter("kamus.json"));

            bw.write("[\n");

            String line;
            boolean first = true;

            while ((line = br.readLine()) != null) {

                if (line.trim().isEmpty()) continue;

                String[] parts = line.split(",");

                if (parts.length == 2) {

                    String eng = parts[0].trim().toLowerCase();
                    String indo = parts[1].trim();

                    if (!first) bw.write(",\n");

                    bw.write("  {\"word\":\"" + eng + "\", \"meaning\":\"" + indo + "\"}");

                    first = false;
                }
            }

            bw.write("\n]");
            br.close();
            bw.close();

            System.out.println("JSON berhasil dibuat!");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
