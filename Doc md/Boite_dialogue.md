# Guide — Ajouter une Boîte de Dialogue en Vue.js 3

---

## 📌 Sommaire

1. Boîte de dialogue simple (v-if)
2. Boîte de dialogue avec composant réutilisable
3. Boîte de dialogue de confirmation
4. Boîte de dialogue avec formulaire
5. Boîte de dialogue avec transitions/animations
6. Boîte de dialogue avec composable
7. Tableau récapitulatif

---

## 1. 🟢 Boîte de Dialogue Simple avec `v-if`

C'est la méthode la plus simple.
On affiche/masque la boîte avec une variable booléenne.

```vue
<template>
  <div>

    <!-- ─── Bouton pour ouvrir ─── -->
    <button @click="ouvrirDialog">Ouvrir la boîte</button>

    <!-- ─── Fond sombre (overlay) ─── -->
    <div
      v-if="isOpen"
      class="overlay"
      @click="fermerDialog"
    ></div>

    <!-- ─── Boîte de dialogue ─── -->
    <div v-if="isOpen" class="dialog">

      <!-- En-tête -->
      <div class="dialog-header">
        <h2>Titre de la boîte</h2>
        <button @click="fermerDialog">✕</button>
      </div>

      <!-- Contenu -->
      <div class="dialog-body">
        <p>Contenu de la boîte de dialogue.</p>
      </div>

      <!-- Pied -->
      <div class="dialog-footer">
        <button @click="fermerDialog">Annuler</button>
        <button @click="confirmer">Confirmer</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ─── État de la boîte ───
const isOpen = ref(false)

// ─── Fonctions ───
function ouvrirDialog() {
  isOpen.value = true
}

function fermerDialog() {
  isOpen.value = false
}

function confirmer() {
  console.log('Confirmé !')
  fermerDialog()
}
</script>

<style scoped>
/* ─── Fond sombre ─── */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

/* ─── Boîte de dialogue ─── */
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  padding: 20px;
  width: 400px;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* ─── En-tête ─── */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

/* ─── Corps ─── */
.dialog-body {
  margin-bottom: 15px;
}

/* ─── Pied ─── */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #eee;
  padding-top: 10px;
}
</style>

Composant Dialog.vue:
<!-- composants/Dialog.vue -->
<template>

  <!-- ─── Fond sombre ─── -->
  <div
    v-if="modelValue"
    class="overlay"
    @click="fermerSiCliquable"
  ></div>

  <!-- ─── Boîte de dialogue ─── -->
  <div v-if="modelValue" class="dialog">

    <!-- En-tête -->
    <div class="dialog-header">
      <h2>{{ titre }}</h2>
      <button class="btn-close" @click="fermer">✕</button>
    </div>

    <!-- Contenu dynamique via slot -->
    <div class="dialog-body">
      <slot>
        <!-- Contenu par défaut si aucun slot fourni -->
        <p>Aucun contenu fourni.</p>
      </slot>
    </div>

    <!-- Pied dynamique via slot -->
    <div class="dialog-footer">
      <slot name="footer">
        <!-- Pied par défaut -->
        <button class="btn-annuler" @click="fermer">Annuler</button>
        <button class="btn-confirmer" @click="confirmer">Confirmer</button>
      </slot>
    </div>

  </div>
</template>

<script setup>
// ─── Props reçues du parent ───
const props = defineProps({
  // Contrôle l'ouverture/fermeture (v-model)
  modelValue: {
    type: Boolean,
    default: false
  },
  // Titre de la boîte
  titre: {
    type: String,
    default: 'Boîte de dialogue'
  },
  // Fermer en cliquant sur le fond
  fermerSurOverlay: {
    type: Boolean,
    default: true
  }
})

// ─── Événements émis vers le parent ───
const emit = defineEmits([
  'update:modelValue', // pour v-model
  'confirmer',
  'annuler'
])

// ─── Fonctions ───
function fermer() {
  emit('update:modelValue', false)
  emit('annuler')
}

function confirmer() {
  emit('confirmer')
  emit('update:modelValue', false)
}

function fermerSiCliquable() {
  if (props.fermerSurOverlay) {
    fermer()
  }
}
</script>

<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-width: 400px;
  max-width: 600px;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
}

.btn-close:hover {
  color: #000;
}

.dialog-body {
  margin-bottom: 15px;
  line-height: 1.6;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.btn-annuler {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.btn-annuler:hover {
  background: #f5f5f5;
}

.btn-confirmer {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
}

.btn-confirmer:hover {
  background: #2980b9;
}
</style>

Boite de dialogue de Confirmation:
<!-- composants/DialogConfirmation.vue -->
<template>
  <div v-if="modelValue" class="overlay" @click="annuler"></div>

  <div v-if="modelValue" class="dialog dialog-confirmation">

    <!-- Icône selon le type -->
    <div class="dialog-icone" :class="type">
      <span v-if="type === 'danger'">⚠️</span>
      <span v-else-if="type === 'info'">ℹ️</span>
      <span v-else-if="type === 'succes'">✅</span>
    </div>

    <!-- Contenu -->
    <div class="dialog-body">
      <h3>{{ titre }}</h3>
      <p>{{ message }}</p>
    </div>

    <!-- Boutons -->
    <div class="dialog-footer">
      <button class="btn-non" @click="annuler">
        {{ texteAnnuler }}
      </button>
      <button class="btn-oui" :class="type" @click="confirmer">
        {{ texteConfirmer }}
      </button>
    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  titre: {
    type: String,
    default: 'Confirmation'
  },
  message: {
    type: String,
    default: 'Êtes-vous sûr ?'
  },
  type: {
    type: String,
    default: 'info',
    // 'info', 'danger', 'succes'
    validator: (val) => ['info', 'danger', 'succes'].includes(val)
  },
  texteConfirmer: {
    type: String,
    default: 'Confirmer'
  },
  texteAnnuler: {
    type: String,
    default: 'Annuler'
  }
})

const emit = defineEmits(['update:modelValue', 'confirmer', 'annuler'])

function confirmer() {
  emit('confirmer')
  emit('update:modelValue', false)
}

function annuler() {
  emit('annuler')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.dialog-confirmation {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 380px;
  z-index: 200;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.dialog-icone {
  font-size: 3rem;
  margin-bottom: 15px;
}

.dialog-body h3 {
  margin: 0 0 10px 0;
  font-size: 1.3rem;
}

.dialog-body p {
  color: #666;
  margin: 0;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  margin-top: 25px;
  justify-content: center;
}

.btn-non {
  padding: 10px 24px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-oui {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 0.95rem;
}

.btn-oui.danger  { background: #e74c3c; }
.btn-oui.info    { background: #3498db; }
.btn-oui.succes  { background: #2ecc71; }

.btn-oui.danger:hover  { background: #c0392b; }
.btn-oui.info:hover    { background: #2980b9; }
.btn-oui.succes:hover  { background: #27ae60; }
</style>

Utilisation DialogConfirmation:
<template>
  <div>
    <!-- ─── Boutons de test ─── -->
    <button @click="ouvrirSupprimer">🗑️ Supprimer</button>
    <button @click="ouvrirInfo">ℹ️ Information</button>

    <!-- ─── Dialog de confirmation ─── -->
    <DialogConfirmation
      v-model="isOpen"
      :titre="dialogConfig.titre"
      :message="dialogConfig.message"
      :type="dialogConfig.type"
      :texte-confirmer="dialogConfig.texteConfirmer"
      @confirmer="surConfirmation"
      @annuler="surAnnulation"
    />

    <p v-if="resultat">{{ resultat }}</p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import DialogConfirmation from './composants/DialogConfirmation.vue'

const isOpen = ref(false)
const resultat = ref('')

// ─── Configuration dynamique du dialog ───
const dialogConfig = reactive({
  titre: '',
  message: '',
  type: 'info',
  texteConfirmer: 'Confirmer'
})

// ─── Ouvrir pour suppression ───
function ouvrirSupprimer() {
  dialogConfig.titre = 'Supprimer cet élément'
  dialogConfig.message = 'Cette action est irréversible. Continuer ?'
  dialogConfig.type = 'danger'
  dialogConfig.texteConfirmer = 'Oui, supprimer'
  isOpen.value = true
}

// ─── Ouvrir pour info ───
function ouvrirInfo() {
  dialogConfig.titre = 'Information'
  dialogConfig.message = 'Voici une information importante.'
  dialogConfig.type = 'info'
  dialogConfig.texteConfirmer = 'Compris'
  isOpen.value = true
}

function surConfirmation() {
  resultat.value = '✅ Action confirmée !'
}

function surAnnulation() {
  resultat.value = '❌ Annulé.'
}
</script>

Boite de dialogue avec Formulaire
<!-- composants/DialogFormulaire.vue -->
<template>
  <div v-if="modelValue" class="overlay" @click.self="fermer"></div>

  <div v-if="modelValue" class="dialog">

    <div class="dialog-header">
      <h2>{{ titre }}</h2>
      <button @click="fermer">✕</button>
    </div>

    <div class="dialog-body">
      <!-- ─── Formulaire ─── -->
      <form @submit.prevent="soumettre">

        <div class="champ">
          <label for="nom">Nom *</label>
          <input
            id="nom"
            v-model="formulaire.nom"
            type="text"
            placeholder="Entrez votre nom"
            :class="{ erreur: erreurs.nom }"
          />
          <span v-if="erreurs.nom" class="msg-erreur">
            {{ erreurs.nom }}
          </span>
        </div>

        <div class="champ">
          <label for="email">Email *</label>
          <input
            id="email"
            v-model="formulaire.email"
            type="email"
            placeholder="Entrez votre email"
            :class="{ erreur: erreurs.email }"
          />
          <span v-if="erreurs.email" class="msg-erreur">
            {{ erreurs.email }}
          </span>
        </div>

        <div class="champ">
          <label for="message">Message</label>
          <textarea
            id="message"
            v-model="formulaire.message"
            placeholder="Votre message (optionnel)"
            rows="3"
          ></textarea>
        </div>

        <div class="dialog-footer">
          <button type="button" @click="fermer">Annuler</button>
          <button type="submit">Envoyer</button>
        </div>

      </form>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  titre: {
    type: String,
    default: 'Formulaire'
  }
})

const emit = defineEmits(['update:modelValue', 'soumettre'])

// ─── Données du formulaire ───
const formulaire = reactive({
  nom: '',
  email: '',
  message: ''
})

// ─── Erreurs de validation ───
const erreurs = reactive({
  nom: '',
  email: ''
})

// ─── Validation ───
function valider() {
  erreurs.nom = ''
  erreurs.email = ''
  let valide = true

  if (!formulaire.nom.trim()) {
    erreurs.nom = 'Le nom est obligatoire.'
    valide = false
  }

  if (!formulaire.email.trim()) {
    erreurs.email = "L'email est obligatoire."
    valide = false
  } else if (!formulaire.email.includes('@')) {
    erreurs.email = "L'email n'est pas valide."
    valide = false
  }

  return valide
}

// ─── Soumission ───
function soumettre() {
  if (!valider()) return

  emit('soumettre', { ...formulaire })
  reinitialiser()
  fermer()
}

// ─── Fermeture ───
function fermer() {
  reinitialiser()
  emit('update:modelValue', false)
}

// ─── Réinitialisation ───
function reinitialiser() {
  formulaire.nom = ''
  formulaire.email = ''
  formulaire.message = ''
  erreurs.nom = ''
  erreurs.email = ''
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 8px;
  width: 450px;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.dialog-body {
  padding: 20px;
}

.champ {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.champ label {
  font-weight: 600;
  font-size: 0.9rem;
  color: #333;
}

.champ input,
.champ textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.champ input:focus,
.champ textarea:focus {
  outline: none;
  border-color: #3498db;
}

.champ input.erreur {
  border-color: #e74c3c;
}

.msg-erreur {
  color: #e74c3c;
  font-size: 0.8rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
  margin-top: 10px;
}

.dialog-footer button:first-child {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.dialog-footer button:last-child {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: white;
  cursor: pointer;
}
</style>

Boite de dialogue avec Composable: Permet d'ouvrir un dialog depuis n'importe où dans le code.
// composables/useDialog.js
import { ref, reactive } from 'vue'

export function useDialog() {

  // ─── État global du dialog ───
  const isOpen = ref(false)
  const config = reactive({
    titre: '',
    message: '',
    type: 'info',
    texteConfirmer: 'Confirmer',
    texteAnnuler: 'Annuler'
  })

  // ─── Callbacks ───
  let onConfirmer = null
  let onAnnuler = null

  // ─── Ouvrir le dialog ───
  function ouvrir(options = {}) {
    config.titre          = options.titre          || 'Confirmation'
    config.message        = options.message        || 'Êtes-vous sûr ?'
    config.type           = options.type           || 'info'
    config.texteConfirmer = options.texteConfirmer || 'Confirmer'
    config.texteAnnuler   = options.texteAnnuler   || 'Annuler'
    onConfirmer           = options.onConfirmer    || null
    onAnnuler             = options.onAnnuler      || null
    isOpen.value          = true
  }

  // ─── Confirmer ───
  function confirmer() {
    if (onConfirmer) onConfirmer()
    isOpen.value = false
  }

  // ─── Annuler ───
  function annuler() {
    if (onAnnuler) onAnnuler()
    isOpen.value = false
  }

  return {
    isOpen,
    config,
    ouvrir,
    confirmer,
    annuler
  }
}

┌─────────────────────────────────┐
│  dialog-header                  │
│  ─ Titre            ─ Bouton ✕  │
├─────────────────────────────────┤
│  dialog-body                    │
│  ─ Contenu / Formulaire         │
├─────────────────────────────────┤
│  dialog-footer                  │
│  ─ Bouton Annuler  ─ Confirmer  │
└─────────────────────────────────┘