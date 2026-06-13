# Guide — Ajouter une fonctionnalité (ordre des couches)

> Architecture en couches Vue : la règle d'or est d'aller **du bas vers le haut**
> (de la donnée vers l'écran). On pose d'abord les fondations, puis on remonte.

---

## 1. Le principe : bottom-up

```
5️⃣ VUE        ← EN DERNIER (l'écran utilise tout le reste)
4️⃣ ROUTER     ← si nouvelle page
3️⃣ STORE      ← orchestration / état partagé
2️⃣ SERVICE    ← accès données / API
1️⃣ CONFIG     ← EN PREMIER (dépendance npm, .env, réglage GLPI)
```

**Pourquoi ?** Chaque couche dépend de celle du dessous. Si on commençait par la
vue, elle appellerait des fonctions inexistantes → on code « dans le vide ».
En partant du bas, **chaque couche est testable** avant de passer à la suivante.

---

## 2. Les 5 étapes (pour CHAQUE fonctionnalité)

| Ordre | Couche | Question à se poser |
|---|---|---|
| 1 | **Config / Prérequis** | Faut-il une dépendance npm, une variable `.env`, un droit GLPI ? |
| 2 | **Service** (`services/`) | Quelle fonction parle à l'API / SQLite / fichiers ? |
| 3 | **Store** (`stores/`) | Faut-il orchestrer ou partager un état entre vues ? |
| 4 | **Router** (`router/`) | Faut-il une nouvelle page / route ? |
| 5 | **Vue + Composant** | Comment l'utilisateur déclenche-t-il l'action ? |

### Les 3 questions pour savoir où commencer
1. Ça touche des données externes (GLPI/SQLite/fichiers) ? → **oui = commencer par Service**
2. Un état doit être partagé entre vues ? → **oui = ajouter au Store**
3. C'est une nouvelle page ? → **oui = ajouter une Route**

### Tester à chaque étape
| Après… | Test |
|---|---|
| Service | `console.log(await maFonction(...))` ou curl |
| Store | appel depuis la console navigateur |
| Vue | clic réel dans l'interface |

### ⚠️ Piège à éviter
Ne JAMAIS commencer par la Vue si la fonctionnalité a besoin de données :
sinon le bouton appelle une fonction qui n'existe pas encore.

---

## 3. EXEMPLE COMPLET : « Exporter les éléments en CSV »

Fonctionnalité : un bouton dans `ElementsListView` qui télécharge la liste
(filtrée) des éléments au format CSV.

### ── ÉTAPE 1 — Config / Prérequis
Rien à installer : c'est du JavaScript pur (Blob + lien de téléchargement).
✅ Étape passée.

### ── ÉTAPE 2 — Service : `src/services/export.js` (NOUVEAU fichier)

```js
// src/services/export.js
// Génère un CSV à partir de lignes + colonnes, et le télécharge.

/**
 * Construit un Blob CSV.
 * @param {Array<Object>} rows     les données
 * @param {Array<string>} columns  les clés à exporter (= colonnes)
 * @returns {Blob}
 */
export function exportToCsv(rows, columns) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = columns.map(escape).join(',')
  const lines = (rows || []).map((r) => columns.map((c) => escape(r[c])).join(','))
  const content = [header, ...lines].join('\n')
  return new Blob([content], { type: 'text/csv;charset=utf-8' })
}

/**
 * Déclenche le téléchargement d'un Blob.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

Test rapide (console navigateur) :
```js
import { exportToCsv, downloadBlob } from '@/services/export'
downloadBlob(exportToCsv([{a:1,b:2}], ['a','b']), 'test.csv')
```

### ── ÉTAPE 3 — Store
Rien : pas d'état à partager, pas d'appel API. ✅ Étape passée.

### ── ÉTAPE 4 — Router
Rien : on ajoute un bouton dans une page existante, pas de nouvelle route.
✅ Étape passée.

### ── ÉTAPE 5 — Vue : modifier `ElementsListView.vue`

1) Importer le service :
```js
import { exportToCsv, downloadBlob } from '@/services/export'
```

2) Ajouter une méthode (dans `<script setup>`) :
```js
function exportElements() {
  // 'filtered' est la liste déjà filtrée affichée à l'écran
  const columns = ['name', 'type', 'location', 'manufacturer', 'status', 'user']
  const blob = exportToCsv(filtered.value, columns)
  downloadBlob(blob, 'elements.csv')
}
```

3) Ajouter le bouton (dans `<template>`, près de la barre de recherche) :
```vue
<button class="reset" @click="exportElements">⬇️ Exporter CSV</button>
```

✅ Terminé. L'utilisateur clique → le CSV des éléments filtrés se télécharge.

---

## 4. Récapitulatif de l'ordre pour vos améliorations

| Amélioration | 1.Config | 2.Service | 3.Store | 4.Router | 5.Vue |
|---|---|---|---|---|---|
| Export CSV (exemple) | — | ✅ export.js | — | — | ✅ bouton |
| Éditer ticket | droit GLPI | ✅ updateTicket | optionnel | — | ✅ modale |
| Filtres Kanban | — | — | — | — | ✅ |
| Pagination | — | ✅ getTicketsPaged | optionnel | — | ✅ |
| Graphiques | lib chart? | ✅ buildChartData | — | — | ✅ |
| i18n | — | ✅ useI18n | optionnel | — | ✅ |
| Images élément | — | ✅ getItemDocuments | — | — | ✅ fiche |
| Toasts | — | — | ✅ toastStore | — | ✅ global |
| Historique réouverture | — | ✅ sqliteService | — | — | ✅ modale |

> Le code prêt à l'emploi de ces fonctions est dans `ameliorations.js`.

---

## 5. Mémo en une phrase

> **Config → Service → Store → Router → Vue.**
> On descend poser les fondations, puis on remonte vers l'écran,
> en testant chaque couche avant la suivante.
