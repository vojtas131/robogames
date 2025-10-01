package com.robogames.RoboCupMS.Entity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.robogames.RoboCupMS.Business.Enum.EScoreAggregation;

/**
 * Entita reprezentujici typ agregacni fukce pro skore z odehranych zapasu
 * (pouziva se pro vyhodnoceni)
 */
@Entity(name = "score_aggregation")
public class ScoreAggregation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private EScoreAggregation name;

    /**
     * Typ agregaci funkce skore
     */
    public ScoreAggregation() {
    }

    /**
     * Typ agregaci funkce skore
     * 
     * @param name Nazev agregaci funkce
     */
    public ScoreAggregation(EScoreAggregation name) {
        this.name = name;
    }

    /**
     * Navrati ID agregacni funkce
     * 
     * @return ID agregacni funkce
     */
    public Long getID() {
        return id;
    }

    /**
     * Navrati nazev agregacni funkce
     * 
     * @return Nazev agregaci funkce
     */
    public EScoreAggregation getName() {
        return name;
    }

    /**
     * Nastavi novy nazev agregacni funkce
     * 
     * @param name Novy nazev agregaci funkce
     */
    public void setName(EScoreAggregation name) {
        this.name = name;
    }

    /**
     * Pouziva se pro zpracovani score. Aplikuje se na kazdy odehrany zapas robota.
     * Do funkce vstupuje hodnota skore zapasu a celkoveho skore. Podle typu
     * agragacni funkce navraci
     * vyslednou hodnuto skore.
     * 
     * @param totalScore Celkove skore
     * @param score      Skore zapasu
     * @return Vysledne celkove skore
     */
    @JsonIgnore
    public float proccess(float totalScore, float score) {
        switch (this.name) {
            case MAX:
                return Math.max(totalScore, score);
            case MIN:
                return Math.min(totalScore, score);
            case SUM:
                return totalScore + score;
        }
        return totalScore;
    }

    /**
     * Navrati inicializacni hodnotu celkoveho skore (pro vypocet)
     * 
     * @return Celkove skore
     */
    @JsonIgnore
    public float getTotalScoreInitValue() {
        switch (this.name) {
            case MAX:
                return Float.MIN_VALUE;
            case MIN:
                return Float.MAX_VALUE;
            case SUM:
                return 0;
        }
        return 0;
    }

}
