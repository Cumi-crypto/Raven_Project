/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.io.OutputStream;
import java.net.URI;
import java.net.URLDecoder;

public class SimpleAPI {

    public static void main(String[] args) throws Exception {

        Kamus kamus = new Kamus();
        kamus.loadDariDatabase();

        HttpServer server = HttpServer.create(new InetSocketAddress(8091), 0);

        // ==========================
        // CARI
        // ==========================
        server.createContext("/cari", exchange -> {

            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

            URI uri = exchange.getRequestURI();
            String query = uri.getQuery();

            String kata = "";

            if (query != null && query.contains("=")) {
                kata = URLDecoder.decode(query.split("=")[1], "UTF-8");
            }

            String response = kamus.cariKataGUI(kata);

            byte[] bytes = response.getBytes("UTF-8");

            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();
        });

        // ==========================
        // SUGGEST
        // ==========================
        server.createContext("/suggest", exchange -> {

            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

            URI uri = exchange.getRequestURI();
            String query = uri.getQuery();

            String kata = "";

            if (query != null && query.contains("=")) {
                kata = URLDecoder.decode(query.split("=")[1], "UTF-8");
            }

            String response = kamus.suggestKata(kata);

            byte[] bytes = response.getBytes("UTF-8");

            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();
        });

        // ==========================
        // QUIZ
        // ==========================
        server.createContext("/quiz", exchange -> {

            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

            String response = kamus.getRandomSoal(10);

            byte[] bytes = response.getBytes("UTF-8");

            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();
        });

        // ==========================
        // AI (Gemma via OpenRouter)
        // ==========================
        server.createContext("/ai", exchange -> {

            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

            URI uri = exchange.getRequestURI();
            String query = uri.getQuery();

            String kata = "word";

            if (query != null && query.contains("=")) {
                kata = URLDecoder.decode(query.split("=")[1], "UTF-8");
            }

            String response = AIService.askAI("Jelaskan arti kata: " + kata);

            byte[] bytes = response.getBytes("UTF-8");

            exchange.sendResponseHeaders(200, bytes.length);
            OutputStream os = exchange.getResponseBody();
            os.write(bytes);
            os.close();
        });

        server.start();

        System.out.println("=================================");
        System.out.println("SERVER JALAN: http://localhost:8091");
        System.out.println("=================================");
    }
}                   
