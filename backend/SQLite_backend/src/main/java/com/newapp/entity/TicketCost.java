package com.newapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ticket_costs")
public class TicketCost {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "ticket_id")
    private Integer ticketId;
    
    @Column(name = "ticket_name")
    private String ticketName;
    
    @Column(name = "cost")
    private Double cost;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
}