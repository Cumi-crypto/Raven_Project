/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package App;

public class Block {

    String data;
    String previousHash;
    String hash;

    public Block(String data, String previousHash) {
        this.data = data;
        this.previousHash = previousHash;
        this.hash = generateHash();
    }

    public String generateHash() {
        return Integer.toString((data + previousHash).hashCode());
    }
}
