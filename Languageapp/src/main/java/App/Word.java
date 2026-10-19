package App;

/**
 * Word — Represents a vocabulary entry in the Lexify dictionary.
 * Fields are encapsulated as private with public getters (OOP best practice).
 */
public class Word {

    private String english;
    private String indonesia;
    private String exampleSentence;

    public Word(String english, String indonesia) {
        this.english = english;
        this.indonesia = indonesia;
        this.exampleSentence = "";
    }

    public Word(String english, String indonesia, String exampleSentence) {
        this.english = english;
        this.indonesia = indonesia;
        this.exampleSentence = exampleSentence;
    }

    // ===== Getters =====

    public String getEnglish() {
        return english;
    }

    public String getIndonesia() {
        return indonesia;
    }

    public String getExampleSentence() {
        return exampleSentence;
    }

    // ===== Setters =====

    public void setEnglish(String english) {
        this.english = english;
    }

    public void setIndonesia(String indonesia) {
        this.indonesia = indonesia;
    }

    public void setExampleSentence(String exampleSentence) {
        this.exampleSentence = exampleSentence;
    }

    @Override
    public String toString() {
        return "Word{english='" + english + "', indonesia='" + indonesia + "'}";
    }
}
