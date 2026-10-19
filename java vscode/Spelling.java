/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

public class Spelling {

    public String tampilHurufGUI(String kata) {
        String hasil = "Spelling: ";

        for (int i = 0; i < kata.length(); i++) {
            hasil += Character.toUpperCase(kata.charAt(i));

            if (i < kata.length() - 1) {
                hasil += " - ";
            }
        }

        return hasil;
    }
}
