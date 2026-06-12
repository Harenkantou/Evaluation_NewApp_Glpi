# Guide — Ajouter le calcul de coût d'un ticket (de la donnée à l'affichage)

État actuel et étapes pour brancher le **calcul/affichage des coûts** d'un ticket,
couche par couche, de la première à la dernière.

---

## 0. État actuel (est-ce déjà pris en compte ?)

**Partiellement.**

| Couche | État |
|---|---|
| Import → GLPI | ✅ FAIT : `importCosts` (`import.js`) crée des `TicketCost` dans GLPI |
| Service API (lecture des coûts) | ❌ MANQUANT : aucune fonction `getTicketCosts` dans `glpiApi.js` |
| Vue détail FrontOffice | ⚠️ MOCK : `TicketDetailView.vue` affiche des coûts **codés en dur** (données d'exemple) |
| Calcul (total coût/durée) | ✅ existe (`totalCost`, `totalDuration`) mais sur les données mock |
| Affichage (tableau + totaux) | ✅ existe dans le template |

> Le service `ticketService.js` (`getTicketCosts` → `http://localhost:8080/api/tickets/:id/costs`)
> pointe vers un endpoint **inexistant** : le backend Spring n'expose que `/api/kanban`.
> On branche donc les coûts **directement sur GLPI**, comme le reste de l'app.

**Conclusion : il reste à connecter la lecture réelle des coûts (couches 2 et 3).**

---

## Rappel — champs GLPI `TicketCost`
Créés à l'import (`import.js`, `importCosts`) :
```js
{
  tickets_id,                 // id du ticket parent
  actiontime,   // durée en SECONDES   (CSV: duration_second)
  cost_time,    // coût lié au temps   (CSV: time_cost)
  cost_fixed,   // coût fixe           (CSV: fixed_cost)
  cost_material // matériel (0 à l'import)
}
```

Le template attend, lui, ces noms : `durationSecond`, `timeCost`, `fixedCost`.
→ il faudra **mapper** GLPI → front.

---

## COUCHE 1 — Donnée (GLPI) — déjà OK
Rien à faire : les `TicketCost` existent dans GLPI après import.
Vérif rapide (API legacy) : `GET /Ticket/{id}/TicketCost` renvoie la liste.

---

## COUCHE 2 — Service API : lire les coûts (`src/services/glpiApi.js`)

Ajouter une fonction qui lit les coûts d'un ticket et **mappe** vers le format
attendu par la vue.

```js
// ---------- Coûts d'un ticket (API v1 legacy) ----------
// GLPI expose les sous-objets : GET /Ticket/{id}/TicketCost
export async function getTicketCosts(token, ticketId) {
  const session = await getSessionToken()
  const { data } = await legacy.get(`/Ticket/${ticketId}/TicketCost`, {
    headers: { 'Session-Token': session },
    params: { range: '0-9999' }
  })
  const list = Array.isArray(data) ? data : (data?.data || [])
  // Mapping GLPI -> format attendu par la vue
  return list.map((c) => ({
    id: c.id,
    durationSecond: Number(c.actiontime) || 0,
    timeCost: Number(c.cost_time) || 0,
    fixedCost: Number(c.cost_fixed) || 0,
    materialCost: Number(c.cost_material) || 0
  }))
}
```

> Si ta version de GLPI ne supporte pas la sous-route, fallback possible :
> `GET /TicketCost?searchText[tickets_id]={id}` ou filtrage côté client après
> `legacyGetList('TicketCost')`.

---

## COUCHE 3 — Vue (logique) : `src/views/frontoffice/TicketDetailView.vue`

Remplacer le `load()` **mock** par un vrai chargement (ticket + coûts) via GLPI.

### 3.1 Imports
```js
import { useGlpiStore } from '@/stores/glpi'
import { getTicket, getTicketCosts } from '@/services/glpiApi'

const glpi = useGlpiStore()
```

### 3.2 `load()` réel (remplace les données d'exemple)
```js
async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    const id = route.params.id

    // 1) Le ticket
    const tk = await getTicket(t, id)
    ticket.value = {
      id,
      titre: tk.name,
      description: tk.content,
      status: tk.status,
      // ... autres champs si besoin
    }

    // 2) Les coûts (déjà mappés par le service)
    costs.value = await getTicketCosts(t, id)
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Impossible de charger le ticket'
  } finally {
    loading.value = false
  }
}
```

> Supprime le bloc « Données d'exemple » (les objets `ticket.value = {...}` et
> `costs.value = [...]` codés en dur) — c'est ce qui masque les vraies données.

---

## COUCHE 4 — Calcul (computed) — déjà présent, à vérifier

Ces computed existent déjà et fonctionnent dès que `costs.value` contient les
vraies données (mêmes noms de champs grâce au mapping de la couche 2) :
```js
const totalCost = computed(() =>
  costs.value.reduce((s, c) => s + (c.timeCost || 0) + (c.fixedCost || 0), 0)
)
const totalDuration = computed(() => {
  const sec = costs.value.reduce((s, c) => s + (c.durationSecond || 0), 0)
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
})
```
*(Optionnel : inclure `materialCost` dans `totalCost` si tu veux le matériel.)*

---

## COUCHE 5 — Affichage (template) — déjà présent

La section « 💰 Détail des coûts » existe déjà (totaux + tableau). Elle s'affiche
si `costs?.length`. Une fois les couches 2-3 branchées, elle montre les vraies
valeurs. Rien à ajouter, sauf personnalisation.

Extrait :
```html
<section class="detail-section" v-if="costs?.length">
  <div class="costs-summary">
    <span>Durée totale {{ totalDuration }}</span>
    <span>Coût total {{ totalCost.toFixed(2) }}€</span>
  </div>
  <table class="costs-table"> ... v-for="(cost, idx) in costs" ... </table>
</section>
```

---

## COUCHE 6 (optionnel) — BackOffice `TicketDetailView.vue`

Le détail BackOffice charge déjà le ticket (`getTicket`) mais **n'affiche pas**
les coûts. Pour l'ajouter, répéter le même principe :
1. importer `getTicketCosts`,
2. `costs.value = await getTicketCosts(t, route.params.id)` dans son `load()`,
3. ajouter une section coûts + un computed `totalCost` dans son template.

---

## Récapitulatif de l'ordre des modifications

1. **(GLPI)** — rien (les `TicketCost` existent déjà après import).
2. **`glpiApi.js`** — ajouter `getTicketCosts(token, ticketId)` (+ mapping).
3. **`frontoffice/TicketDetailView.vue`** — `load()` réel : `getTicket` + `getTicketCosts`,
   supprimer les données mock.
4. **computed** — `totalCost` / `totalDuration` (déjà là, vérifier les champs).
5. **template** — section coûts (déjà là).
6. **(optionnel)** — même chose dans `backoffice/TicketDetailView.vue`.

## Vérification finale
- Importer les données (Feuille 3 contient les coûts).
- Ouvrir un ticket : `/tickets/{id}` (FrontOffice).
- La section « Détail des coûts » affiche les lignes réelles + « Coût total » et
  « Durée totale » calculés à partir de GLPI.
