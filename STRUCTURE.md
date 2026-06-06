# NewApp — Structure du projet (BackOffice)

Stack : **Spring Boot** (backend, API JSON + SQLite) + **Vue/Vite** (frontend, le projet existant).

```
newapp/
├── backend/                                  # === Spring Boot ===
│   ├── pom.xml                               # deps: web, data-jpa, sqlite-jdbc,
│   │                                         #       hibernate-community-dialects,
│   │                                         #       commons-csv, validation
│   ├── src/main/java/com/newapp/
│   │   ├── NewAppApplication.java
│   │   │
│   │   ├── config/
│   │   │   ├── CorsConfig.java               # autorise le front Vite (localhost:5173)
│   │   │   ├── SecurityConfig.java           # protège /api/admin/** par code unique
│   │   │   └── GlpiProperties.java           # url/client_id/secret de l'API GLPI
│   │   │
│   │   ├── security/                          # === Protection BackOffice (1.a) ===
│   │   │   ├── AuthController.java            # POST /api/auth  (vérifie le code unique)
│   │   │   ├── AccessTokenService.java        # génère/valide un token de session
│   │   │   └── BackofficeAuthFilter.java      # filtre les routes protégées
│   │   │
│   │   ├── domain/                            # === Entités JPA (fixées d'après les CSV) ===
│   │   │   ├── ElementType.java               # type d'élément (Computer, Monitor) -> dashboard
│   │   │   ├── Element.java                   # Feuille 1 : parc informatique
│   │   │   ├── Ticket.java                    # Feuille 2 : tickets (N-N avec Element)
│   │   │   └── TicketCost.java                # Feuille 3 : coûts/temps (1-N depuis Ticket)
│   │   │
│   │   ├── repository/                        # Spring Data JPA
│   │   │   ├── ElementTypeRepository.java
│   │   │   ├── ElementRepository.java
│   │   │   ├── TicketRepository.java
│   │   │   └── TicketCostRepository.java
│   │   │
│   │   ├── dto/                               # objets JSON échangés avec le front
│   │   │   ├── DashboardDto.java
│   │   │   ├── ImportResultDto.java
│   │   │   ├── ElementDto.java
│   │   │   └── TicketDto.java
│   │   │
│   │   ├── service/
│   │   │   ├── ImportService.java            # (1.c) parse 3 CSV + décompresse ZIP images
│   │   │   ├── ResetService.java             # (1.b) vide les tables + supprime images
│   │   │   ├── DashboardService.java         # (1.d) compte éléments & tickets par type
│   │   │   ├── ElementService.java
│   │   │   ├── TicketService.java            # (1.e) lit les tickets depuis SQLite + co\u00fbts
│   │   │   └── GlpiClient.java               # [ExistingApp, PLUS TARD] push vers API GLPI
│   │   │
│   │   └── controller/                       # === API REST JSON ===
│   │       ├── AdminController.java           # POST /api/admin/reset            (1.b)
│   │       ├── ImportController.java          # POST /api/admin/import           (1.c)
│   │       ├── DashboardController.java       # GET  /api/admin/dashboard        (1.d)
│   │       └── TicketController.java          # GET  /api/admin/tickets , /{id}  (1.e) <- SQLite
│   │
│   └── src/main/resources/
│       ├── application.yml                    # datasource SQLite + config GLPI
│       └── storage/
│           └── images/                        # images extraites du ZIP
│
├── frontend/                                  # === Vue (votre app Vite existante) ===
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router/
│       │   └── index.js                       # routes + guard "backoffice protégé" (1.a)
│       ├── services/
│       │   ├── api.js                         # axios -> backend Spring (intercepteur token)
│       │   └── auth.js                        # login par code, stockage token
│       ├── stores/                            # (Pinia) état auth + données
│       │   └── auth.js
│       ├── components/
│       │   └── backoffice/                    # cartes dashboard, tableau, etc.
│       └── views/
│           └── backoffice/
│               ├── LoginView.vue              # (1.a) code unique pré-rempli par défaut
│               ├── DashboardView.vue          # (1.d)
│               ├── ImportView.vue             # (1.c) upload des 4 fichiers
│               ├── ResetView.vue              # (1.b) bouton réinitialiser
│               ├── TicketsView.vue            # (1.e) liste des tickets
│               └── TicketDetailView.vue       # (1.e) la "fiche" d'un ticket
│
└── data/
    └── newapp.sqlite                          # fichier base SQLite (créé au 1er lancement)
```

## Décisions actées (Jour 1 — BackOffice)

- **Backend** : Spring Boot — **Source de vérité = SQLite** (les 4 entités).
- **Tickets du BackOffice = tickets du CSV** (Feuilles 2 & 3), PAS l'API GLPI.
- **Code unique** d'accès BackOffice : `admin` (pré-rempli par défaut dans le formulaire).
- `GlpiClient` (OAuth2 déjà réalisé) : **hors périmètre Jour 1**, réservé à
  **ExistingApp** (pousser plus tard les données vers GLPI pour qu'elles y soient visibles).

## Cartographie énoncé → composants

| Demande énoncé (Jour 1, BackOffice) | Backend | Frontend |
|---|---|---|
| 1.a Protéger le back office (code unique) | `SecurityConfig`, `AuthController` | `LoginView`, router guard |
| 1.b Bouton réinitialiser les données | `AdminController` + `ResetService` | `ResetView` |
| 1.c Import 3 CSV + 1 ZIP images | `ImportController` + `ImportService` | `ImportView` |
| 1.d Dashboard (éléments + tickets par type) | `DashboardController` + `DashboardService` | `DashboardView` |
| 1.e Liste tickets + fiche | `TicketController` + `GlpiClient` | `TicketsView`, `TicketDetailView` |
```
```
