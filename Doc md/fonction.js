# NewApp — Documentation technique (offline)

> Projet d'évaluation P17 — Série 2 (Jour 1 & Jour 2)
> **Vue 3 (Vite)** ⇄ **API REST JSON** ⇄ **GLPI 11** (ExistingApp)
> Persistance locale : **SQLite (sql.js)** pour les préférences Kanban.
>
> Le code des fonctions d'amélioration (section 4) est fourni dans
> le fichier compagnon **`ameliorations.js`**.

---

## 1. Architecture en couches du Frontend Vue

```
┌──────────────────────────────────────────────────────────────┐
│  VUES (views/)                  ← écrans complets (pages)      │
│  DashboardView, ImportView, ResetView, TicketsView,          │
│  KanbanSettingsView, ElementsListView, CreateTicketView,     │
│  KanbanView, GlpiTicketsView, LoginView                      │
├──────────────────────────────────────────────────────────────┤
│  COMPOSANTS (components/)        ← briques d'UI réutilisables  │
│  BoLayout, FoLayout, StatCard                                 │
├──────────────────────────────────────────────────────────────┤
│  STORES (stores/) — Pinia       ← état global + orchestration │
│  auth, glpi                                                   │
├──────────────────────────────────────────────────────────────┤
│  SERVICES (services/)           ← accès données / API         │
│  glpiApi, import, csv, sqliteService                          │
├──────────────────────────────────────────────────────────────┤
│  ROUTER (router/)               ← navigation + protection      │
└──────────────────────────────────────────────────────────────┘
                         │  HTTP (proxy Vite)
                         ▼
              ┌────────────────────────┐
              │  GLPI (API v1 + v2)    │
              └────────────────────────┘
```

### Utilité de chaque couche

| Couche | Dossier | Utilité |
|---|---|---|
| **Vues** | `views/` | Pages affichées. Une vue = une route. Consomment stores/services, gèrent affichage + interactions. |
| **Composants** | `components/` | UI réutilisable (layouts, cartes). Pas de logique métier. |
| **Stores (Pinia)** | `stores/` | État partagé + orchestration métier (auth, import, reset, dashboard). Appellent les services. |
| **Services** | `services/` | Communication externe : API GLPI, parsing CSV, SQLite. Indépendants de Vue. |
| **Router** | `router/` | URLs ↔ vues + guard de protection BackOffice. |

### Back / Front Office

| Espace | Accès | Vues | Layout |
|---|---|---|---|
| **BackOffice** | code unique | Dashboard, Import, Reset, Tickets, KanbanSettings | `BoLayout` |
| **FrontOffice** | public | ElementsList, CreateTicket, Kanban | `FoLayout` |
| **ExistingApp** | public | GlpiTickets | — |

---

## 2. Fonctionnalités

### 2.1 BackOffice

| Réf PDF | Fonctionnalité | Vue |
|---|---|---|
| J1-1.a | Protection par code unique (pré-rempli) | LoginView |
| J1-1.b | Réinitialisation des données | ResetView |
| J1-1.c | Import des 4 fichiers (3 CSV + 1 ZIP) | ImportView |
| J1-1.d | Dashboard (nb éléments + tickets, par type) | DashboardView |
| J1-1.e | Liste des tickets + fiche | TicketsView |
| J2-2.a | Personnalisation Kanban (3 couleurs + noms mg) en SQLite | KanbanSettingsView |

### 2.2 FrontOffice

| Réf PDF | Fonctionnalité | Vue |
|---|---|---|
| J1-2.a | Liste des éléments + recherche multi-critères | ElementsListView |
| J1-2.b | Création d'un ticket (associer plusieurs éléments) | CreateTicketView |
| J2-1.a | Kanban (3 colonnes, drag&drop, ajout, détail, compteurs) | KanbanView |
| J2-1.a | Boîtes de dialogue (technicien / solution / réouverture) | KanbanView |

### 2.3 ExistingApp (GLPI)
- Données importées visibles dans GLPI ; la modification GLPI impacte NewApp (même base).

---

## 3. Fonctions du projet (signature, arguments, retour)

### 3.1 `services/glpiApi.js`

| Fonction | Arguments | Retour |
|---|---|---|
| `initSession()` | — | `Promise<string>` |
| `getComputers(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getMonitors(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getPrinters(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getPhones(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getPeripherals(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getNetworkEquipments(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getTickets(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getTicket(token, id)` | string, number | `Promise<Object>` |
| `getDocuments(token, includeDeleted=false)` | string, bool | `Promise<Array>` |
| `getUsers(token)` | string | `Promise<Array>` |
| `createComputer(token, payload)` | string, object | `Promise<Object>` |
| `createMonitor(token, payload)` | string, object | `Promise<Object>` |
| `createTicket(token, payload)` | string, object | `Promise<Object>` |
| `updateTicketStatus(token, id, status)` | string, number, number | `Promise<Object>` |
| `addSolution(token, ticketId, content)` | string, number, string | `Promise<Object>` |
| `addFollowup(token, ticketId, content)` | string, number, string | `Promise<Object>` |
| `linkItemToTicket(token, ticketId, itemtype, itemsId)` | string, number, string, number | `Promise<Object>` |
| `linkUserToTicket(token, ticketId, userId, type=2)` | string, number, number, number | `Promise<Object>` |
| `findOrCreateDropdown(itemtype, name)` | string, string | `Promise<number\|null>` |
| `findOrCreateUser(name)` | string | `Promise<number\|null>` |
| `uploadDocument(token, file, name, itemtype=null, itemsId=null)` | string, File, string, string, number | `Promise<number>` |
| `deleteComputer(token, id)` | string, number | `Promise<void>` |
| `deleteMonitor(token, id)` | string, number | `Promise<void>` |
| `deletePrinter(token, id)` | string, number | `Promise<void>` |
| `deletePhone(token, id)` | string, number | `Promise<void>` |
| `deletePeripheral(token, id)` | string, number | `Promise<void>` |
| `deleteNetworkEquipment(token, id)` | string, number | `Promise<void>` |
| `deleteTicket(token, id)` | string, number | `Promise<void>` |
| `deleteDocument(token, id)` | string, number | `Promise<void>` |
| `extractId(res)` | object | `number\|any` |

