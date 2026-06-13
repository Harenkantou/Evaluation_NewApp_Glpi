# Résumé — Import & Reset (NewApp ↔ GLPI)

Basé sur le code réel de `feature/J2_FrontOffice` :
`newapp_Glpi/src/services/import.js`, `newapp_Glpi/src/stores/glpi.js`,
`newapp_Glpi/src/services/glpiApi.js`.

> Rappel : l'import et le reset agissent **directement sur GLPI** (via le proxy
> Vite, API v1 legacy + v2). Le backend Spring (SQLite) n'est pas concerné — il
> ne stocke que la config du Kanban.

---

## 1. IMPORT

### Déclenchement
Page **BackOffice → Import** (`/admin/import`, `ImportView.vue`).
On fournit **4 fichiers** : 3 CSV + 1 ZIP d'images.

| Fichier | Rôle | Colonnes attendues |
|---|---|---|
| Feuille 1 | Éléments (parc) | name, status, location, manufacturer, item_type, model, inventory_number, user |
| Feuille 2 | Tickets | ref_ticket, date, heure, type, titre, description, status, priority, items |
| Feuille 3 | Coûts | num_ticket, duration_second, time_cost, fixed_cost |
| ZIP | Images | nom de fichier = `name` de l'élément |

### Déroulement (ordre)
`ImportView.submit()` :
1. **Reset d'abord** : `glpi.purgeAllData()` (repart d'une base propre).
2. Extraction des images du ZIP.
3. `importAll({ feuille1, feuille2, feuille3, images, onProgress })` (`import.js`) :
   1. **Éléments** (`importElements`) → crée Computer/Monitor/… dans GLPI,
      en résolvant les **dropdowns** au passage (get-or-create).
   2. **Tickets** (`importTickets`) → crée les tickets + **liaisons** aux éléments (`Item_Ticket`).
   3. **Coûts** (`importCosts`) → crée des `TicketCost` rattachés aux tickets.
   4. **Images** (`importImages`) → upload Documents + liaison `Document_Item`.

### Ce que l'import crée dans GLPI
- **Assets** : Computer, Monitor, Printer, Phone, Peripheral, NetworkEquipment
  (selon `item_type`).
- **Tickets** + liaisons éléments (`Item_Ticket`).
- **Coûts** (`TicketCost`).
- **Documents** (images) + liaison (`Document_Item`).
- **Dropdowns** (créés s'ils n'existent pas) : `Location`, `Manufacturer`,
  `State`, et les modèles `ComputerModel`, `MonitorModel`, `PrinterModel`,
  `PhoneModel`, `PeripheralModel`, `NetworkEquipmentModel`.
- **Utilisateurs** (colonne `user`) : get-or-create (`User`).

### Mapping des statuts (tickets)
Seuls **3 statuts** sont produits : New (1), In Progress/assigned (2), Closed (6).
```js
TICKET_STATUS_MAP = {
  new: 1, assigned: 2, 'in progress': 2,
  planned: 2, waiting: 2,   // -> In Progress
  solved: 6, closed: 6      // -> Closed
}
// statut inconnu/vide -> New (1)
```
Type : `incident -> 1`, `demande/request -> 2`. Priorité : very low..major -> 1..6.

### Robustesse
- **Idempotence partielle** : les dropdowns/users/éléments existants sont
  réutilisés (get-or-create) → pas de doublons si on relance.
- **Rollback** (import via le store) : en cas d'erreur, suppression définitive
  de ce qui venait d'être créé (documents → tickets → computers → monitors).
- Traitements par **batch** + `onProgress` pour la barre de progression.
- Images : échec **non bloquant** (signalé en warning).

---

## 2. RESET (purge totale)

### Déclenchement
Page **BackOffice → Réinitialiser** (`/admin/reset`, `ResetView.vue`)
→ confirmation → `glpi.purgeAllData()`.
Également appelé **automatiquement avant chaque import**.

### Ce que le reset supprime (définitivement, `force_purge`)
Ordre important (libère les dépendances) :
1. **Tickets** (d'abord, pour libérer les liens)
2. **Assets** : Computer, Monitor, Printer, Phone, Peripheral, NetworkEquipment
3. **Documents** (images)
4. **Dropdowns** : Location, Manufacturer, State, et tous les `*Model`

Pour chaque type :
- récupère les éléments **actifs ET en corbeille** (assets/tickets/documents),
- supprime en **3 passes** (certaines suppressions échouent au 1er tour à cause
  des dépendances, puis réussissent),
- les erreurs sont **collectées** (pas d'arrêt brutal) et renvoyées dans le récap.

### Valeur de retour
```js
{ remaining: { tickets, computers, monitors, printers, phones,
               peripherals, networkequipments, documents, dropdowns },
  errors: [...] }
```
`remaining.*` = nombre d'éléments restants après purge (idéalement 0).

### Ce que le reset NE supprime PAS (volontairement)
- Les **Utilisateurs** créés à l'import (risque d'effacer le compte de connexion GLPI).
- La **config Kanban** (couleurs/libellés) du backend Spring : elle a son propre
  reset `POST /api/kanban/reset` (remet les 3 statuts par défaut).

---

## 3. Cohérence Import ↔ Reset

| Créé par l'import | Purgé par le reset ? |
|---|---|
| Computer / Monitor / Printer / Phone / Peripheral / NetworkEquipment | Oui |
| Tickets (+ liaisons) | Oui |
| TicketCost | Oui (supprimé avec le ticket parent) |
| Documents (images) | Oui |
| Dropdowns (Location, Manufacturer, State, *Model) | Oui |
| Utilisateurs | Non (volontaire) |

Conclusion : après un reset, l'app revient à zéro (compteurs dashboard = 0) et un
nouvel import repart proprement.
