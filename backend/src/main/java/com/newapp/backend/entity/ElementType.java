package com.newapp.backend.entity;

import jakarta.persistence.*;

/**
 * Type d'élément (déduit de Feuille 1, colonne Item_Type) : Computer, Monitor, ...
 * Sert au "détail par type" du dashboard.
 */
@Entity
@Table(name = "element_type")
public class ElementType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    public ElementType() {
    }

    public ElementType(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
