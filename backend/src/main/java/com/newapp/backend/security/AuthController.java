package com.newapp.backend.security;

import com.newapp.backend.config.NewAppProperties;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentification du BackOffice par CODE UNIQUE (pas de login).
 *
 *  POST /api/auth/login   { "code": "admin" }   -> { "token": "..." }
 *  POST /api/auth/logout  (en-tête X-Auth-Token) -> 204
 *  GET  /api/auth/config  -> { "defaultCode": "admin" }  (pour pré-remplir le formulaire)
 *
 * Ces routes sont PUBLIQUES (non filtrées), c'est la porte d'entrée.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final NewAppProperties properties;
    private final TokenService tokenService;

    public AuthController(NewAppProperties properties, TokenService tokenService) {
        this.properties = properties;
        this.tokenService = tokenService;
    }

    public record LoginRequest(@NotBlank String code) {
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (!properties.getBackofficeCode().equals(request.code())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Code invalide"));
        }
        String token = tokenService.issue();
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "X-Auth-Token", required = false) String token) {
        tokenService.revoke(token);
        return ResponseEntity.noContent().build();
    }

    /**
     * Permet au frontend de pré-remplir le champ code par défaut,
     * conformément à l'énoncé ("mettre par défaut sur le formulaire").
     */
    @GetMapping("/config")
    public Map<String, String> config() {
        return Map.of("defaultCode", properties.getBackofficeCode());
    }
}