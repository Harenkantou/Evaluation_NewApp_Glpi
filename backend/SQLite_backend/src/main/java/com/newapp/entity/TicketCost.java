// src/main/java/com/newapp/entity/TicketCost.java
package com.newapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;          // ✅ Import manquant
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ticket_costs")
public class TicketCost {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ─── Lien ticket ─────────────────────────
    @Column(name = "ticket_id", nullable = false)
    private Integer ticketId;
    
    @Column(name = "ticket_name")
    private String ticketName;

    // ─── ✅ Lien item (AJOUTÉ pour cohérence avec le Repository) ───
    @Column(name = "item_id")
    private Integer itemId;

    @Column(name = "item_type", length = 50)
    private String itemType;  // "Computer", "Monitor", "Phone"

    @Column(name = "item_name")
    private String itemName;

    // ─── Coût ───────────────────────────────
    @Column(name = "cost_type", nullable = false, length = 50)
    private String costType;  // "opening", "closing", "reopening", "cancel", "glpi"

    @Column(name = "cost_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal costValue;

    // ─── Métadonnées ────────────────────────
    @Column(name = "batch_id", length = 50)
    private String batchId;

    @Column(name = "source", length = 20)
    private String source = "manual";  // 'manual', 'csv', 'api'

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (source == null) {
            source = "manual";
        }
    }
}