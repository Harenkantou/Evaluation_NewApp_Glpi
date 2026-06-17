package com.newapp.controller;

import com.newapp.entity.KanbanConfig;
import com.newapp.repository.KanbanConfigRepository;
import com.newapp.repository.TicketCostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/kanban")
@CrossOrigin(origins = "http://localhost:5173")
public class KanbanConfigController {

    @Autowired
    private KanbanConfigRepository repository;

    @Autowired
    private TicketCostRepository ticketCostRepository;

    // Valeurs par défaut des 3 statuts
    private List<KanbanConfig> getDefaults() {
        return List.of(
            buildConfig(1, "#FFD700", "vaovao",    "Nouveau"),
            buildConfig(2, "#87CEEB", "efa manao", "Attribué"),
            buildConfig(6, "#90EE90", "vita",      "Clos")
        );
    }

    private KanbanConfig buildConfig(int statusId, String color, String labelMg, String labelFr) {
        KanbanConfig config = new KanbanConfig();
        config.setStatusId(statusId);
        config.setColor(color);
        config.setLabelMg(labelMg);
        config.setLabelFr(labelFr);
        return config;
    }

    // GET /api/kanban/settings
    @GetMapping("/settings")
    public List<KanbanConfig> getSettings() {
        List<KanbanConfig> settings = repository.findAll();
        // Si la base est vide, initialiser avec les valeurs par défaut
        if (settings.isEmpty()) {
            return repository.saveAll(getDefaults());
        }
        return settings;
    }

    // GET /api/kanban
    @GetMapping("/")
    public String root() {
        return "Backend is running. Use /api/kanban/settings";
    }

    // PUT /api/kanban/settings
    @PutMapping("/settings")
    public List<KanbanConfig> saveSettings(@RequestBody List<KanbanConfig> settings) {
        return repository.saveAll(settings);
    }

    // POST /api/kanban/reset
    @PostMapping("/reset")
    public List<KanbanConfig> resetSettings() {
        ticketCostRepository.deleteAll();
        repository.deleteAll();
        return repository.saveAll(getDefaults());
    }
}
