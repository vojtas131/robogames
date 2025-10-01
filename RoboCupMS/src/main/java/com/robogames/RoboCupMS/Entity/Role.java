package com.robogames.RoboCupMS.Entity;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

import com.robogames.RoboCupMS.Business.Enum.ERole;

/**
 * Entita reprezentujici vsechny dostupne uzivatelske role (Enum)
 */
@Entity
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ERole name;

    /**
     * Vytvori uzivatelskou roli
     */
    public Role() {
    }

    /**
     * Vytvori uzivatelskou roli
     * 
     * @param name Nazev role
     */
    public Role(ERole name) {
        this.name = name;
    }

    /**
     * Navrati ID uzivatleske role
     * 
     * @return ID role
     */
    public Integer getID() {
        return id;
    }

    /**
     * Navrati nazev role
     * 
     * @return Nazev role
     */
    public ERole getName() {
        return name;
    }

    /**
     * Nastavi novy nazev role
     * 
     * @param name Novy nazev role
     */
    public void setName(ERole name) {
        this.name = name;
    }

}