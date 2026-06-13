# Guide — Méthode d'utilisation des éléments UI (avec exemple projet)

> Comment utiliser checkbox, popup et autres contrôles dans Vue.
> Exemple concret implémenté : **checkbox multiple** pour associer
> plusieurs éléments à un ticket (consigne FrontOffice 2.b).

---

## 1. Méthode générale d'utilisation

### Règle en 3 points
1. **Champ de saisie** (texte, checkbox, select...) → relié à une `ref` via **`v-model`**
2. **Affichage conditionnel** (popup, toast, onglet) → **`v-if`** + une variable d'état
3. **Action** (clic, sélection de fichier) → **`@click`** / **`@change`**

### Choix de la `ref` selon l'élément
| Élément | Type de `ref` | Exemple |
|---|---|---|
| input texte / textarea / select | string | `ref('')` |
| checkbox simple | boolean | `ref(false)` |
| **checkbox multiple** | array | `ref([])` |
| radio | string/number | `ref('Incident')` |
| number | number | `ref(0)` |
| popup/toast/onglet (état) | boolean/string | `ref(false)` / `ref('')` |

---

## 2. Méthode pour CHECKBOX MULTIPLE (le cas du projet)

But : cocher plusieurs éléments et récupérer la liste de leurs `id`.

```vue
<script setup>
import { ref } from 'vue'
const selection = ref([])   // <-- tableau vide au départ
</script>

<template>
  <label v-for="el in elements" :key="el.id">
    <input type="checkbox" :value="el.id" v-model="selection" />
    {{ el.name }}
  </label>
</template>
```

Fonctionnement : avec `v-model` sur un **tableau**, Vue **ajoute** l'`id`
quand on coche et le **retire** quand on décoche.
Résultat : `selection.value` = `[19, 3]` (les id cochés).

---

## 3. Méthode pour POPUP / MODALE

```vue
<script setup>
import { ref } from 'vue'
const show = ref(false)
</script>

<template>
  <button @click="show = true">Ouvrir</button>

  <div v-if="show" class="overlay" @click.self="show = false">
    <div class="modal">
      <h2>Titre</h2>
      <p>Contenu...</p>
      <button @click="show = false">Fermer</button>
    </div>
  </div>
</template>
```
- `v-if="show"` : la modale n'existe que si `show` est vrai.
- `@click.self` : cliquer sur le fond (overlay) ferme la modale.

CSS minimal :
```css
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { background: #fff; padding: 1.5rem; border-radius: 12px; width: 420px; }
```

---

## 4. EXEMPLE COMPLET DU PROJET — CreateTicketView.vue

Fonctionnalité : créer un ticket + associer plusieurs éléments (checkbox multiple).
Fichier livré : `src/views/frontoffice/CreateTicketView.vue` (testé, compile).

### Les couches touchées (rappel : bottom-up)
| Étape | Couche | Action |
|---|---|---|
| 1 | Config | rien (fonctions API déjà présentes) |
| 2 | Service | réutilise `getComputers`, `getMonitors`, `createTicket`, `linkItemToTicket` |
| 3 | Store | réutilise `glpi.ensureToken()` |
| 4 | Router | ajouter la route `/nouveau-ticket` (publique) |
| 5 | Vue | CreateTicketView (checkbox multiple) |

### Logique clé (script)
```js
const selection = ref([])   // ids cochés via v-model

async function submit() {
  const t = await glpi.ensureToken()
  // 1) créer le ticket (statut Nouveau)
  const res = await createTicket(t, { name: titre.value, content: description.value, status: 1 })
  const ticketId = res.id || res
  // 2) lier CHAQUE élément coché
  for (const id of selection.value) {
    const el = elements.value.find((e) => e.id === id)
    if (el) await linkItemToTicket(t, ticketId, el.itemtype, el.id)
  }
}
```

### Template clé (checkbox multiple)
```vue
<label v-for="el in filtered" :key="el.itemtype + '-' + el.id" class="el-row">
  <input type="checkbox" :value="el.id" v-model="selection" />
  <span>{{ el.name }}</span>
  <small>{{ el.itemtype }}</small>
</label>
```

### Résultat
- L'utilisateur saisit titre + description
- coche plusieurs éléments (avec un filtre de recherche)
- clique « Créer le ticket »
- → le ticket est créé dans GLPI, puis chaque élément coché est lié
  (table `glpi_items_tickets`)

### Route à ajouter (étape 4)
```js
import CreateTicketView from '@/views/frontoffice/CreateTicketView.vue'
// ...
{ path: '/nouveau-ticket', name: 'fo-create-ticket', component: CreateTicketView }
```
Et un lien dans `FoLayout.vue` :
```js
{ name: 'fo-create-ticket', label: 'Nouveau ticket', icon: '🎫' }
```

---

## 5. Vérification en base après création

```sql
-- Le ticket créé
SELECT id, name, status FROM glpi_tickets ORDER BY id DESC LIMIT 1;

-- Les éléments liés (doit lister les éléments cochés)
SELECT it.itemtype, it.items_id
FROM glpi_items_tickets it
WHERE it.tickets_id = <ID_DU_TICKET>;
```

---

## 6. Autres éléments — méthode rapide

| Élément | Variable | Déclencheur |
|---|---|---|
| Radio (type ticket) | `ref('Incident')` | v-model |
| Select (technicien) | `ref('')` | v-model |
| Toast (succès) | `ref('')` + setTimeout | après action |
| Onglets (fiche) | `ref('details')` | @click + v-if |
| Color (Kanban) | `ref('#fff')` | v-model |

Toujours la même logique : **v-model** pour saisir, **v-if** pour afficher,
**@click/@change** pour agir.


coût_ligne = cost_fixed + cost_material + (actiontime / 3600) × cost_time
coût_ticket = somme des lignes

J'ai testé sur ton ticket #1 (Feuille 3) :

Ligne 1 : 109 + 0 + (0/3600 × 0) = 109,00
Ligne 2 : 50 + 0 + (600/3600 × 8,7) = 51,45
Total = 160,45 € ✅
Le point important : un ticket a plusieurs lignes de coût (ton ticket #1 en a 2), il faut donc bien les additionner.