<template>
  <div>
    <!-- ─── Utilisation de la fonction dans le template ─── -->
    <p>{{ message }}</p>
    <button @click="direBonjour">Dire Bonjour</button>
    <button @click="direAuRevoir">Dire Au Revoir</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('')

// ─── Écriture d'une fonction simple ───
function direBonjour() {
  message.value = 'Bonjour tout le monde !'
}

// ─── Fonction fléchée ───
const direAuRevoir = () => {
  message.value = 'Au revoir !'
}
</script>

<script setup>
import { ref } from 'vue'

const resultat = ref('')

// ─── 1. Fonction classique ───
function additionner(a, b) {
  return a + b
}

// ─── 2. Fonction fléchée ───
const multiplier = (a, b) => {
  return a * b
}

// ─── 3. Fonction fléchée courte (return implicite) ───
const diviser = (a, b) => a / b

// ─── 4. Fonction avec valeur par défaut ───
function saluer(nom = 'Visiteur') {
  return `Bonjour ${nom} !`
}

// ─── 5. Fonction asynchrone ───
async function chargerDonnees() {
  const reponse = await fetch('https://api.exemple.com/data')
  const data = await reponse.json()
  return data
}

// ─── Utilisation des fonctions ───
function calculer() {
  const somme = additionner(5, 3)        // 8
  const produit = multiplier(4, 2)       // 8
  const quotient = diviser(10, 2)        // 5
  const message = saluer('Alice')        // "Bonjour Alice !"

  resultat.value = `Somme: ${somme}, Produit: ${produit}`
}
</script>

<template>
  <div>
    <button @click="calculer">Calculer</button>
    <p>{{ resultat }}</p>
  </div>
</template>

<template>
  <div>
    <!-- ─── Appel avec paramètre direct ─── -->
    <button @click="direBonjour('Alice')">Bonjour Alice</button>
    <button @click="direBonjour('Bob')">Bonjour Bob</button>

    <!-- ─── Appel avec paramètre dynamique ─── -->
    <input v-model="nom" placeholder="Entrez un nom" />
    <button @click="direBonjour(nom)">Saluer</button>

    <!-- ─── Appel avec event ─── -->
    <input @keyup="surTouche($event)" placeholder="Tapez ici" />

    <!-- ─── Appel dans une boucle ─── -->
    <ul>
      <li
        v-for="item in liste"
        :key="item.id"
      >
        {{ item.nom }}
        <button @click="supprimer(item.id)">❌</button>
      </li>
    </ul>

    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('')
const nom = ref('')
const liste = ref([
  { id: 1, nom: 'Pomme' },
  { id: 2, nom: 'Banane' },
  { id: 3, nom: 'Orange' }
])

// ─── Fonction avec paramètre ───
function direBonjour(prenom) {
  message.value = `Bonjour ${prenom} !`
}

// ─── Fonction avec event ───
function surTouche(event) {
  message.value = `Touche appuyée : ${event.key}`
}

// ─── Fonction pour supprimer un item ───
function supprimer(id) {
  liste.value = liste.value.filter(item => item.id !== id)
}
</script>

<template>
  <div>
    <p>Compteur : {{ count }}</p>
    <p>Double : {{ doubled }}</p>
    <p>Résultat : {{ resultat }}</p>

    <button @click="incrementer">+1</button>
    <button @click="decrementer">-1</button>
    <button @click="reinitialiser">Reset</button>
    <button @click="definirValeur(10)">Mettre à 10</button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ─── Données réactives ───
const count = ref(0)
const resultat = ref('')

// ─── Propriété calculée (mise en cache) ───
const doubled = computed(() => count.value * 2)

// ─── Fonctions qui modifient les données réactives ───
function incrementer() {
  count.value++
  mettreAjourResultat()
}

function decrementer() {
  count.value--
  mettreAjourResultat()
}

function reinitialiser() {
  count.value = 0
  resultat.value = 'Compteur réinitialisé !'
}

// ─── Fonction avec paramètre ───
function definirValeur(valeur) {
  count.value = valeur
}

// ─── Fonction utilitaire appelée par d'autres fonctions ───
function mettreAjourResultat() {
  if (count.value > 0) {
    resultat.value = 'Positif ✅'
  } else if (count.value < 0) {
    resultat.value = 'Négatif ❌'
  } else {
    resultat.value = 'Zéro ⚪'
  }
}
</script>

