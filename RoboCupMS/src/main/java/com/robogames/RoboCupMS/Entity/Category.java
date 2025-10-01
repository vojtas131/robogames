package com.robogames.RoboCupMS.Entity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

import com.robogames.RoboCupMS.Business.Enum.ECategory;

/**
 * Entita reprezentujici kategorie, ve kterych muze tym soutezit (Enum)
 */
@Entity(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ECategory name;

    /**
     * Kategorie, ve ktere mouze tym soutezit
     */
    public Category() {
    }

    /**
     * Kategorie, ve ktere mouze tym soutezit
     * 
     * @param name Nazev kategorie
     */
    public Category(ECategory name) {
        this.name = name;
    }

    /**
     * Navrati ID kategorie
     * 
     * @return ID kategorie
     */
    public Long getID() {
        return id;
    }

    /**
     * Navrati nazev kategorie
     * 
     * @return Nazev kategorie
     */
    public ECategory getName() {
        return name;
    }

    /**
     * Nastavi novy nazev kategorie
     * 
     * @param name Novy nazev
     */
    public void setName(ECategory name) {
        this.name = name;
    }

}
