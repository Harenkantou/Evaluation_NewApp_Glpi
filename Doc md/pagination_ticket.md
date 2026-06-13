# Guide — Ajouter une PAGINATION à la liste des tickets

> Objectif : n'afficher qu'un nombre limité de tickets par page
> (ex. 10) avec des boutons « Précédent / Suivant » + numéros de page.

---

## 0. Pagination CÔTÉ CLIENT vs CÔTÉ SERVEUR

| Approche | Principe | Quand l'utiliser |
|---|---|---|
| **Côté client** *(recommandé ici)* | On récupère **tous** les tickets (déjà le cas via `getTickets`) puis on en affiche une **tranche** avec `.slice()` | Volume raisonnable (dizaines/centaines). Simple, aucun appel API en plus. |
| Côté serveur | On demande à GLPI seulement la page voulue avec le paramètre `range` (`0-9`, `10-19`...) | Gros volumes (milliers). Plus complexe. |

Ce guide détaille la **pagination côté client** (la plus adaptée à NewApp).
La variante serveur est en **section 4**.

---

## 1. LISTE DES FICHIERS À MODIFIER

### Pagination côté client (recommandé)

| # | Fichier | Action | Obligatoire ? |
|---|---|---|---|
| 1 | `src/views/backoffice/TicketsView.vue` | Ajouter l'état + le calcul de page + les boutons | ✅ Oui |
| 2 | `src/components/Pagination.vue` *(nouveau)* | Composant réutilisable « Précédent / 1 2 3 / Suivant » | ⭐ Recommandé (sinon tout dans TicketsView) |
| 3 | `src/views/glpi/GlpiTicketsView.vue` | Même pagination si tu veux la mettre aussi sur la page ExistingApp | ⬜ Optionnel |

> ✅ = minimum (1 seul fichier suffit si tu mets tout dedans)
> ⭐ = pour un composant **réutilisable** sur plusieurs listes (tickets, éléments…)

### Pagination côté serveur (variante)

| # | Fichier | Action |
|---|---|---|
| A | `src/services/glpiApi.js` | Faire accepter un `range` à `getTickets` |
| B | `src/views/backoffice/TicketsView.vue` | Recharger à chaque changement de page |

---

## 2. LE CODE — Pagination côté client

### 2.1 — `TicketsView.vue` (le strict nécessaire)

**a) Dans le `<script setup>`** — ajouter l'état et les calculs :
```js
import { ref, computed, onMounted } from 'vue'   // <-- ajouter computed

// ... état existant (tickets, costs, loading, error) ...

const page = ref(1)            // page courante
const perPage = ref(10)        // tickets par page

// Nombre total de pages (au moins 1)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(tickets.value.length / perPage.value))
)

// Les tickets de la page courante uniquement
const pagedTickets = computed(() => {
  const start = (page.value - 1) * perPage.value
  return tickets.value.slice(start, start + perPage.value)
})

function goTo(p) {
  // borne la valeur entre 1 et totalPages
  page.value = Math.min(totalPages.value, Math.max(1, p))
}
```

**b) Dans le `<template>`** — afficher `pagedTickets` au lieu de `tickets`, puis les boutons :
```vue
<!-- AVANT : v-for="t in tickets"  →  APRÈS : v-for="t in pagedTickets" -->
<tr v-for="t in pagedTickets" :key="t.id">
  <td>{{ t.id }}</td>
  <td>{{ t.name || 'Sans titre' }}</td>
  <td>{{ t.status?.name || t.status }}</td>
  <td class="num">{{ formatCost(costs[t.id]) }} €</td>
</tr>
```

```vue
<!-- Sous le tableau : barre de pagination -->
<div class="pager" v-if="tickets.length">
  <button :disabled="page === 1" @click="goTo(page - 1)">← Précédent</button>
  <span>Page {{ page }} / {{ totalPages }}</span>
  <button :disabled="page === totalPages" @click="goTo(page + 1)">Suivant →</button>
</div>
```

**c) Dans le `<style scoped>`** :
```css
.pager { display: flex; align-items: center; gap: 1rem; margin-top: 1rem; justify-content: center; }
.pager button { padding: 0.4rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px;
  background: #fff; cursor: pointer; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
```

