# Guide — Intégrer le CALCUL DU COÛT des tickets

> **Constat** : la Feuille 3 (coûts) est bien **importée** dans GLPI
> (table `glpi_ticketcosts` via `importCosts` dans `import.js`), mais
> les coûts ne sont **jamais relus ni affichés** dans NewApp.
> Ce guide liste **tous les fichiers à corriger** + la **formule** + le code.

---

## 1. Rappel des données (Feuille 3)

```
Num_Ticket,Duration_second,Time_Cost,Fixed_Cost
1,0,0,109
1,600,"8,7",50
```

| Colonne CSV | Champ GLPI (`glpi_ticketcosts`) | Sens |
|---|---|---|
| `Num_Ticket` | `tickets_id` | ticket concerné |
| `Duration_second` | `actiontime` | durée en **secondes** |
| `Time_Cost` | `cost_time` | coût **horaire** (par heure) |
| `Fixed_Cost` | `cost_fixed` | coût fixe (forfait) |
| — | `cost_material` | coût matériel (0 ici) |

⚠️ Un même ticket peut avoir **plusieurs lignes de coût** → il faut les **additionner**.

---

## 2. LA FORMULE (celle de GLPI)

Pour **une ligne** de coût :

```
coût_ligne = cost_fixed + cost_material + (actiontime / 3600) × cost_time
                                          └── durée en heures ──┘
```

`actiontime` est en **secondes** → on divise par **3600** pour avoir des heures,
car `cost_time` est un coût **horaire**.

Le **coût total d'un ticket** = somme des coûts de toutes ses lignes.

### Vérifié avec tes données (ticket #1)
| Ligne | Calcul | Résultat |
|---|---|---|
| 1 | `109 + 0 + (0/3600 × 0)` | **109,00** |
| 2 | `50 + 0 + (600/3600 × 8,7)` | **51,45** |
| **TOTAL** | | **160,45** |

---

## 3. LISTE DES FICHIERS À CORRIGER

| # | Fichier | Action | Obligatoire ? |
|---|---|---|---|
| 1 | `src/services/glpiApi.js` | **Ajouter** `getTicketCosts(token, ticketId)` (lecture) | ✅ Oui |
| 2 | `src/services/cost.js` *(nouveau)* | **Créer** la fonction de calcul `computeTicketCost()` | ✅ Oui |
| 3 | `src/views/frontoffice/KanbanView.vue` | **Afficher** le coût dans la modale détails | ✅ Oui |
| 4 | `src/stores/glpi.js` | **Ajouter** le coût total dans `fetchStats()` (dashboard) | ⭐ Recommandé |
| 5 | `src/views/backoffice/DashboardView.vue` | **Afficher** « Coût total des tickets » | ⭐ Recommandé |
| 6 | `src/views/glpi/...` (fiche ticket BO) | Afficher le coût si une fiche ticket existe | ⬜ Optionnel |

> ✅ = minimum pour « voir le coût d'un ticket »
> ⭐ = pour montrer le coût total/agrégé (dashboard)

---

## 4. LE CODE à mettre dans chaque fichier

### 4.1 — `glpiApi.js` : lire les coûts d'un ticket

À ajouter (après `getTicket`, suit le même modèle v1) :

```js
// Lecture des lignes de coût d'un ticket (v1, sous-ressource)
export async function getTicketCosts(token, ticketId) {
  const session = await getSessionToken()
  const { data } = await legacy.get(`/Ticket/${ticketId}/TicketCost`, {
    headers: { 'Session-Token': session }
  })
  return Array.isArray(data) ? data : []
}
```

> GLPI expose les coûts comme **sous-ressource** : `/Ticket/{id}/TicketCost`.
> (Alternative : `/TicketCost?searchText[tickets_id]=...`, mais la sous-ressource est plus simple.)

### 4.2 — `cost.js` (NOUVEAU fichier) : la formule centralisée

