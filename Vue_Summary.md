# Résumé Vue 3 — Guide condensé

Ce fichier fournit un résumé structuré des concepts clés de Vue 3 et des liens officiels pour approfondir. Il n'a pas pour but de reproduire la documentation complète, mais d'en donner l'essentiel pour démarrer.

---

## Liens officiels
- Site principal : https://vuejs.org/
- Guide Vue 3 (Getting Started) : https://vuejs.org/guide/introduction.html
- API Reference : https://vuejs.org/api/
- Composition API : https://vuejs.org/guide/essentials/composition-api-introduction.html
- Single File Components (SFC) : https://vuejs.org/guide/scaling-up/sfc.html
- Vue Router : https://router.vuejs.org/
- Pinia (state management recommandé) : https://pinia.vuejs.org/
- Vite (outil de bundling recommandé) : https://vitejs.dev/

---

## 1. Introduction rapide

Vue 3 est un framework JavaScript progressif pour construire des interfaces utilisateur. Il se concentre sur la réactivité, la composition fonctionnelle (Composition API), et la construction de composants réutilisables.

## 2. Concepts clés

- Réactivité : `reactive`, `ref`, `computed`, `watch` — primitives pour créer et suivre l'état réactif.
- Composition API : fonctions `setup()` permettant d'organiser la logique par feature plutôt que par option.
- Options API : syntaxe historique (`data`, `methods`, `computed`, `mounted`) toujours supportée.
- Single File Components (SFC) : fichiers `.vue` combinant template, script et style.

## 3. Réactivité (essentiel)

- `ref(value)` : crée une référence réactive contenant une valeur primitive ou objet léger ; accéder via `.value` dans JS.
- `reactive(obj)` : rend un objet profondément réactif (proxy).
- `computed(() => ...)` : valeur dérivée réactive.
- `watch(source, cb)` : observe des valeurs ou getters et exécute une fonction de rappel.

Exemple minimal (Composition API) :

```js
import { ref, computed } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    function inc() { count.value++ }
    return { count, double, inc }
  }
}
```

## 4. Composants

- Définition : composants fonctionnels via SFC ou objets.
- Props / Emits : déclarer les `props` et émettre des événements (`emit`).
- Slots : insertion de contenu (nommés, par défaut, scoped slots).
- Lifecycle hooks : `onMounted`, `onUnmounted`, `onUpdated`, etc. (Composition API).

## 5. Template et directives

- Syntaxe Mustache pour interpolation (`{{ ... }}`).
- Directives courantes : `v-if`, `v-for`, `v-bind` (`:`), `v-on` (`@`), `v-model`.
- `v-model` : liaison bidirectionnelle, personnalisable pour composants.

## 6. Router et navigation

- `vue-router` gère les routes, lazy-loading, navigation programmée et guards.
- Définir routes dans un `createRouter` puis fournir via `app.use(router)`.

## 7. State management (Pinia)

- Pinia remplace Vuex comme solution officielle recommandée pour Vue 3.
- Stores modulaires, TypeScript-friendly et simple à utiliser via `defineStore`.

## 8. Outils et CLI

- Vite : outil de dev et bundler recommandé (rapide, HMR efficace).
- Créer un projet :

```bash
npm create vite@latest my-vue-app -- --template vue
cd my-vue-app
npm install
npm run dev
```

## 9. Single File Components (.vue)

- Structure : `<template>`, `<script setup>` ou `<script>`, `<style>`.
- `script setup` : syntaxe concise pour Composition API et meilleure ergonomie.

Exemple `script setup` :

```vue
<template>
  <button @click="inc">Count: {{ count }}</button>
  <p>Double: {{ double }}</p>
</template>

<script setup>
import { ref, computed } from 'vue'
const count = ref(0)
const double = computed(() => count.value * 2)
function inc() { count.value++ }
</script>

<style scoped>
button { padding: 0.5rem 1rem }
</style>
```

## 10. TypeScript

- Vue 3 et Vite offrent d'excellentes intégrations TypeScript.
- Utiliser `defineComponent`, `PropType`, ou `script setup lang="ts"` pour meilleure ergonomie.

## 11. Asynchronous UI patterns

- `Suspense` pour le rendu asynchrone.
- Lazy-loading de composants (`defineAsyncComponent`).

## 12. Interopération et intégration

- Intégrer des bibliothèques JS classiques.
- Utiliser `provide` / `inject` pour propager des dépendances sans passer de props en cascade.

## 13. Bonnes pratiques

- Organiser la logique avec la Composition API pour la réutilisabilité.
- Garder les composants petits et focalisés.
- Centraliser les appels réseau dans des services (API layer).
- Utiliser Pinia pour l'état partagé.

## 14. Déploiement

- Construire pour la production : `npm run build` (Vite) et servir le dossier `dist`.
- Configurer le routing côté serveur si vous utilisez le mode history de `vue-router`.

---

## Ressources d'apprentissage recommandées
- Guide officiel (français/anglais) : https://vuejs.org/
- Cookbook & Examples : https://vuejs.org/guide/introduction.html#learn-vue
- Vue Mastery / Vue School (cours payants / gratuits) pour approfondir.

---

Si tu veux, je peux :
- générer un `template` de projet Vue 3 minimal avec Vite et Pinia, ou
- ajouter un petit exemple d'import CSV + stockage local SQLite (via Electron ou IndexedDB + sql.js) selon ton besoin.
