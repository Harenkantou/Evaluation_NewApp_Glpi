# Jour 2 — Guide d'implémentation (à coder soi-même)

## Vue d'ensemble des 2 fonctionnalités

1. FrontOffice : **page Kanban** des tickets (3 colonnes, drag&drop, ajout, détail, compteurs)
2. BackOffice : **page de personnalisation** (3 couleurs + noms de statuts en malgache),
   valeurs stockées dans **SQLite (sql.js)**.

## Les 3 statuts retenus

| Colonne | Statut GLPI | Code | Malgache (défaut) |
|---|---|---|---|
| 1 | Nouveau     | 1 | vaovao |
| 2 | En cours    | 2 | efa manao |
| 3 | Résolu      | 5 | vita |

(le drag&drop fera passer le ticket d'un code à l'autre via l'API GLPI)

---

# PARTIE A — SQLite avec sql.js (la base technique)

## A.1 Installer sql.js
```
npm install sql.js
```

## A.2 Créer un service `src/services/sqlite.js`
Rôle : ouvrir une base SQLite en mémoire, la persister dans localStorage
(sql.js ne sait pas écrire un fichier disque depuis le navigateur, on
sérialise la base en base64 dans localStorage).

Étapes dans ce service :
1. importer `initSqlJs` depuis 'sql.js'
2. charger le wasm (via CDN ou fichier local)
3. au démarrage : recharger la base depuis localStorage si elle existe,
   sinon créer les tables
4. exposer des fonctions : `getSettings()`, `saveSettings(obj)`
5. après chaque écriture : `db.export()` -> stocker en localStorage

### Schéma SQL minimal
```sql
CREATE TABLE IF NOT EXISTS kanban_settings (
  status_code INTEGER PRIMARY KEY,   -- 1, 2, 5
  color       TEXT,                  -- ex: "#dbeafe"
  label_mg    TEXT                   -- ex: "vaovao"
);
```
Insérer 3 lignes par défaut (une par statut).

> Idée clé : ce service est le SEUL endroit qui parle à sql.js.
> Le reste de l'app appelle getSettings() / saveSettings().

---

# PARTIE B — BackOffice : page de personnalisation

## B.1 Créer `src/views/backoffice/KanbanSettingsView.vue`
Contenu :
- 3 blocs (un par statut)
- chaque bloc : un `<input type="color">` + un `<input type="text">` (nom malgache)
- bouton "Enregistrer" -> appelle `saveSettings()` du service sqlite

## B.2 Ajouter la route + le lien menu
- route protégée : `/admin/kanban-settings`
- ajouter l'entrée dans `BoLayout.vue` (links)

## B.3 Charger les valeurs au montage
- `onMounted` -> `getSettings()` -> pré-remplir les 3 couleurs + 3 noms

---

# PARTIE C — FrontOffice : page Kanban

## C.1 Installer une lib de drag&drop
```
npm install vuedraggable@next
```
(vuedraggable = wrapper Vue de SortableJS, gère le glisser-déposer entre listes)

## C.2 Créer `src/views/frontoffice/KanbanView.vue`

### Données nécessaires
1. charger les tickets via l'API GLPI (getTickets) -> déjà dispo
2. charger les réglages via `getSettings()` (couleurs + noms malgaches)
3. répartir les tickets en 3 tableaux selon leur `status` :
   - colNouveau = tickets status==1
   - colEnCours = tickets status==2
   - colResolu  = tickets status==5

### Affichage
- 3 colonnes côte à côte (flex)
- couleur de fond de chaque colonne = celle des réglages SQLite
- titre de colonne = nom malgache + compteur (colXXX.length)
- chaque ticket = une carte (titre + id)

### Drag & drop (le coeur)
- envelopper chaque colonne dans <draggable> avec un même `group`
  pour permettre de déplacer entre colonnes
- sur l'événement de fin de drag (`@change` ou `@end`) :
  - récupérer le ticket déplacé + la colonne d'arrivée
  - appeler l'API GLPI pour changer son status (PUT/update ticket)
  - (voir C.4 pour la boîte de dialogue)

### Bouton "Ajouter 1 ticket"
- ouvre un mini formulaire (titre, description)
- crée le ticket via l'API (createTicket) avec status=1 (Nouveau)
- l'ajoute dans la colonne Nouveau

### Clic sur un ticket -> détails
- au clic sur une carte : ouvrir une modale affichant tous les champs
  (titre, description, statut, priorité, éléments liés, coûts...)

## C.3 Changer le statut via l'API GLPI
Il faut une fonction `updateTicketStatus(id, status)` dans glpiApi.js :
- via API v1 : PUT /Ticket/{id} avec { input: { status } }
- (l'API v1 gère bien les champs plats, comme pour la création)

## C.4 Boîte de dialogue conditionnelle
La consigne : "mettre une boîte de dialogue si 1 changement de statut
nécessite de saisir des informations supplémentaires".
Exemple logique : si on passe un ticket vers "Résolu" (status 5),
GLPI demande souvent une SOLUTION. Donc :
- si colonne d'arrivée == Résolu -> ouvrir une modale qui demande
  un texte de solution -> l'envoyer à l'API (ITILSolution ou champ solution)
- sinon -> changement direct sans dialogue

## C.5 Route + menu
- route publique : `/kanban`
- l'ajouter dans FoLayout.vue (links)

---

# ORDRE DE RÉALISATION CONSEILLÉ

1. PARTIE A (sqlite.js)         -> la base technique
2. PARTIE B (settings backoffice) -> remplir/lire les réglages
3. C.2 Kanban statique (3 colonnes + tickets + compteurs + couleurs/noms)
4. C.3 + drag&drop (changer statut)
5. Bouton Ajouter + clic détail
6. C.4 boîte de dialogue (solution si -> Résolu)

# FONCTIONS API À AJOUTER (dans glpiApi.js)
- updateTicketStatus(id, status)   // PUT /Ticket/{id}
- (optionnel) addSolution(ticketId, content)  // POST /ITILSolution

# RÉUTILISÉ (déjà fait)
- getTickets()    -> liste des tickets
- createTicket()  -> bouton Ajouter
- getTicket(id)   -> détails au clic
