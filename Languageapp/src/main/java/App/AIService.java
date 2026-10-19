package App;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Properties;

/**
 * AIService — Handles communication with the OpenRouter AI API.
 * API key is loaded from config.properties (NOT hardcoded in source).
 */
public class AIService {

    private static String apiKey = null;

    /**
     * Load the API key from config.properties (one-time, cached).
     */
    private static String getApiKey() {
        if (apiKey != null) return apiKey;
        try {
            Properties props = new Properties();
            // Load from the project root (where the JAR/server is run from)
            File configFile = new File("config.properties");
            if (!configFile.exists()) {
                System.err.println("[AIService] config.properties not found. Create it with: openrouter.api.key=YOUR_KEY");
                return "";
            }
            props.load(new FileInputStream(configFile));
            apiKey = props.getProperty("openrouter.api.key", "").trim();
            if (apiKey.isEmpty()) {
                System.err.println("[AIService] openrouter.api.key is empty in config.properties");
            }
        } catch (Exception e) {
            System.err.println("[AIService] Failed to load config.properties: " + e.getMessage());
            apiKey = "";
        }
        return apiKey;
    }

    public static String askAI(String prompt) {
        String key = getApiKey();
        if (key.isEmpty()) {
            return "{\"error\":\"API key not configured. Check config.properties.\"}";
        }

        try {
            URL url = new URL("https://openrouter.ai/api/v1/chat/completions");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);

            conn.setRequestProperty("Authorization", "Bearer " + key);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("HTTP-Referer", "http://localhost:8091");
            conn.setRequestProperty("X-Title", "Lexify Language App");

            // Escape prompt to avoid JSON injection
            String safePrompt = prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
            String body = "{\"model\":\"openai/gpt-3.5-turbo\","
                    + "\"messages\":[{\"role\":\"user\",\"content\":\"" + safePrompt + "\"}]}";

            OutputStream os = conn.getOutputStream();
            os.write(body.getBytes("UTF-8"));
            os.close();

            int status = conn.getResponseCode();
            InputStream is = (status == 200) ? conn.getInputStream() : conn.getErrorStream();
            BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
            br.close();

            return response.toString();

        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\":\"AI Exception: " + e.getMessage() + "\"}";
        }
    }

    /**
     * Translates a word when it's not found in the local Kamus dictionary.
     */
    public static String translateWord(String word, String lang) {
        String prompt;
        if ("id".equalsIgnoreCase(lang)) {
            prompt = "Terjemahkan kata bahasa Indonesia ini ke bahasa Inggris, dan berikan penjelasan singkat: " + word;
        } else {
            prompt = "Terjemahkan kata bahasa Inggris ini ke bahasa Indonesia, dan berikan penjelasan singkat: " + word;
        }
        return askAI(prompt);
    }

    /**
     * Verifies a user-contributed word. Returns a JSON-like string starting with true or false.
     */
    public static String verifyContribution(String english, String indonesian) {
        String prompt = "Apakah terjemahan bahasa Inggris '" + english + "' ke bahasa Indonesia '" + indonesian + "' ini akurat? Jawab HANYA dengan 'YA' atau 'TIDAK' pada awal kalimat, lalu jelaskan alasannya secara singkat.";
        return askAI(prompt);
    }
}
