package com.newapp.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Routes PROTÉGÉES du BackOffice (préfixe /api/admin/**).
 * Pour l'instant un simple "ping" qui sert à vérifier que le filtre
 * de sécurité fonctionne. Les vraies routes (import, reset, dashboard,
 * tickets) viendront aux étapes suivantes.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("message", "Vous êtes authentifié sur le BackOffice");
    }
}