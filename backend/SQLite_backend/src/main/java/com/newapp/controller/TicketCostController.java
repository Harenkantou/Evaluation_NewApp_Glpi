// src/main/java/com/newapp/controller/TicketCostController.java
package com.newapp.controller;

import com.newapp.entity.TicketCost;
import com.newapp.repository.TicketCostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/ticket-costs")
@CrossOrigin(origins = "http://localhost:5173")
public class TicketCostController {

    @Autowired
    private TicketCostRepository repository;

    // ─── GET : Tous les coûts ─────────────────────────────────
    // GET /api/ticket-costs
    @GetMapping
    public List<TicketCost> getAllCosts() {
        return repository.findAll();
    }

    // ─── GET : Un coût par ID ─────────────────────────────────
    // GET /api/ticket-costs/5
    @GetMapping("/{id}")
    public ResponseEntity<TicketCost> getCost(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── GET : Coûts d'un ticket ──────────────────────────────
    // GET /api/ticket-costs/ticket/42
    @GetMapping("/ticket/{ticketId}")
    public List<TicketCost> getCostsByTicket(@PathVariable Integer ticketId) {
        return repository.findByTicketId(ticketId);
    }

    // ─── GET : Coûts d'un item ────────────────────────────────
    // GET /api/ticket-costs/item/Computer/5
    @GetMapping("/item/{itemType}/{itemId}")
    public List<TicketCost> getCostsByItem(
            @PathVariable String itemType,
            @PathVariable Integer itemId) {
        return repository.findByItemTypeAndItemId(itemType, itemId);
    }

    // ─── GET : Coûts par type d'item ──────────────────────────
    // GET /api/ticket-costs/type/Computer
    @GetMapping("/type/{itemType}")
    public List<TicketCost> getCostsByItemType(@PathVariable String itemType) {
        return repository.findByItemType(itemType);
    }

    // ─── GET : Coûts par batch (import) ───────────────────────
    // GET /api/ticket-costs/batch/import-1234567890
    @GetMapping("/batch/{batchId}")
    public List<TicketCost> getCostsByBatch(@PathVariable String batchId) {
        return repository.findByBatchId(batchId);
    }

    // ─── GET : Coûts par type ─────────────────────────────────
    // GET /api/ticket-costs/cost-type/closing
    @GetMapping("/cost-type/{costType}")
    public List<TicketCost> getCostsByType(@PathVariable String costType) {
        return repository.findByCostType(costType);
    }

    // ─── POST : Créer un coût ─────────────────────────────────
    // POST /api/ticket-costs
    @PostMapping
    public TicketCost saveCost(@RequestBody TicketCost cost) {
        if (cost.getCreatedAt() == null) {
            cost.setCreatedAt(LocalDateTime.now());
        }
        if (cost.getSource() == null) {
            cost.setSource("manual");
        }
        return repository.save(cost);
    }

    // ─── PUT : Modifier un coût ───────────────────────────────
    // PUT /api/ticket-costs/5
    @PutMapping("/{id}")
    public ResponseEntity<TicketCost> updateCost(
            @PathVariable Long id,
            @RequestBody TicketCost update) {
        
        return repository.findById(id).map(existing -> {
            if (update.getCostValue() != null) {
                existing.setCostValue(update.getCostValue());
            }
            if (update.getCostType() != null) {
                existing.setCostType(update.getCostType());
            }
            if (update.getTicketName() != null) {
                existing.setTicketName(update.getTicketName());
            }
            if (update.getItemName() != null) {
                existing.setItemName(update.getItemName());
            }
            if (update.getItemType() != null) {
                existing.setItemType(update.getItemType());
            }
            if (update.getItemId() != null) {
                existing.setItemId(update.getItemId());
            }
            return ResponseEntity.ok(repository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── DELETE : Supprimer un coût ───────────────────────────
    // DELETE /api/ticket-costs/5
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCost(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ─── DELETE : Supprimer tous les coûts d'un batch ─────────
    // DELETE /api/ticket-costs/batch/import-1234567890
    @DeleteMapping("/batch/{batchId}")
    public ResponseEntity<?> deleteBatch(@PathVariable String batchId) {
        List<TicketCost> costs = repository.findByBatchId(batchId);
        if (costs.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteAll(costs);
        return ResponseEntity.ok("Deleted " + costs.size() + " costs");
    }

    // ─── DELETE : Supprimer tous les coûts d'un ticket ────────
    // DELETE /api/ticket-costs/ticket/42
    @DeleteMapping("/ticket/{ticketId}")
    public ResponseEntity<?> deleteByTicket(@PathVariable Integer ticketId) {
        List<TicketCost> costs = repository.findByTicketId(ticketId);
        if (costs.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteAll(costs);
        return ResponseEntity.ok("Deleted " + costs.size() + " costs");
    }
}