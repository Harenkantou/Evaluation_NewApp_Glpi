package com.newapp.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

/**
 * Coût / temps associé à un ticket (Feuille 3).
 * Plusieurs lignes possibles par ticket (relation N-1 vers Ticket).
 */
@Entity
@Table(name = "ticket_cost")
public class TicketCost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;              // Num_Ticket (= Ref_Ticket)

    @Column(name = "duration_second")
    private Integer durationSecond;     // Duration_second

    @Column(name = "time_cost")
    private BigDecimal timeCost;        // Time_Cost (décimale FR "8,7" -> 8.7)

    @Column(name = "fixed_cost")
    private BigDecimal fixedCost;       // Fixed_Cost

    public TicketCost() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public Integer getDurationSecond() {
        return durationSecond;
    }

    public void setDurationSecond(Integer durationSecond) {
        this.durationSecond = durationSecond;
    }

    public BigDecimal getTimeCost() {
        return timeCost;
    }

    public void setTimeCost(BigDecimal timeCost) {
        this.timeCost = timeCost;
    }

    public BigDecimal getFixedCost() {
        return fixedCost;
    }

    public void setFixedCost(BigDecimal fixedCost) {
        this.fixedCost = fixedCost;
    }
}
