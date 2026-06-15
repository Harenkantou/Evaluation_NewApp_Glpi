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
    
    // GET /api/ticket-costs/{ticketId}
    @GetMapping("/{ticketId}")
    public List<TicketCost> getTicketCosts(@PathVariable Integer ticketId) {
        return repository.findByTicketId(ticketId);
    }
    
    // GET /api/ticket-costs
    @GetMapping
    public List<TicketCost> getAllCosts() {
        return repository.findAll();
    }
    
    // POST /api/ticket-costs
    @PostMapping
    public TicketCost saveCost(@RequestBody TicketCost cost) {
        cost.setCreatedAt(LocalDateTime.now());
        return repository.save(cost);
    }

    // PUT /api/ticket-costs/{id}
    @PutMapping("/{id}")
    public TicketCost updateCost(@PathVariable Long id, @RequestBody TicketCost costUpdate) {
        return repository.findById(id).map(existingCost -> {
            if (costUpdate.getCost() != null) {
                existingCost.setCost(costUpdate.getCost());
            }
            if (costUpdate.getTicketName() != null) {
                existingCost.setTicketName(costUpdate.getTicketName());
            }
            existingCost.setCreatedAt(LocalDateTime.now());
            return repository.save(existingCost);
        }).orElseThrow(() -> new RuntimeException("Cost not found with id: " + id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCost(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
