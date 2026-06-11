# Documentation des fonctionnalités — NewApp GLPI

## 1. Présentation du projet

**NewApp GLPI** est une application duale (FrontOffice + BackOffice) de gestion de parc informatique et de tickets d'incidents. Elle s'intègre avec **GLPI** via son API REST pour la persistance des données.

### Stack technique

| Couche | Technologie |
|---|---|
| Backend base locale | Spring Boot 3.3.4 (Java 21) + JPA / SQLite |
| Frontend | Vue 3 (Composition API) + Vite 8 + Pinia 3 + Vue Router 5 |
| API externe | GLPI REST API (v1 legacy + v2 OAuth2) via proxy Vite |
| Librairies notables | Axios, JSZip, sql.js, vuedraggable (SortableJS) |

---

## 2. Fonctionnalités BackOffice (protégées)

L'accès au BackOffice est protégé par un code unique (`admin`). La session est stockée dans Pinia (localStorage).

### 2.1 Authentification
- Page de connexion avec code pré-rempli
- Garde de route (`router.beforeEach`) redirigeant les utilisateurs non connectés vers `/login`
- Bouton de déconnexion dans le layout BackOffice

### 2.2 Tableau de bord (`/admin/dashboard`)
- Affichage en temps réel depuis l'API GLPI :
  - Nombre total d'éléments (ordinateurs + écrans)
  - Nombre total de tickets
  - Répartition par type d'élément
  - Répartition par type de ticket
- Données rafraîchies à chaque visite

### 2.3 Import de données (`/admin/import`)
- Upload de **4 fichiers** : 3 CSV (Éléments, Tickets, Coûts) + 1 ZIP d'images
- Validation des colonnes obligatoires
- Parsing CSV avec gestion de :
  - Encodage UTF-8
  - Séparateur point-virgule / virgule
  - Format décimal français (`,` → `.`)
  - Colonnes JSON échappées (Items)
  - Lignes vides et champs nullables
- Extraction ZIP : filtrage par extension image, ignoration des fichiers macOS
- **All-or-nothing** : création des entités dans GLPI par lots, avec rollback automatique en cas d'échec
- Barre de progression avec phases visibles

**Pipeline d'import (6 étapes) :**
1. Création du cache de référence (emplacements, fabricants, états, modèles)
2. Import des éléments (ordinateurs + écrans) — lots de 5
3. Import des tickets — lots de 5 (liaison éléments via Item_Ticket)
4. Import des coûts — lots de 10 (liés aux tickets)
5. Upload des images et liaison aux éléments (Document_Item)
6. Rollback automatique si une étape échoue

