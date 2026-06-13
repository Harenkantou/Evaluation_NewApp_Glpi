# Guide de connexion — Backend, Frontend & GLPI (NewApp)

Ce guide explique comment les 3 briques du projet communiquent et comment les
démarrer ensemble. Il est basé sur le code réel de la branche `feature/J2_FrontOffice`.

---

## 1. Architecture générale

Il y a **3 composants** :

```
┌─────────────────────────┐        proxy Vite           ┌──────────────────────┐
│  Frontend Vue (Vite)    │  /glpi-api  ───────────────▶ │  GLPI (api.php  v2)   │
│  newapp_Glpi            │  /glpi-legacy ─────────────▶ │  GLPI (apirest.php v1)│
│  http://localhost:5173  │                              │  http://glpi.local    │
│                         │  axios  http://localhost:8080│                      │
│                         │ ───────────────────────────▶ ┌──────────────────────┐
└─────────────────────────┘                              │ Backend Spring Boot   │
                                                          │ backend/SQLite_backend│
                                                          │ http://localhost:8080 │
                                                          │ SQLite : kanban.db    │
                                                          └──────────────────────┘
```

- **Frontend Vue** (`newapp_Glpi/`) : l'application (BackOffice + FrontOffice + Kanban).
- **Backend Spring Boot** (`backend/SQLite_backend/`) : stocke UNIQUEMENT la
  configuration du Kanban (couleurs + libellés des statuts) dans une base SQLite
  `kanban.db`.
- **GLPI** (externe, `http://glpi.local`) : le vrai système de tickets/parc.
  Le frontend l'appelle **directement** (à travers le proxy Vite), pas via le
  backend Spring.

> Important : le backend Spring **ne parle pas** à GLPI. Les tickets, assets,
> import et reset passent du frontend directement vers GLPI.

---

## 2. Connexion Frontend → Backend Spring Boot (Kanban config)

### Côté frontend
`newapp_Glpi/src/services/sqliteService.js` :
```js
const api = axios.create({ baseURL: 'http://localhost:8080/api/kanban' })

getSettings()  -> GET  /settings
saveSettings() -> PUT  /settings
resetSettings()-> POST /reset
```

### Côté backend
`backend/SQLite_backend/.../controller/KanbanConfigController.java` :
```java
@RestController
@RequestMapping("/api/kanban")
@CrossOrigin(origins = "http://localhost:5173")   // autorise le front Vite
public class KanbanConfigController {
  @GetMapping("/settings")  // liste (init avec 3 défauts si vide)
  @PutMapping("/settings")  // sauvegarde
  @PostMapping("/reset")    // remet les 3 statuts par défaut
}
```

3 statuts par défaut créés si la base est vide :

| status_id | color   | label_mg   | label_fr |
|-----------|---------|------------|----------|
| 1         | #FFD700 | vaovao     | Nouveau  |
| 2         | #87CEEB | efa manao  | Attribué |
| 6         | #90EE90 | vita       | Clos     |

### Points de connexion à respecter
- Le backend écoute sur **8080** (`server.port=8080` dans `application.properties`).
- Le frontend appelle en **dur** `http://localhost:8080` (dans `sqliteService.js`).
- Le CORS du backend autorise **http://localhost:5173** (`@CrossOrigin`).
  → Si tu changes le port du front, mets à jour le `@CrossOrigin`.
  → Si tu changes le port du back, mets à jour le `baseURL` de `sqliteService.js`.

---

## 3. Connexion Frontend → GLPI (tickets, parc, import, reset)

GLPI est appelé via **deux proxys Vite** (pour éviter les problèmes CORS).

`newapp_Glpi/vite.config.js` :
```js
server: {
  proxy: {
    '/glpi-api':    { target: 'http://glpi.local', rewrite: p => p.replace(/^\/glpi-api/,    '/api.php') },     // API v2 (OAuth2)
    '/glpi-legacy': { target: 'http://glpi.local', rewrite: p => p.replace(/^\/glpi-legacy/, '/apirest.php') }  // API v1 (legacy)
  }
}
```

`newapp_Glpi/src/services/glpiApi.js` utilise :
- **API v2 (OAuth2)** `/glpi-api` → création/lecture, authentification par token.
- **API v1 (legacy, Session-Token)** `/glpi-legacy` → liaisons (`Item_Ticket`,
  `Ticket_User`), suppression définitive (`force_purge`), dropdowns.

### Variables d'environnement (`newapp_Glpi/.env`)
```
VITE_GLPI_API_URL=/glpi-api
VITE_GLPI_LEGACY_URL=/glpi-legacy
VITE_GLPI_CLIENT_ID=...        # client OAuth2 GLPI
VITE_GLPI_CLIENT_SECRET=...    # secret OAuth2 GLPI
VITE_GLPI_LOGIN=glpi
VITE_GLPI_PASSWORD=glpi
```
- `CLIENT_ID`/`CLIENT_SECRET` : pour le token OAuth2 (API v2).
- `LOGIN`/`PASSWORD` : pour le Session-Token en Basic auth (API v1 legacy).

> `glpi.local` doit être résolvable depuis ta machine (entrée dans le fichier
> `hosts` ou DNS local) et GLPI doit tourner. Sinon toutes les requêtes
> tickets/import échouent.

---

## 4. Démarrer le tout (ordre conseillé)

### a) GLPI
Assure-toi que GLPI tourne et est joignable sur `http://glpi.local`
(API REST v1 + v2 activées, client OAuth2 créé avec le `CLIENT_ID`/`SECRET` du `.env`).

### b) Backend Spring Boot (port 8080)
```bash
cd backend/SQLite_backend
./mvnw spring-boot:run        # Windows : mvnw.cmd spring-boot:run
```
Vérifie : ouvrir http://localhost:8080/ → « Backend is running... »
et http://localhost:8080/api/kanban/settings → renvoie les 3 statuts JSON.
(Java 21 requis ; SQLite `kanban.db` est créé/maj automatiquement, `ddl-auto=update`.)

### c) Frontend Vue (port 5173)
```bash
cd newapp_Glpi
npm install
npm run dev
```
Ouvre http://localhost:5173.

---

## 5. Vérifier que les connexions marchent

| Test | Comment |
|---|---|
| Front ↔ Back Spring | Ouvrir la page Kanban / réglages Kanban : les couleurs et libellés se chargent (appel `GET /api/kanban/settings`). |
| Front ↔ GLPI | Ouvrir `/admin/tickets` (après login) : la liste des tickets s'affiche (appel via `/glpi-legacy`). |
| Import | `/admin/import` → importer les 4 fichiers : crée assets/tickets dans GLPI. |
| Reset | `/admin/reset` → purge GLPI (assets, tickets, documents, dropdowns). |

---

## 6. Pannes fréquentes (et cause côté connexion)

- **Kanban sans couleurs / erreur réseau sur `/api/kanban`** → backend Spring non
  démarré, ou mauvais port, ou CORS (front pas sur 5173).
- **Liste tickets vide / erreur API GLPI** → `glpi.local` injoignable, GLPI éteint,
  ou identifiants `.env` invalides (token OAuth2 / Session-Token).
- **Erreurs CORS** → vérifier `@CrossOrigin(origins="http://localhost:5173")` (back)
  et que GLPI est bien appelé via le **proxy Vite** (`/glpi-api`, `/glpi-legacy`),
  pas en URL absolue.
- **403/401 GLPI** → `CLIENT_ID/SECRET` (v2) ou `LOGIN/PASSWORD` (v1) erronés.
```
