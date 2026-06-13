# Guide — Créer une nouvelle page Vue (expliqué ligne par ligne)

> Méthode complète pour ajouter une page dans **NewApp**, en suivant
> tes conventions réelles (`<script setup>`, layout, store `glpi`, router,
> garde d'authentification).
> Exemple fil rouge : une page **« Mes tickets »** qui liste les tickets.

---

## Vue d'ensemble : les 4 fichiers touchés

| Étape | Fichier | Rôle |
|---|---|---|
| 1 | `src/views/.../MaPage.vue` *(nouveau)* | la page elle-même |
| 2 | `src/router/index.js` | déclarer la **route** (l'URL) |
| 3 | `components/backoffice/BoLayout.vue` *(ou FoLayout)* | ajouter le **lien** dans le menu |
| 4 | *(rien à créer)* | on **réutilise** le store `glpi` existant |

> Règle : **page → route → lien**. Une page sans route est inaccessible ;
> une route sans lien oblige à taper l'URL à la main.

---

## ÉTAPE 1 — Créer le fichier de la page

Crée `src/views/frontoffice/MesTicketsView.vue`.
Une page Vue a **3 blocs** : `<script setup>`, `<template>`, `<style scoped>`.

### Bloc `<script setup>` (la logique) — ligne par ligne

```vue
<script setup>
import { ref, onMounted } from 'vue'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getTickets } from '@/services/glpiApi'

const glpi = useGlpiStore()

const tickets = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const token = await glpi.ensureToken()
    tickets.value = await getTickets(token)
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
```

| Ligne | Explication |
|---|---|
| `<script setup>` | Mode Composition API simplifié : tout ce qu'on déclare est **automatiquement disponible** dans le `<template>`. C'est ta convention dans tout le projet. |
| `import { ref, onMounted } from 'vue'` | `ref` = crée une variable **réactive** (l'écran se met à jour quand elle change). `onMounted` = un **hook** qui exécute du code juste après l'affichage de la page. |
| `import FoLayout ...` | On importe le **gabarit** FrontOffice (la barre latérale + le cadre). On enveloppera la page dedans. (En BackOffice : `BoLayout`.) |
| `import { useGlpiStore } ...` | On importe le **store Pinia** `glpi` qui gère le token et les appels GLPI. |
| `import { getTickets } ...` | On importe **uniquement** la fonction du service dont on a besoin (lecture des tickets). |
| `const glpi = useGlpiStore()` | On **instancie** le store : `glpi` donne accès à `ensureToken()`, `fetchStats()`, etc. |
| `const tickets = ref([])` | Variable réactive : la **liste** des tickets, vide au départ. |
| `const loading = ref(true)` | `true` tant que les données chargent → permet d'afficher « Chargement… ». |
| `const error = ref('')` | Message d'erreur (vide = pas d'erreur). |
| `async function load()` | Fonction **asynchrone** : on attend (`await`) la réponse de GLPI. |
| `loading.value = true` | ⚠️ Sur une `ref`, on lit/écrit avec **`.value`** dans le `<script>` (pas dans le template). On (re)met le mode chargement. |
| `error.value = ''` | On efface une éventuelle erreur précédente (utile au clic « Réessayer »). |
| `try {` | On tente l'appel réseau ; s'il échoue on ira dans `catch`. |
| `const token = await glpi.ensureToken()` | On récupère le **token** GLPI (le store le crée ou le réutilise). |
| `tickets.value = await getTickets(token)` | Appel API → on **stocke** la liste reçue dans la ref. |
| `catch (e)` | En cas d'erreur réseau/API… |
| `error.value = e.response?.data?.detail \|\| e.message \|\| '...'` | …on affiche le message le plus précis dispo. `?.` = « si ça existe », `\|\|` = « sinon essaie le suivant ». (Convention déjà utilisée dans `ElementsListView`.) |
| `finally {` | S'exécute **toujours** (succès ou échec)… |
| `loading.value = false` | …pour **arrêter** le mode chargement dans tous les cas. |
| `onMounted(load)` | Dès que la page est affichée, on lance `load()` automatiquement. |

### Bloc `<template>` (l'affichage) — ligne par ligne

```vue
<template>
  <FoLayout>
    <h1>Mes tickets</h1>

    <div v-if="loading" class="info">Chargement...</div>
    <div v-else-if="error" class="error">
      {{ error }} <button @click="load">Réessayer</button>
    </div>

    <div v-else>
      <p class="count">{{ tickets.length }} ticket(s)</p>
      <table v-if="tickets.length" class="grid">
        <thead>
          <tr><th>#</th><th>Titre</th><th>Statut</th></tr>
        </thead>
        <tbody>
          <tr v-for="t in tickets" :key="t.id">
            <td>{{ t.id }}</td>
            <td>{{ t.name }}</td>
            <td>{{ t.status?.name || t.status }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="info">Aucun ticket.</p>
    </div>
  </FoLayout>
</template>
```

| Ligne | Explication |
|---|---|
| `<FoLayout> ... </FoLayout>` | Tout le contenu de la page va dans le **slot** du layout (s'affiche dans la zone principale, à côté du menu). |
| `<h1>Mes tickets</h1>` | Le titre de la page. |
| `v-if="loading"` | Affiche ce bloc **seulement si** `loading` est vrai → « Chargement… ». Dans le template, **pas de `.value`** (Vue le gère). |
| `v-else-if="error"` | Sinon, s'il y a une erreur, affiche le message… |
| `{{ error }}` | **Interpolation** : insère la valeur de la variable dans le texte. |
| `<button @click="load">Réessayer</button>` | `@click` = écouteur d'événement : au clic, relance `load()`. |
| `v-else` | Sinon (ni chargement ni erreur) → on affiche les données. |
| `{{ tickets.length }} ticket(s)` | Le **compteur** (longueur du tableau). |
| `<table v-if="tickets.length">` | Affiche le tableau **seulement** s'il y a au moins 1 ticket. |
| `v-for="t in tickets"` | **Boucle** : génère une ligne `<tr>` par ticket. |
| `:key="t.id"` | Clé **unique** obligatoire dans un `v-for` (aide Vue à suivre les éléments). Le `:` = liaison dynamique (valeur = variable, pas texte). |
| `{{ t.name }}` | Affiche un champ du ticket. |
| `{{ t.status?.name \|\| t.status }}` | Avec `expand_dropdowns`, `status` peut être un **objet** `{name}` ou une valeur simple → on gère les deux. |
| `<p v-else>Aucun ticket.</p>` | Si la liste est vide, message à la place du tableau. |

### Bloc `<style scoped>` (le style)

```vue
<style scoped>
h1 { margin-top: 0; }
.info { color: #94a3b8; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; }
.count { color: #64748b; margin-bottom: 0.5rem; }
.grid { width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
th, td { padding: 0.7rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
th { background: #f8fafc; font-size: 0.85rem; color: #475569; }
</style>
```

| Élément | Explication |
|---|---|
| `scoped` | Le style s'applique **uniquement à cette page** (pas de fuite vers les autres). |
| `.info`, `.error`, `.grid`… | Classes réutilisées partout dans le projet → cohérence visuelle. |

---

## ÉTAPE 2 — Déclarer la route (l'URL)

Dans `src/router/index.js` :

```js
// 1) importer la page en haut du fichier
import MesTicketsView from '@/views/frontoffice/MesTicketsView.vue'

// 2) ajouter un objet dans le tableau `routes`
{ path: '/mes-tickets', name: 'mes-tickets', component: MesTicketsView }
```

| Clé | Explication |
|---|---|
| `path: '/mes-tickets'` | L'**URL** tapée dans le navigateur. |
| `name: 'mes-tickets'` | Le **nom interne** de la route (utilisé pour les liens : plus sûr que le path). |
| `component: MesTicketsView` | Le composant **affiché** sur cette URL. |
| `meta: { requiresAuth: true }` *(optionnel)* | **À ajouter** si la page doit être réservée à l'admin connecté (comme `/admin/*`). La garde `beforeEach` redirige alors vers `/login`. Pour une page FrontOffice **publique**, on l'**omet**. |

> ⚠️ Si tu mets `requiresAuth`, la **garde globale** (`router.beforeEach`)
> déjà en place protège la page automatiquement, rien d'autre à coder.

---

## ÉTAPE 3 — Ajouter le lien dans le menu

Dans le layout concerné — ici `components/backoffice/BoLayout.vue`
(ou `FoLayout.vue` pour le FrontOffice) — ajoute une entrée dans `links` :

```js
const links = [
  { name: 'dashboard', label: 'Tableau de bord', icon: '📊' },
  // ... lignes existantes ...
  { name: 'mes-tickets', label: 'Mes tickets', icon: '🎫' }   // <-- AJOUT
]
```

| Clé | Explication |
|---|---|
| `name: 'mes-tickets'` | Doit être **identique** au `name` de la route (étape 2). |
| `label` | Texte affiché dans le menu. |
| `icon` | Petit emoji décoratif. |

Le `<router-link :to="{ name: l.name }">` existant **génère le lien automatiquement** à partir de ce tableau — rien d'autre à modifier.

---

## ÉTAPE 4 — Tester

```powershell
npm run dev
```
- Ouvre l'URL `/mes-tickets` (ou clique sur le lien du menu).
- Vérifie : « Chargement… » puis le tableau.
- Pour vérifier la **compilation** complète avant de livrer :
```powershell
npm run build
```

---

## Récapitulatif (mémo)

```
1. Créer  src/views/.../MaPage.vue   (script setup + template + style scoped)
2. Router  index.js                  → import + { path, name, component }
3. Layout  BoLayout/FoLayout.vue     → ajouter { name, label, icon } dans links
4. Tester  npm run dev / npm run build
```

### Les 5 réflexes à retenir
1. **`<script setup>`** : tout ce qu'on déclare est visible dans le template.
2. **`ref()`** = réactif ; on écrit `.value` **dans le script**, jamais dans le template.
3. **`v-if / v-else`** = afficher selon une condition ; **`v-for + :key`** = liste.
4. **`{{ }}`** = afficher une valeur ; **`@click`** = réagir à un événement ; **`:prop`** = liaison dynamique.
5. **page → route → lien** : les 3 sont nécessaires pour qu'une page soit accessible.
```