### 2.4 Liste et détail des tickets (`/admin/tickets`, `/admin/tickets/:id`)
- Tableau listant tous les tickets GLPI (ID, titre, statut, bouton d'action)
- Page détail avec : titre, description, date, priorité, badge de statut

### 2.5 Réinitialisation des données (`/admin/reset`)
- Purge complète de tous les ordinateurs, écrans, tickets et documents dans GLPI
- `force_purge=true` pour suppression définitive
- Passe multiples pour gérer les dépendances entre entités
- Dialogue de confirmation avant exécution

### 2.6 Personnalisation du Kanban (`/admin/kanban-settings`)
- Configuration par statut GLPI (3 colonnes) :
  - `1` — Nouveau (`#FFD700`)
  - `2` — Attribué (`#87CEEB`)
  - `6` — Clos (`#90EE90`)
- Paramètres modifiables : couleur de colonne (color picker), libellé en français, libellé en malgache
- Sauvegarde via API Spring Boot → SQLite
- Bouton de réinitialisation aux valeurs par défaut

---

## 3. Fonctionnalités FrontOffice (publiques, sans authentification)

### 3.1 Parcours des éléments avec filtres (`/elements`)
- Liste complète des ordinateurs et écrans depuis GLPI
- Filtres multiples dynamiques : nom, type, emplacement, fabricant, statut, utilisateur
- Listes déroulantes alimentées par les valeurs existantes
- Compteur : éléments filtrés / total

### 3.2 Création de ticket (`/nouveau-ticket`)
- Formulaire avec : titre (obligatoire), description, type (Incident/Demande), priorité (1–5)
- Sélection multi-éléments (ordinateurs/écrans) avec recherche
- Création du ticket dans GLPI et liaison des éléments sélectionnés (Item_Ticket)

### 3.3 Tableau Kanban (`/kanban`)
- 3 colonnes correspondant aux statuts GLPI : Nouveau, En cours (Attribué), Clos
- **Drag & drop** entre colonnes → mise à jour du statut dans GLPI en temps réel
- Couleurs et libellés des colonnes configurables depuis le BackOffice
- Badge de comptage par colonne
- Clic sur une carte → modale de détail
- **Ajout rapide de ticket** : formulaire modal (titre + description, statut par défaut = Nouveau)
- **Dialogue de clôture** : glisser un ticket vers "Clos" ouvre une modale demandant une solution avant confirmation (appelle `ITILSolution` API, puis modifie le statut)

---

## 4. Intégration API GLPI

### 4.1 Authentification
- **v2 OAuth2** : `grant_type=password` avec `client_id`/`client_secret` → proxy `/glpi-api`
- **v1 Legacy** : authentification basique → session token → proxy `/glpi-legacy`

### 4.2 Opérations CRUD
- Entités manipulées : Computers, Monitors, Tickets, Documents, ITILSolutions
- Relations : Item_Ticket, Document_Item
- Référentiels (dropdowns) : Location, Manufacturer, State, ComputerModel, MonitorModel, TicketCategory, etc.

### 4.3 Find-or-Create
- Cache intelligent pour les référentiels et utilisateurs GLPI
- Pattern : recherche → si non trouvé → création → mise en cache

### 4.4 Upload d'images
- Upload multipart via v1 API
- Détection MIME par magic bytes
- Liaison aux éléments via Document_Item

### 4.5 All-or-nothing avec rollback
- Si une étape échoue pendant l'import, toutes les entités créées sont supprimées dans l'ordre inverse des dépendances

---

## 5. Modèle de données

### 5.1 Entités métier (CSV → GLPI)

#### Élément (Feuille 1 — Inventaire)
| Champ | Description |
|---|---|
| `Name` | Nom de l'élément |
| `Status` | Statut |
| `Location` | Emplacement |
| `Manufacturer` | Fabricant |
| `Item_Type` | Type (Computer / Monitor) |
| `Model` | Modèle |
| `Inventory_Number` | Numéro d'inventaire |
| `User` | Utilisateur associé |

#### Ticket (Feuille 2)
| Champ | Description |
|---|---|
| `Ref_Ticket` | Référence unique |
| `Date` / `Heure` | Horodatage |
| `Type` | Type (Incident / Demande) |
| `Titre` | Titre |
| `Description` | Description |
| `Status` | Statut (1=Nouveau, 2=Attribué, 6=Clos) |
| `Priority` | Priorité |
| `Items` | JSON array des noms d'éléments liés |

#### TicketCost (Feuille 3 — Coûts)
| Champ | Description |
|---|---|
| `Num_Ticket` | Référence du ticket |
| `Duration_second` | Durée en secondes |
| `Time_Cost` | Coût horaire (format décimal français) |
| `Fixed_Cost` | Coût fixe |

### 5.2 Entité locale (SQLite)

#### KanbanConfig
| Champ | Type | Description |
|---|---|---|
| `status_id` | Integer (PK) | Code statut GLPI |
| `color` | String | Couleur hexadécimale |
| `label_mg` | String | Libellé en malgache |
| `label_fr` | String | Libellé en français |

---

## 6. API REST Backend (Spring Boot)

### Endpoints disponibles

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/api/kanban/` | Health check Kanban |
| `GET` | `/api/kanban/settings` | Récupérer tous les réglages (avec valeurs par défaut si vide) |
| `PUT` | `/api/kanban/settings` | Sauvegarder tous les réglages |
| `POST` | `/api/kanban/reset` | Réinitialiser les valeurs par défaut |

---

## 7. Routes de l'application

### BackOffice (`/admin/*`) — authentification requise

| Route | Composant | Description |
|---|---|---|
| `/login` | LoginView | Connexion |
| `/admin/dashboard` | DashboardView | Tableau de bord |
| `/admin/import` | ImportView | Import de données |
| `/admin/reset` | ResetView | Réinitialisation |
| `/admin/tickets` | TicketsView | Liste des tickets |
| `/admin/tickets/:id` | TicketDetailView | Détail d'un ticket |
| `/admin/kanban-settings` | KanbanSettingsView | Personnalisation Kanban |

### FrontOffice — accès libre

| Route | Composant | Description |
|---|---|---|
| `/` | HomeView | Page d'accueil |
| `/elements` | ElementListView | Parcours des éléments |
| `/nouveau-ticket` | CreateTicketView | Création de ticket |
| `/kanban` | KanbanView | Tableau Kanban |