```js
// src/services/cost.js
const SECONDS_PER_HOUR = 3600

// Coût d'une seule ligne TicketCost
export function lineCost(line) {
  const fixed    = Number(line.cost_fixed)    || 0
  const material = Number(line.cost_material) || 0
  const time     = Number(line.cost_time)     || 0
  const seconds  = Number(line.actiontime)    || 0
  return fixed + material + (seconds / SECONDS_PER_HOUR) * time
}

// Coût total d'un ticket (somme de toutes ses lignes)
export function computeTicketCost(costLines = []) {
  return costLines.reduce((sum, l) => sum + lineCost(l), 0)
}

// Format affichage (2 décimales)
export function formatCost(n) {
  return (Number(n) || 0).toFixed(2)
}
```

### 4.3 — `KanbanView.vue` : afficher le coût dans la modale détails

**a) Imports (haut du `<script setup>`)** — ajouter `getTicketCosts` et le service :
```js
import { getTickets, getTicket, getTicketCosts, /* ...le reste... */ } from '@/services/glpiApi'
import { computeTicketCost, formatCost } from '@/services/cost'
```

**b) Un `ref` pour le coût** (à côté de `const detail = ref(null)`) :
```js
const detailCost = ref(0)
```

**c) Dans `openDetail()`** — charger aussi les coûts :
```js
async function openDetail(ticket) {
  try {
    const t = await glpi.ensureToken()
    detail.value = await getTicket(t, ticket.id)
    const lines = await getTicketCosts(t, ticket.id)   // <-- AJOUT
    detailCost.value = computeTicketCost(lines)          // <-- AJOUT
  } catch (e) {
    detail.value = ticket
    detailCost.value = 0
  }
}
```

**d) Dans la modale détails (template)** — ajouter une ligne :
```vue
<div class="row"><span>Priorité</span><b>{{ detail.priority?.name || detail.priority }}</b></div>
<!-- AJOUT : coût total -->
<div class="row"><span>Coût total</span><b>{{ formatCost(detailCost) }} €</b></div>
```

### 4.4 — `glpi.js` (store) : coût total dans `fetchStats`

Dans `fetchStats()`, après avoir récupéré les tickets, additionner le coût de chacun :

```js
import { getTicketCosts } from '@/services/glpiApi'
import { computeTicketCost } from '@/services/cost'

// ... dans fetchStats(), après avoir la liste des tickets :
let totalCost = 0
for (const tk of tickets) {
  const lines = await getTicketCosts(this.token, tk.id)
  totalCost += computeTicketCost(lines)
}
// puis ajouter dans l'objet retourné :
return { /* ...stats existantes..., */ totalCost }
```

> ⚠️ Une requête par ticket. Pour peu de tickets (2 ici) c'est OK.
> Optimisation possible : un seul appel `/TicketCost` global puis regrouper par `tickets_id`.

### 4.5 — `DashboardView.vue` : carte « Coût total »

```vue
<div class="stat-card">
  <span class="stat-label">Coût total des tickets</span>
  <span class="stat-value">{{ stats.totalCost?.toFixed(2) ?? '0.00' }} €</span>
</div>
```

---

## 5. Vérification en base (SQL)

```sql
-- Lignes de coût brutes du ticket #1
SELECT tickets_id, actiontime, cost_time, cost_fixed, cost_material
FROM glpi_ticketcosts WHERE tickets_id = 1;

-- Coût total calculé côté base (doit donner 160.45)
SELECT tickets_id,
       SUM(cost_fixed + cost_material + (actiontime/3600.0) * cost_time) AS cout_total
FROM glpi_ticketcosts
WHERE tickets_id = 1
GROUP BY tickets_id;
```

---

## 6. Récap — ordre d'application (bottom-up)

1. `glpiApi.js` → `getTicketCosts()`  *(lire)*
2. `cost.js` *(nouveau)* → `computeTicketCost()`  *(calculer)*
3. `KanbanView.vue` → afficher dans la modale  *(voir par ticket)*
4. `glpi.js` + `DashboardView.vue` → coût global  *(voir le total)*

Tout repose sur **une seule formule**, centralisée dans `cost.js`, donc
si la règle de calcul change, **un seul endroit** à modifier.
