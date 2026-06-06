package com.newapp.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Protège toutes les routes /api/admin/** (étape 1.a).
 *
 * Règle :
 *  - les requêtes vers /api/admin/** doivent porter un en-tête
 *    "X-Auth-Token" contenant un token valide (délivré par /api/auth/login) ;
 *  - sinon -> 401 Unauthorized ;
 *  - les requêtes OPTIONS (pré-vol CORS) passent toujours.
 *
 * Les autres routes (/, /api/health, /api/auth/**) ne sont pas filtrées.
 */
@Component
@Order(1)
public class BackofficeAuthFilter extends OncePerRequestFilter {

    private static final String PROTECTED_PREFIX = "/api/admin/";
    private static final String HEADER = "X-Auth-Token";

    private final TokenService tokenService;

    public BackofficeAuthFilter(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // On ne filtre QUE les routes protégées.
        return !request.getRequestURI().startsWith(PROTECTED_PREFIX);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Laisser passer le pré-vol CORS
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = request.getHeader(HEADER);
        if (!tokenService.isValid(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(
                    "{\"error\":\"Acces non autorise. Veuillez vous authentifier avec le code.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
