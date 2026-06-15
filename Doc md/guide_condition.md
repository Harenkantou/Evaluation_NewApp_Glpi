# Guide des Conditions en Vue.js 3

---

## 📌 Sommaire

1. v-if
2. v-else
3. v-else-if
4. v-show
5. Différence entre v-if et v-show
6. Conditions dans le JavaScript (script setup)
7. Conditions avec les listes (v-for + v-if)
8. Conditions avec les opérateurs
9. Conditions avec computed
10. Exemples concrets complets
11. Tableau récapitulatif

---

## 1. 🟢 `v-if` — Afficher/Masquer un élément

`v-if` **ajoute ou retire** l'élément du DOM selon la condition.
Si la condition est `false`, l'élément **n'existe pas** dans le DOM.

### Syntaxe de base

```vue
<template>
  <div>
    <!-- ─── Condition simple ─── -->
    <p v-if="estConnecte">Bienvenue, vous êtes connecté ✅</p>

    <!-- ─── Condition avec une valeur ─── -->
    <p v-if="age >= 18">Vous êtes majeur ✅</p>

    <!-- ─── Condition avec une chaîne ─── -->
    <p v-if="nom !== ''">Bonjour {{ nom }} !</p>

    <!-- ─── Condition avec un tableau ─── -->
    <p v-if="items.length > 0">Il y a {{ items.length }} éléments</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const estConnecte = ref(true)
const age = ref(20)
const nom = ref('Alice')
const items = ref(['Pomme', 'Banane', 'Orange'])
</script>

Exemple: Afficher profil user:
<template>
  <div>
    <!-- ─── Afficher le profil seulement si connecté ─── -->
    <div v-if="estConnecte" class="profil">
      <h2>Mon Profil</h2>
      <p>Nom : {{ utilisateur.nom }}</p>
      <p>Email : {{ utilisateur.email }}</p>
      <button @click="seDeconnecter">Se déconnecter</button>
    </div>

    <!-- ─── Bouton de connexion si non connecté ─── -->
    <div v-if="!estConnecte">
      <p>Vous n'êtes pas connecté.</p>
      <button @click="seConnecter">Se connecter</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const estConnecte = ref(false)

const utilisateur = reactive({
  nom: 'Alice Dupont',
  email: 'alice@exemple.com'
})

function seConnecter() {
  estConnecte.value = true
}

function seDeconnecter() {
  estConnecte.value = false
}
</script>


v-else doit toujours être placé juste après un v-if ou v-else-if.
Il s'affiche quand la condition du v-if est false.

<template>
  <div>
    <p v-if="estConnecte">Vous êtes connecté ✅</p>
    <p v-else>Vous n'êtes pas connecté ❌</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const estConnecte = ref(false)
</script>


Exemple:
<template>
  <div>
    <h2>{{ produit.nom }}</h2>
    <p>Prix : {{ produit.prix }} €</p>

    <!-- ─── Affichage selon le stock ─── -->
    <div v-if="produit.stock > 0">
      <p class="en-stock">✅ En stock ({{ produit.stock }} restants)</p>
      <button @click="acheter">Ajouter au panier</button>
    </div>
    <div v-else>
      <p class="hors-stock">❌ Produit épuisé</p>
      <button disabled>Indisponible</button>
    </div>

    <p v-if="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const produit = reactive({
  nom: 'Casque Audio',
  prix: 49.99,
  stock: 3
})

const message = ref('')

function acheter() {
  if (produit.stock > 0) {
    produit.stock--
    message.value = '✅ Produit ajouté au panier !'
  }
}
</script>