> ⚠️ Détail important : si on supprime/filtre des tickets et que `page`
> dépasse `totalPages`, ajoute après le chargement :
> `if (page.value > totalPages.value) page.value = totalPages.value`

### 2.2 — `Pagination.vue` (composant réutilisable, optionnel mais propre)

Crée `src/components/Pagination.vue` :
```vue
<script setup>
import { computed } from 'vue'

// props = page courante + nb total de pages ; on émet la nouvelle page
const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true }
})
const emit = defineEmits(['update:page'])

// Liste des numéros de page [1,2,3,...]
const pages = computed(() =>
  Array.from({ length: props.totalPages }, (_, i) => i + 1)
)

function change(p) {
  if (p >= 1 && p <= props.totalPages) emit('update:page', p)
}
</script>

<template>
  <div class="pager" v-if="totalPages > 1">
    <button :disabled="page === 1" @click="change(page - 1)">←</button>
    <button
      v-for="p in pages"
      :key="p"
      :class="{ active: p === page }"
      @click="change(p)"
    >{{ p }}</button>
    <button :disabled="page === totalPages" @click="change(page + 1)">→</button>
  </div>
</template>

<style scoped>
.pager { display: flex; gap: 0.4rem; justify-content: center; margin-top: 1rem; }
.pager button { padding: 0.4rem 0.8rem; border: 1px solid #cbd5e1; border-radius: 8px;
  background: #fff; cursor: pointer; }
.pager button.active { background: #0f766e; color: #fff; border-color: #0f766e; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
```

Puis dans `TicketsView.vue` (au lieu des boutons « maison ») :
```vue
<script setup>
import Pagination from '@/components/Pagination.vue'
// ... (garder page, perPage, totalPages, pagedTickets)
</script>

<template>
  <!-- ... tableau avec pagedTickets ... -->
  <Pagination v-model:page="page" :total-pages="totalPages" />
</template>
```
> `v-model:page` ↔ le composant émet `update:page` → la page se met à jour
> automatiquement, et `pagedTickets` se recalcule tout seul (réactivité).

---

## 3. Récap (côté client)

```
1. TicketsView.vue : ajouter page/perPage/totalPages/pagedTickets/goTo
                     + afficher pagedTickets + barre de pagination
2. (optionnel) Pagination.vue : composant réutilisable (v-model:page)
3. (optionnel) GlpiTicketsView.vue : même recette si besoin
```
Aucun changement d'API : on **découpe** la liste déjà chargée.

---

## 4. VARIANTE — Pagination côté serveur (gros volumes)

### A) `glpiApi.js` — `getTickets` accepte un `range`
GLPI v1 lit déjà `range` dans `legacyGetList` (`'0-9999'`).
Pour paginer, expose le range :
```js
export async function getTicketsPage(token, page = 1, perPage = 10) {
  const session = await getSessionToken()
  const start = (page - 1) * perPage
  const end = start + perPage - 1
  const { data, headers } = await legacy.get('/Ticket', {
    headers: { 'Session-Token': session },
    params: { range: `${start}-${end}`, expand_dropdowns: true }
  })
  // GLPI renvoie le total dans l'en-tête "Content-Range: 0-9/57"
  const totalMatch = /\/(\d+)$/.exec(headers['content-range'] || '')
  const total = totalMatch ? Number(totalMatch[1]) : (Array.isArray(data) ? data.length : 0)
  return { items: Array.isArray(data) ? data : (data?.data || []), total }
}
```

### B) `TicketsView.vue` — recharger à chaque page
```js
import { watch } from 'vue'
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

async function load() {
  const t = await glpi.ensureToken()
  const { items, total: tot } = await getTicketsPage(t, page.value, perPage.value)
  tickets.value = items
  total.value = tot
}
watch(page, load)   // recharge quand on change de page
onMounted(load)
```
> Avantage : on ne télécharge que 10 tickets à la fois.
> Inconvénient : le calcul du **coût** (1 requête/ticket) reste à faire
> sur la page affichée seulement.

---

## 5. Conseils

- Mets `perPage` dans un `<select>` (10 / 25 / 50) si tu veux laisser le choix.
- Remets `page = 1` quand l'utilisateur applique un **filtre/recherche**.
- Côté client = le plus simple pour ton volume actuel (2 tickets en démo,
  quelques dizaines en réel). **Commence par là.**
