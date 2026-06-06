package com.newapp.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Ticket (Feuille 2).
 * Relation N-N avec Element via la colonne "Items" du CSV.
 * Relation 1-N avec TicketCost (Feuille 3).
 */
@Entity
@Table(name = "ticket")
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ref_ticket", nullable = false, unique = true)
    private Integer refTicket;          // Ref_Ticket

    private LocalDate date;              // Date (dd/MM/yyyy)

    private LocalTime heure;            // Heure (HH:mm)

    private String type;               // Type (Incident, ...)

    private String titre;              // Titre

    @Column(columnDefinition = "TEXT")
    private String description;         // Description

    private String status;             // Status (New, ...)

    private String priority;           // Priority (Medium, ...)

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "ticket_element",
            joinColumns = @JoinColumn(name = "ticket_id"),
            inverseJoinColumns = @JoinColumn(name = "element_id")
    )
    private Set<Element> elements = new HashSet<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<TicketCost> costs = new HashSet<>();

    public Ticket() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getRefTicket() {
        return refTicket;
    }

    public void setRefTicket(Integer refTicket) {
        this.refTicket = refTicket;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public LocalTime getHeure() {
        return heure;
    }

    public void setHeure(LocalTime heure) {
        this.heure = heure;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Set<Element> getElements() {
        return elements;
    }

    public void setElements(Set<Element> elements) {
        this.elements = elements;
    }

    public Set<TicketCost> getCosts() {
        return costs;
    }

    public void setCosts(Set<TicketCost> costs) {
        this.costs = costs;
    }
}
