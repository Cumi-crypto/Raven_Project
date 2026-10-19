/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

public class AIService {

    private static final String API_KEY = "ISI_API_KEY_KAMU";

    public static String askAI(String prompt) {

        try {
            URL url = new URL("https://openrouter.ai/api/v1/chat/completions");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setRequestMethod("POST");
            conn.setDoOutput(true);

            // HEADER
            conn.setRequestProperty("Authorization", "Bearer " + API_KEY.trim());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("HTTP-Referer", "http://localhost");
            conn.setRequestProperty("X-Title", "LanguageApp");

            // 🔥 MODEL SUDAH DIGANTI (PASTI JALAN)
            String body = "{"
                    + "\"model\":\"openai/gpt-3.5-turbo\","
                    + "\"messages\":[{\"role\":\"user\",\"content\":\"" + prompt + "\"}]"
                    + "}";

            OutputStream os = conn.getOutputStream();
            os.write(body.getBytes("UTF-8"));
            os.flush();
            os.close();

            int status = conn.getResponseCode();

            InputStream is = (status == 200)
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            BufferedReader br = new BufferedReader(new InputStreamReader(is));

            String line;
            StringBuilder response = new StringBuilder();

            while ((line = br.readLine()) != null) {
                response.append(line);
            }

            br.close();

            System.out.println("STATUS: " + status);
            System.out.println("AI RESPONSE: " + response.toString());

            return response.toString();

        } catch (Exception e) {
            e.printStackTrace();
            return "AI Exception: " + e.getMessage();
        }
    }
}
