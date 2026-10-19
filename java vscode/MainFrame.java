/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import javax.swing.*;

public class MainFrame extends JFrame {

    public MainFrame() {
        setTitle("Legacy GUI (Non-Aktif)");
        setSize(400, 200);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        JLabel label = new JLabel(
            "<html><center>GUI lama sudah tidak digunakan.<br>" +
            "Gunakan versi Web (index.html)</center></html>",
            SwingConstants.CENTER
        );

        add(label);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            new MainFrame().setVisible(true);
        });
    }
}