<template>
  <div>
    <!-- ─── État du chargement ─── -->
    <p v-if="isLoading">Chargement en cours... ⏳</p>
    <p v-if="erreur">Erreur : {{ erreur }} ❌</p>

    <!-- ─── Affichage des données ─── -->
    <ul v-if="utilisateurs.length > 0">
      <li v-for="user in utilisateurs" :key="user.id">
        {{ user.name }} — {{ user.email }}
      </li>
    </ul>

    <button @click="chargerUtilisateurs" :disabled="isLoading">
      Charger les utilisateurs
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const utilisateurs = ref([])
const isLoading = ref(false)
const erreur = ref('')

// ─── Fonction asynchrone avec gestion d'erreur ───
async function chargerUtilisateurs() {
  // Réinitialisation
  isLoading.value = true
  erreur.value = ''

  try {
    // Appel API
    const reponse = await fetch('https://jsonplaceholder.typicode.com/users')

    // Vérification de la réponse
    if (!reponse.ok) {
      throw new Error('Erreur lors du chargement')
    }

    // Conversion en JSON
    const data = await reponse.json()
    utilisateurs.value = data

  } catch (e) {
    erreur.value = e.message

  } finally {
    // Toujours exécuté
    isLoading.value = false
  }
}
</script>

<!-- composants/BoutonAction.vue -->
<template>
  <div>
    <input v-model="texte" placeholder="Entrez un texte" />
    <button @click="envoyer">Envoyer au parent</button>
    <button @click="annuler">Annuler</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ─── Déclaration des événements émis ───
const emit = defineEmits(['envoyer', 'annuler'])

const texte = ref('')

// ─── Fonction qui émet vers le parent ───
function envoyer() {
  if (texte.value.trim()) {
    emit('envoyer', texte.value) // envoie la valeur au parent
    texte.value = ''             // réinitialise le champ
  }
}

function annuler() {
  texte.value = ''
  emit('annuler') // émet sans valeur
}
</script>

<!-- App.vue -->
<template>
  <div>
    <h1>Messages reçus :</h1>

    <!-- ─── Écoute des événements de l'enfant ─── -->
    <BoutonAction
      @envoyer="recevoirMessage"
      @annuler="surAnnulation"
    />

    <ul>
      <li v-for="(msg, index) in messages" :key="index">
        {{ msg }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BoutonAction from './composants/BoutonAction.vue'

const messages = ref([])

// ─── Fonctions qui reçoivent les événements de l'enfant ───
function recevoirMessage(texte) {
  messages.value.push(texte)
}

function surAnnulation() {
  console.log('Action annulée')
}
</script>

// composables/useCalculatrice.js
import { ref } from 'vue'

export function useCalculatrice() {
  const resultat = ref(0)
  const historique = ref([])

  // ─── Fonctions réutilisables ───
  function additionner(a, b) {
    resultat.value = a + b
    historique.value.push(`${a} + ${b} = ${resultat.value}`)
  }

  function soustraire(a, b) {
    resultat.value = a - b
    historique.value.push(`${a} - ${b} = ${resultat.value}`)
  }

  function multiplier(a, b) {
    resultat.value = a * b
    historique.value.push(`${a} × ${b} = ${resultat.value}`)
  }

  function diviser(a, b) {
    if (b === 0) {
      console.error('Division par zéro impossible !')
      return
    }
    resultat.value = a / b
    historique.value.push(`${a} ÷ ${b} = ${resultat.value}`)
  }

  function reinitialiser() {
    resultat.value = 0
    historique.value = []
  }

  return {
    resultat,
    historique,
    additionner,
    soustraire,
    multiplier,
    diviser,
    reinitialiser
  }
}

<!-- Utilisation du composable -->
<template>
  <div>
    <p>Résultat : {{ resultat }}</p>

    <button @click="additionner(10, 5)">10 + 5</button>
    <button @click="soustraire(10, 5)">10 - 5</button>
    <button @click="multiplier(10, 5)">10 × 5</button>
    <button @click="diviser(10, 5)">10 ÷ 5</button>
    <button @click="reinitialiser">Reset</button>

    <h3>Historique :</h3>
    <ul>
      <li v-for="(h, index) in historique" :key="index">
        {{ h }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useCalculatrice } from '@/composables/useCalculatrice'

// ─── Déstructuration du composable ───
const {
  resultat,
  historique,
  additionner,
  soustraire,
  multiplier,
  diviser,
  reinitialiser
} = useCalculatrice()
</script>

 Règle d'or :

Fonction utilisée dans un seul composant → <script setup>
Fonction utilisée dans plusieurs composants → Composable
Fonction sans réactivité → fichier utilitaire utils/