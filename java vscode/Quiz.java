/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import javax.swing.JOptionPane;

public class Quiz {

    int score = 0;

    public String mulaiQuizGUI(Kamus kamus) {

        if (kamus.daftarKata.size() == 0) {
            return "Belum ada data di kamus!";
        }

        int index = (int)(Math.random() * kamus.daftarKata.size());
        Word w = kamus.daftarKata.get(index);

        String jawab = JOptionPane.showInputDialog(
            "Apa arti dari '" + w.english + "' ?"
        );

        if (jawab.equalsIgnoreCase(w.indonesia)) {
            score += 10;
            return "Benar! Score: " + score;
        } else {
            return "Salah! Jawaban: " + w.indonesia + "\nScore: " + score;
        }
    }
}
