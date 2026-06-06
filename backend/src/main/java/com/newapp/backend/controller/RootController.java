package com.newapp.backend.controller;

import com.newapp.backend.repository.ElementRepository;
import com.newapp.backend.repository.TicketRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Endpoints publics de base : page d'accueil et health-check.
 * Ces routes restent accessibles SANS code (voir BackofficeAuthFilter).
 */
@RestController
public class RootController {

    private final ElementRepository elementRepository;
    private final TicketRepository ticketRepository;

    public RootController(ElementRepository elementRepository,
                          TicketRepository ticketRepository) {
        this.elementRepository = elementRepository;
        this.ticketRepository = ticketRepository;
    }

    @GetMapping("/")
    public String home() {
        return "NewApp backend is running";
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("service", "newapp-backend");
        body.put("database", "SQLite");
        body.put("elements", elementRepository.count());
        body.put("tickets", ticketRepository.count());
        return body;
    }
}