### 3.2 `services/import.js`

| Fonction | Arguments | Retour |
|---|---|---|
| `initLegacySession()` | — | `Promise<string>` |
| `importAll({feuille1, feuille2, feuille3, images, onProgress})` | object | `Promise<{success, message, details}>` |
| `EXPECTED_COLUMNS` | (const) | object |

### 3.3 `services/csv.js`

| Fonction | Arguments | Retour |
|---|---|---|
| `parseCsvFiles(files)` | `File[]` | `Promise<{elements, tickets, costs}>` |

### 3.4 `services/sqliteService.js`

| Fonction | Arguments | Retour |
|---|---|---|
| `initDB()` | — | `Promise<void>` |
| `getSettings()` | — | `Promise<Array<{status_id,color,label_mg,label_fr}>>` |
| `saveSettings(list)` | array | `Promise<void>` |
| `resetSettings()` | — | `Promise<void>` |

### 3.5 `stores/glpi.js`

| Membre | Type / Retour |
|---|---|
| `ensureToken()` | `Promise<string>` |
| `importToGlpi(parsed, images)` | `Promise<object>` |
| `fetchStats()` | `Promise<{computers,monitors,printers,phones,peripherals,networkequipments,elements,tickets}>` |
| `purgeAllData()` | `Promise<{remaining, errors}>` |

### 3.6 `stores/auth.js`

| Membre | Type / Retour |
|---|---|
| `isAuthenticated` | computed(bool) |
| `getDefaultCode()` | string |
| `login(code)` | bool |
| `logout()` | void |

---

## 4. Améliorations possibles (hors PDF) — AVEC code

> Code complet fourni dans **`ameliorations.js`**. Résumé des signatures :

| # | Fonction | Arguments | Retour | Utilité |
|---|---|---|---|---|
| 4.1 | `updateTicket(legacy, getSessionToken, id, payload)` | client, fn, number, object | `Promise<Object>` | Modifier un ticket |
| 4.2 | `useKanbanFilter(ticketsRef, criteriaRef, computed)` | Ref, Ref, fn | `ComputedRef<Array>` | Filtrer le Kanban |
| 4.3 | `getTicketsPaged(legacy, getSessionToken, start, limit)` | client, fn, number, number | `Promise<{data,total}>` | Pagination |
| 4.4 | `buildChartData(list, keyFn)` | Array, fn | `{labels,values}` | Données graphiques |
| 4.5 | `exportToCsv(rows, columns)` | Array, Array | `Blob` | Export CSV |
| 4.5 | `exportToJson(data)` | any | `Blob` | Export JSON |
| 4.5 | `downloadBlob(blob, filename)` | Blob, string | `void` | Télécharger |
| 4.6 | `useI18n(langRef, dict)` | Ref, object | `{t(key)}` | Multi-langue |
| 4.7 | `getItemDocuments(legacy, getSessionToken, itemtype, itemsId)` | client, fn, string, number | `Promise<Array>` | Images d'un élément |
| 4.7 | `getDocumentFileUrl(baseUrl, docId)` | string, number | `string` | URL d'une image |
| 4.8 | `createToastStore(defineStore, ref)` | fn, fn | store | Notifications |
| 4.9 | `logReopen(..., ticketId, reason)` | …, number, string | `Promise<void>` | Historique réouverture |
| 4.9 | `getReopenHistory(..., ticketId)` | …, number | `Promise<Array>` | Lire l'historique |

### Notes d'intégration des améliorations
- Les fonctions API (4.1, 4.3, 4.7) reçoivent `legacy` et `getSessionToken` en
  paramètres dans `ameliorations.js` pour rester autonomes. **Pour les intégrer
  dans `glpiApi.js`**, retirez ces 2 paramètres et utilisez directement le
  `legacy`/`getSessionToken` internes du module.
- Les composables (4.2, 4.6) reçoivent `computed`/refs en paramètre pour éviter
  un import Vue dans ce fichier neutre ; dans un `.vue`, importez `computed`
  depuis `vue` et appelez-les normalement.

---

## 5. Configuration

### `.env`
```
VITE_GLPI_API_URL=/glpi-api
VITE_GLPI_LEGACY_URL=/glpi-legacy
VITE_GLPI_CLIENT_ID=...
VITE_GLPI_CLIENT_SECRET=...
VITE_GLPI_LOGIN=glpi
VITE_GLPI_PASSWORD=glpi
```

### Proxys Vite
```
/glpi-api     -> http://glpi.local/api.php      (API v2 / OAuth2)
/glpi-legacy  -> http://glpi.local/apirest.php  (API v1 / session)
```

### Dépendances
vue, vue-router, pinia, pinia-plugin-persistedstate, axios,
papaparse, jszip, vuedraggable, sql.js

### Prérequis GLPI
- API v2 (OAuth2) + client OAuth créé
- API v1 (Legacy) activée
- Droits : créer/purger assets, tickets, users, documents
- Type de document `png` autorisé (images)
- Cycle de vie : transitions `Clos → Nouveau/En cours` autorisées (réouverture)
