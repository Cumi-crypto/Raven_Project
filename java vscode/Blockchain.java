/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

import java.util.ArrayList;

public class Blockchain {

    ArrayList<Block> chain = new ArrayList<>();

    public Blockchain() {
        chain.add(new Block("Genesis Block", "0"));
    }

    public void tambahBlock(String data) {
        Block previousBlock = chain.get(chain.size() - 1);
        Block newBlock = new Block(data, previousBlock.hash);
        chain.add(newBlock);
    }

    public String tampilkanChainGUI() {
        String hasil = "";

        for (Block b : chain) {
            hasil += b.data + "\n";
        }

        return hasil;
    }

    public String validasiChainGUI() {
        boolean valid = true;

        for (int i = 1; i < chain.size(); i++) {
            Block current = chain.get(i);
            Block previous = chain.get(i - 1);

            if (!current.hash.equals(current.generateHash())) {
                valid = false;
            }

            if (!current.previousHash.equals(previous.hash)) {
                valid = false;
            }
        }

        if (valid) {
            return "Blockchain VALID ✅";
        } else {
            return "Blockchain TIDAK VALID ❌";
        }
    }
}
