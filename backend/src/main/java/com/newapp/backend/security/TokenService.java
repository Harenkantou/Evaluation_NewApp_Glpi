package com.newapp.backend.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gère des tokens de session en mémoire.
 * Après saisie du bon code, on délivre un token que le frontend
 * renvoie ensuite dans l'en-tête "X-Auth-Token" pour accéder à /api/admin/**.
 *
 * Stockage en mémoire (ConcurrentHashMap) : simple et suffisant pour
 * un BackOffice mono-instance. Les tokens expirent après TTL.
 */
@Service
public class TokenService {

    /** Durée de validité d'un token : 2 heures. */
    private static final long TTL_SECONDS = 2 * 60 * 60;

    /** token -> instant d'expiration */
    private final ConcurrentHashMap<String, Instant> tokens = new ConcurrentHashMap<>();

    /** Crée un nouveau token valide. */
    public String issue() {
        String token = UUID.randomUUID().toString().replace("-", "");
        tokens.put(token, Instant.now().plusSeconds(TTL_SECONDS));
        return token;
    }

    /** Vérifie qu'un token existe et n'est pas expiré. */
    public boolean isValid(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        Instant expiry = tokens.get(token);
        if (expiry == null) {
            return false;
        }
        if (Instant.now().isAfter(expiry)) {
            tokens.remove(token); // nettoyage paresseux
            return false;
        }
        return true;
    }

    /** Invalide un token (déconnexion). */
    public void revoke(String token) {
        if (token != null) {
            tokens.remove(token);
        }
    }
}