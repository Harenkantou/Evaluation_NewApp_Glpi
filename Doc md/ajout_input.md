# Guide Complet — Input Import de Fichier en Vue.js 3

---

## 📌 Sommaire

1. Input fichier simple
2. Afficher les informations du fichier
3. Prévisualisation d'image
4. Import de plusieurs fichiers
5. Glisser-Déposer (Drag & Drop)
6. Validation des fichiers
7. Upload vers un serveur
8. Composant réutilisable
9. Tableaux récapitulatifs

---

## 1. 🟢 Input Fichier Simple

La façon la plus basique d'importer un fichier.

```vue
<template>
  <div>
    <!-- ─── Input fichier natif ─── -->
    <input
      type="file"
      @change="surSelectionFichier"
    />

    <!-- ─── Affichage du fichier sélectionné ─── -->
    <div v-if="fichier">
      <p>📄 Nom : {{ fichier.name }}</p>
      <p>📦 Taille : {{ formaterTaille(fichier.size) }}</p>
      <p>🗂️ Type : {{ fichier.type }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// ─── Stocker le fichier sélectionné ───
const fichier = ref(null)

// ─── Fonction déclenchée quand l'utilisateur choisit un fichier ───
function surSelectionFichier(event) {
  // event.target.files est une liste de fichiers
  // [0] pour prendre le premier (et unique ici)
  fichier.value = event.target.files[0]
}

// ─── Formater la taille en Ko, Mo, Go ───
function formaterTaille(octets) {
  if (octets < 1024)
    return `${octets} octets`
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(2)} Ko`
  if (octets < 1024 * 1024 * 1024)
    return `${(octets / (1024 * 1024)).toFixed(2)} Mo`
  return `${(octets / (1024 * 1024 * 1024)).toFixed(2)} Go`
}
</script>
```

---

## 2. 📋 Afficher les Informations du Fichier

```vue
<template>
  <div class="container">

    <!-- ─── Bouton personnalisé pour choisir un fichier ─── -->
    <!-- L'input est caché, le bouton le déclenche via ref ─── -->
    <button @click="inputRef.click()" class="btn-choisir">
      📁 Choisir un fichier
    </button>

    <!-- ─── Input caché (ref pour le déclencher) ─── -->
    <input
      ref="inputRef"
      type="file"
      style="display: none"
      @change="surSelectionFichier"
    />

    <!-- ─── Carte d'informations ─── -->
    <div v-if="fichier" class="carte-fichier">
      <h3>📄 Informations du fichier</h3>

      <table>
        <tbody>
          <tr>
            <td><strong>Nom</strong></td>
            <td>{{ fichier.name }}</td>
          </tr>
          <tr>
            <td><strong>Taille</strong></td>
            <td>{{ formaterTaille(fichier.size) }}</td>
          </tr>
          <tr>
            <td><strong>Type</strong></td>
            <td>{{ fichier.type || 'Inconnu' }}</td>
          </tr>
          <tr>
            <td><strong>Dernière modification</strong></td>
            <td>{{ formaterDate(fichier.lastModified) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ─── Bouton pour supprimer la sélection ─── -->
      <button @click="supprimerFichier" class="btn-supprimer">
        🗑️ Supprimer
      </button>
    </div>

    <p v-else class="aucun-fichier">
      Aucun fichier sélectionné.
    </p>

  </div>
</template>

<script setup>
import { ref } from 'vue'

// ─── Référence à l'input HTML ───
const inputRef = ref(null)

// ─── Fichier sélectionné ───
const fichier = ref(null)

// ─── Sélection du fichier ───
function surSelectionFichier(event) {
  const fichierChoisi = event.target.files[0]
  if (fichierChoisi) {
    fichier.value = fichierChoisi
  }
}

// ─── Supprimer la sélection ───
function supprimerFichier() {
  fichier.value = null
  // ─── Réinitialiser l'input pour permettre
  //     de re-sélectionner le même fichier ───
  if (inputRef.value) {
    inputRef.value.value = ''
  }
}

// ─── Formater la taille ───
function formaterTaille(octets) {
  if (octets < 1024)
    return `${octets} octets`
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(2)} Ko`
  if (octets < 1024 * 1024 * 1024)
    return `${(octets / (1024 * 1024)).toFixed(2)} Mo`
  return `${(octets / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

// ─── Formater la date ───
function formaterDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.container { max-width: 500px; margin: 0 auto; padding: 20px; }

.btn-choisir {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}
.btn-choisir:hover { background: #2980b9; }

.carte-fichier {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
}
.carte-fichier h3 { margin: 0 0 12px 0; }

table { width: 100%; border-collapse: collapse; }
td {
  padding: 8px;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}
td:first-child { width: 40%; color: #555; }

.btn-supprimer {
  margin-top: 12px;
  padding: 8px 16px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-supprimer:hover { background: #c0392b; }

.aucun-fichier { color: #6c757d; margin-top: 12px; }
</style>
```

---

## 3. 🖼️ Prévisualisation d'Image

```vue
<template>
  <div class="container">

    <!-- ─── Zone de sélection ─── -->
    <div class="zone-upload" @click="inputRef.click()">
      <!-- ─── Prévisualisation si image sélectionnée ─── -->
      <img
        v-if="apercu"
        :src="apercu"
        alt="Aperçu"
        class="apercu-image"
      />

      <!-- ─── Placeholder si aucune image ─── -->
      <div v-else class="placeholder">
        <span class="icone">🖼️</span>
        <p>Cliquer pour choisir une image</p>
        <small>JPG, PNG, GIF, WEBP — Max 5 Mo</small>
      </div>
    </div>

    <!-- ─── Input caché ─── -->
    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="surSelectionImage"
    />

    <!-- ─── Informations de l'image ─── -->
    <div v-if="fichier" class="infos-image">
      <p>📄 {{ fichier.name }}</p>
      <p>📦 {{ formaterTaille(fichier.size) }}</p>

      <div class="boutons">
        <button @click="inputRef.click()" class="btn-changer">
          🔄 Changer
        </button>
        <button @click="supprimerImage" class="btn-supprimer">
          🗑️ Supprimer
        </button>
      </div>
    </div>

    <!-- ─── Message d'erreur ─── -->
    <p v-if="erreur" class="erreur">❌ {{ erreur }}</p>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const inputRef = ref(null)
const fichier  = ref(null)
const apercu   = ref('')
const erreur   = ref('')

// ─── Types autorisés ───
const TYPES_AUTORISES = ['image/jpeg', 'image/png',
                         'image/gif', 'image/webp']
const TAILLE_MAX = 5 * 1024 * 1024 // 5 Mo en octets

function surSelectionImage(event) {
  erreur.value = ''
  const img = event.target.files[0]

  // ─── Validation du type ───
  if (!img) return

  if (!TYPES_AUTORISES.includes(img.type)) {
    erreur.value = 'Type non autorisé. Utilisez JPG, PNG, GIF ou WEBP.'
    return
  }

  // ─── Validation de la taille ───
  if (img.size > TAILLE_MAX) {
    erreur.value = 'L\'image dépasse 5 Mo.'
    return
  }

  fichier.value = img

  // ─── Créer l'URL de prévisualisation ───
  // FileReader lit le fichier et crée une URL base64
  const reader = new FileReader()
  reader.onload = (e) => {
    apercu.value = e.target.result
  }
  reader.readAsDataURL(img)
}

function supprimerImage() {
  fichier.value = null
  apercu.value  = ''
  erreur.value  = ''
  if (inputRef.value) inputRef.value.value = ''
}

function formaterTaille(octets) {
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(2)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(2)} Mo`
}
</script>

<style scoped>
.container { max-width: 400px; margin: 0 auto; padding: 20px; }

.zone-upload {
  width: 100%;
  height: 250px;
  border: 2px dashed #3498db;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f8ff;
  transition: border-color 0.2s;
}
.zone-upload:hover { border-color: #2980b9; background: #e8f4ff; }

.apercu-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  text-align: center;
  color: #6c757d;
}
.placeholder .icone { font-size: 3rem; }
.placeholder p { margin: 8px 0 4px; font-weight: 600; }
.placeholder small { font-size: 0.8rem; }

.infos-image {
  margin-top: 12px;
  font-size: 0.9rem;
  color: #555;
}
.infos-image p { margin: 4px 0; }

.boutons { display: flex; gap: 8px; margin-top: 10px; }

.btn-changer {
  padding: 8px 14px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-changer:hover { background: #2980b9; }

.btn-supprimer {
  padding: 8px 14px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-supprimer:hover { background: #c0392b; }

.erreur {
  color: #dc3545;
  font-size: 0.85rem;
  margin-top: 8px;
}
</style>
```

---

## 4. 📂 Import de Plusieurs Fichiers

```vue
<template>
  <div class="container">

    <!-- ─── Input multiple ─── -->
    <!-- L'attribut multiple permet de sélectionner plusieurs fichiers ─── -->
    <div class="zone-selection">
      <button @click="inputRef.click()" class="btn-choisir">
        📁 Choisir des fichiers
      </button>
      <input
        ref="inputRef"
        type="file"
        multiple
        style="display: none"
        @change="surSelectionFichiers"
      />
    </div>

    <!-- ─── Compteur ─── -->
    <p v-if="fichiers.length > 0" class="compteur">
      {{ fichiers.length }} fichier(s) sélectionné(s)
      — Total : {{ formaterTaille(tailleTotal) }}
    </p>

    <!-- ─── Liste des fichiers ─── -->
    <ul v-if="fichiers.length > 0" class="liste-fichiers">
      <li
        v-for="(f, index) in fichiers"
        :key="index"
        class="item-fichier"
      >
        <!-- ─── Icône selon le type ─── -->
        <span class="icone-type">{{ obtenirIcone(f.type) }}</span>

        <div class="infos-fichier">
          <p class="nom">{{ f.name }}</p>
          <p class="meta">
            {{ formaterTaille(f.size) }} —
            {{ f.type || 'Type inconnu' }}
          </p>
        </div>

        <!-- ─── Bouton supprimer individuel ─── -->
        <button @click="supprimerFichier(index)" class="btn-retirer">
          ✕
        </button>
      </li>
    </ul>

    <!-- ─── Actions globales ─── -->
    <div v-if="fichiers.length > 0" class="actions">
      <button @click="toutSupprimer" class="btn-tout-supprimer">
        🗑️ Tout supprimer
      </button>
      <button @click="uploader" class="btn-upload"
              :disabled="isUploading">
        {{ isUploading ? 'Envoi...' : '⬆️ Envoyer tout' }}
      </button>
    </div>

    <!-- ─── Message ─── -->
    <p v-if="message" :class="messageClasse">{{ message }}</p>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const inputRef   = ref(null)
const fichiers   = ref([])
const isUploading = ref(false)
const message    = ref('')
const messageClasse = ref('')

// ─── Taille totale de tous les fichiers ───
const tailleTotal = computed(() => {
  return fichiers.value.reduce((total, f) => total + f.size, 0)
})

// ─── Sélection de plusieurs fichiers ───
function surSelectionFichiers(event) {
  // Convertir FileList en tableau et ajouter aux fichiers existants
  const nouveauxFichiers = Array.from(event.target.files)
  fichiers.value = [...fichiers.value, ...nouveauxFichiers]

  // ─── Réinitialiser l'input pour permettre
  //     de re-sélectionner les mêmes fichiers ───
  if (inputRef.value) inputRef.value.value = ''
}

// ─── Supprimer un fichier par index ───
function supprimerFichier(index) {
  fichiers.value.splice(index, 1)
}

// ─── Supprimer tous les fichiers ───
function toutSupprimer() {
  fichiers.value = []
  message.value  = ''
}

// ─── Simuler un upload ───
async function uploader() {
  isUploading.value = true
  message.value     = ''

  try {
    // Simulation d'un délai d'upload
    await new Promise(resolve => setTimeout(resolve, 2000))

    message.value     = `✅ ${fichiers.value.length} fichier(s) envoyé(s) !`
    messageClasse.value = 'succes'
    fichiers.value    = []

  } catch (e) {
    message.value       = '❌ Erreur lors de l\'envoi.'
    messageClasse.value = 'erreur'

  } finally {
    isUploading.value = false
  }
}

// ─── Obtenir une icône selon le type MIME ───
function obtenirIcone(type) {
  if (type.startsWith('image/'))       return '🖼️'
  if (type.startsWith('video/'))       return '🎬'
  if (type.startsWith('audio/'))       return '🎵'
  if (type === 'application/pdf')      return '📕'
  if (type.includes('word'))           return '📝'
  if (type.includes('excel') ||
      type.includes('spreadsheet'))    return '📊'
  if (type.includes('zip') ||
      type.includes('rar'))            return '🗜️'
  return '📄'
}

function formaterTaille(octets) {
  if (octets < 1024)
    return `${octets} octets`
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(2)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(2)} Mo`
}
</script>

<style scoped>
.container { max-width: 550px; margin: 0 auto; padding: 20px; }

.zone-selection { margin-bottom: 16px; }

.btn-choisir {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-choisir:hover { background: #2980b9; }

.compteur {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 12px;
}

.liste-fichiers {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-fichier {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.icone-type { font-size: 1.5rem; }

.infos-fichier { flex: 1; }
.infos-fichier .nom  { margin: 0; font-weight: 600; font-size: 0.9rem; }
.infos-fichier .meta { margin: 2px 0 0; font-size: 0.8rem; color: #6c757d; }

.btn-retirer {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 1rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.btn-retirer:hover { background: #f8d7da; }

.actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-tout-supprimer {
  padding: 8px 16px;
  background: white;
  border: 1px solid #dc3545;
  color: #dc3545;
  border-radius: 6px;
  cursor: pointer;
}
.btn-tout-supprimer:hover { background: #f8d7da; }

.btn-upload {
  padding: 8px 16px;
  background: #198754;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-upload:hover:not(:disabled) { background: #157347; }
.btn-upload:disabled { background: #6c757d; cursor: not-allowed; }

.succes { color: #198754; margin-top: 10px; font-weight: 600; }
.erreur { color: #dc3545; margin-top: 10px; }
</style>
```

---

## 5. 🖱️ Glisser-Déposer (Drag & Drop)

```vue
<template>
  <div class="container">

    <!-- ─── Zone de dépôt ─── -->
    <div
      class="zone-drop"
      :class="{
        'zone-drop-active': isDragging,
        'zone-drop-erreur': erreur
      }"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop.prevent="surDrop"
      @click="inputRef.click()"
    >
      <!-- ─── Icône et texte ─── -->
      <div class="contenu-zone">
        <span class="icone-drop">
          {{ isDragging ? '📂' : '📁' }}
        </span>
        <p v-if="isDragging">Déposez vos fichiers ici !</p>
        <p v-else>
          Glissez-déposez vos fichiers ici
          <br />
          <span>ou cliquez pour parcourir</span>
        </p>
        <small>
          Formats acceptés : JPG, PNG, PDF — Max 10 Mo par fichier
        </small>
      </div>
    </div>

    <!-- ─── Input caché ─── -->
    <input
      ref="inputRef"
      type="file"
      multiple
      accept=".jpg,.jpeg,.png,.pdf"
      style="display: none"
      @change="surSelectionFichiers"
    />

    <!-- ─── Message d'erreur ─── -->
    <p v-if="erreur" class="msg-erreur">❌ {{ erreur }}</p>

    <!-- ─── Liste des fichiers déposés ─── -->
    <div v-if="fichiers.length > 0" class="liste-drop">
      <h3>📋 Fichiers ({{ fichiers.length }})</h3>
      <ul>
        <li v-for="(f, i) in fichiers" :key="i" class="item-drop">
          <span>{{ obtenirIcone(f.type) }}</span>
          <span class="nom-fichier">{{ f.name }}</span>
          <span class="taille">{{ formaterTaille(f.size) }}</span>
          <button @click="supprimer(i)">✕</button>
        </li>
      </ul>

      <button @click="toutSupprimer" class="btn-vider">
        🗑️ Vider la liste
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const inputRef  = ref(null)
const fichiers  = ref([])
const isDragging = ref(false)
const erreur    = ref('')

// ─── Types et taille autorisés ───
const TYPES_AUTORISES = [
  'image/jpeg', 'image/png', 'application/pdf'
]
const TAILLE_MAX = 10 * 1024 * 1024 // 10 Mo

// ─── Valider un fichier ───
function validerFichier(f) {
  if (!TYPES_AUTORISES.includes(f.type)) {
    return `${f.name} : type non autorisé.`
  }
  if (f.size > TAILLE_MAX) {
    return `${f.name} : dépasse 10 Mo.`
  }
  return null
}

// ─── Ajouter des fichiers à la liste ───
function ajouterFichiers(liste) {
  erreur.value = ''
  const tableau = Array.from(liste)

  for (const f of tableau) {
    const msgErreur = validerFichier(f)
    if (msgErreur) {
      erreur.value = msgErreur
      return
    }
  }

  fichiers.value = [...fichiers.value, ...tableau]
}

// ─── Événement drop ───
function surDrop(event) {
  isDragging.value = false
  // event.dataTransfer.files contient les fichiers déposés
  ajouterFichiers(event.dataTransfer.files)
}

// ─── Événement input change ───
function surSelectionFichiers(event) {
  ajouterFichiers(event.target.files)
  if (inputRef.value) inputRef.value.value = ''
}

function supprimer(index) {
  fichiers.value.splice(index, 1)
}

function toutSupprimer() {
  fichiers.value = []
  erreur.value   = ''
}

function obtenirIcone(type) {
  if (type.startsWith('image/'))  return '🖼️'
  if (type === 'application/pdf') return '📕'
  return '📄'
}

function formaterTaille(octets) {
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(2)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(2)} Mo`
}
</script>

<style scoped>
.container { max-width: 500px; margin: 0 auto; padding: 20px; }

.zone-drop {
  border: 3px dashed #3498db;
  border-radius: 16px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  background: #f0f8ff;
  transition: all 0.3s ease;
}
.zone-drop:hover {
  background: #e8f4ff;
  border-color: #2980b9;
}
.zone-drop-active {
  background: #d6eaf8;
  border-color: #1a6ea8;
  transform: scale(1.02);
}
.zone-drop-erreur { border-color: #dc3545; background: #fff5f5; }

.icone-drop { font-size: 3rem; display: block; margin-bottom: 10px; }
.contenu-zone p {
  margin: 8px 0;
  font-size: 1rem;
  color: #444;
}
.contenu-zone p span { color: #3498db; font-weight: 600; }
.contenu-zone small  { color: #6c757d; font-size: 0.8rem; }

.msg-erreur { color: #dc3545; font-size: 0.85rem; margin-top: 8px; }

.liste-drop {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
}
.liste-drop h3 { margin: 0 0 12px 0; font-size: 1rem; }
.liste-drop ul { list-style: none; padding: 0; margin: 0; }

.item-drop {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}
.item-drop:last-child { border-bottom: none; }
.nom-fichier { flex: 1; }
.taille { color: #6c757d; font-size: 0.8rem; }
.item-drop button {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-vider {
  margin-top: 12px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #dc3545;
  color: #dc3545;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-vider:hover { background: #f8d7da; }
</style>
```

---

## 6. ✅ Validation des Fichiers

```vue
<template>
  <div class="container">
    <h2>Upload avec Validation</h2>

    <input
      ref="inputRef"
      type="file"
      multiple
      style="display: none"
      @change="surSelection"
    />

    <button @click="inputRef.click()" class="btn-choisir">
      📁 Choisir des fichiers
    </button>

    <!-- ─── Résultats de validation ─── -->
    <div v-if="resultatsValidation.length > 0" class="resultats">
      <div
        v-for="(r, i) in resultatsValidation"
        :key="i"
        class="resultat-item"
        :class="r.valide ? 'valide' : 'invalide'"
      >
        <span>{{ r.valide ? '✅' : '❌' }}</span>
        <span class="nom">{{ r.nom }}</span>
        <span class="raison">{{ r.raison }}</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const inputRef           = ref(null)
const resultatsValidation = ref([])

// ─── Règles de validation ───
const REGLES = {
  typesAutorises: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'text/plain'
  ],
  tailleMax: 5 * 1024 * 1024,  // 5 Mo
  nombreMax: 5                  // max 5 fichiers
}

function surSelection(event) {
  const liste  = Array.from(event.target.files)
  resultatsValidation.value = []

  // ─── Vérification du nombre de fichiers ───
  if (liste.length > REGLES.nombreMax) {
    resultatsValidation.value.push({
      nom:    'Sélection',
      valide: false,
      raison: `Maximum ${REGLES.nombreMax} fichiers autorisés.`
    })
    return
  }

  // ─── Validation de chaque fichier ───
  liste.forEach(f => {
    const erreurs = []

    // Vérifier le type
    if (!REGLES.typesAutorises.includes(f.type)) {
      erreurs.push('Type non autorisé')
    }

    // Vérifier la taille
    if (f.size > REGLES.tailleMax) {
      erreurs.push(`Dépasse ${formaterTaille(REGLES.tailleMax)}`)
    }

    // Vérifier le nom (pas de caractères spéciaux)
    if (!/^[\w\-. ]+$/.test(f.name)) {
      erreurs.push('Nom de fichier invalide')
    }

    resultatsValidation.value.push({
      nom:    f.name,
      valide: erreurs.length === 0,
      raison: erreurs.length === 0
               ? `${formaterTaille(f.size)} — ${f.type}`
               : erreurs.join(', ')
    })
  })

  if (inputRef.value) inputRef.value.value = ''
}

function formaterTaille(octets) {
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.container { max-width: 500px; margin: 0 auto; padding: 20px; }

.btn-choisir {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 16px;
}

.resultats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resultat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9rem;
}
.valide   { background: #d1e7dd; border: 1px solid #badbcc; }
.invalide { background: #f8d7da; border: 1px solid #f5c2c7; }

.nom    { flex: 1; font-weight: 600; }
.raison { font-size: 0.8rem; color: #555; }
</style>
```

---

## 7. ⬆️ Upload vers un Serveur avec Progression

```vue
<template>
  <div class="container">
    <h2>Upload avec Progression</h2>

    <input
      ref="inputRef"
      type="file"
      multiple
      style="display: none"
      @change="surSelection"
    />

    <button
      @click="inputRef.click()"
      :disabled="isUploading"
      class="btn-choisir"
    >
      📁 Choisir des fichiers
    </button>

    <!-- ─── Liste avec progression par fichier ─── -->
    <div v-if="fichiers.length > 0" class="liste-upload">
      <div
        v-for="(f, i) in fichiers"
        :key="i"
        class="item-upload"
      >
        <div class="entete-item">
          <span>{{ obtenirIcone(f.fichier.type) }}</span>
          <span class="nom">{{ f.fichier.name }}</span>
          <span class="statut" :class="f.statut">
            {{ obtenirStatutTexte(f.statut) }}
          </span>
        </div>

        <!-- ─── Barre de progression ─── -->
        <div class="barre-container">
          <div
            class="barre-progression"
            :class="f.statut"
            :style="{ width: f.progression + '%' }"
          ></div>
        </div>

        <div class="meta-item">
          <span>{{ formaterTaille(f.fichier.size) }}</span>
          <span>{{ f.progression }}%</span>
        </div>
      </div>
    </div>

    <!-- ─── Bouton upload global ─── -->
    <div v-if="fichiers.length > 0" class="actions">
      <button
        @click="uploaderTout"
        :disabled="isUploading"
        class="btn-upload"
      >
        {{ isUploading ? '⏳ Envoi en cours...' : '⬆️ Envoyer tout' }}
      </button>
    </div>

    <!-- ─── Résumé final ─── -->
    <div v-if="resume" class="resume" :class="resume.classe">
      {{ resume.message }}
    </div>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const inputRef   = ref(null)
const fichiers   = ref([])
const isUploading = ref(false)
const resume     = ref(null)

function surSelection(event) {
  const liste = Array.from(event.target.files)
  fichiers.value = liste.map(f => ({
    fichier:     f,
    progression: 0,
    statut:      'attente' // attente | envoi | succes | erreur
  }))
  resume.value = null
  if (inputRef.value) inputRef.value.value = ''
}

// ─── Simuler l'upload d'un fichier avec progression ───
function uploaderFichier(item) {
  return new Promise((resolve, reject) => {
    item.statut = 'envoi'
    let progression = 0

    const intervalle = setInterval(() => {
      progression += Math.random() * 20

      if (progression >= 100) {
        progression = 100
        clearInterval(intervalle)

        // Simuler succès ou erreur aléatoire
        if (Math.random() > 0.2) {
          item.statut = 'succes'
          resolve()
        } else {
          item.statut = 'erreur'
          reject(new Error('Erreur réseau simulée'))
        }
      }

      item.progression = Math.round(progression)
    }, 200)
  })
}

// ─── Uploader tous les fichiers ───
async function uploaderTout() {
  isUploading.value = true
  resume.value      = null

  let succes = 0
  let echecs = 0

  // ─── Upload en parallèle ───
  await Promise.allSettled(
    fichiers.value.map(async (item) => {
      try {
        await uploaderFichier(item)
        succes++
      } catch {
        echecs++
      }
    })
  )

  isUploading.value = false
  resume.value = {
    message: `✅ ${succes} fichier(s) envoyé(s), ❌ ${echecs} échoué(s)`,
    classe:  echecs === 0 ? 'succes' : 'partiel'
  }
}

function obtenirStatutTexte(statut) {
  const textes = {
    attente: '⏸️ En attente',
    envoi:   '⏳ Envoi...',
    succes:  '✅ Envoyé',
    erreur:  '❌ Erreur'
  }
  return textes[statut] || statut
}

function obtenirIcone(type) {
  if (type.startsWith('image/'))  return '🖼️'
  if (type === 'application/pdf') return '📕'
  return '📄'
}

function formaterTaille(octets) {
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.container { max-width: 550px; margin: 0 auto; padding: 20px; }

.btn-choisir {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 16px;
}
.btn-choisir:disabled { background: #6c757d; cursor: not-allowed; }

.liste-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.item-upload {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.entete-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.nom { flex: 1; font-weight: 600; font-size: 0.9rem; }

.statut { font-size: 0.8rem; }
.statut.attente { color: #6c757d; }
.statut.envoi   { color: #fd7e14; }
.statut.succes  { color: #198754; }
.statut.erreur  { color: #dc3545; }

.barre-container {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.barre-progression {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.barre-progression.attente { background: #adb5bd; }
.barre-progression.envoi   { background: #fd7e14; }
.barre-progression.succes  { background: #198754; }
.barre-progression.erreur  { background: #dc3545; }

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #6c757d;
}

.actions { margin-bottom: 12px; }

.btn-upload {
  padding: 10px 20px;
  background: #198754;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
}
.btn-upload:disabled { background: #6c757d; cursor: not-allowed; }

.resume {
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  text-align: center;
}
.resume.succes  { background: #d1e7dd; color: #0f5132; }
.resume.partiel { background: #fff3cd; color: #856404; }
</style>
```

---

## 8. 🔶 Composant Réutilisable `InputFichier.vue`

```vue
<!-- composants/InputFichier.vue -->
<template>
  <div class="input-fichier">

    <!-- ─── Zone de dépôt cliquable ─── -->
    <div
      class="zone"
      :class="{
        'zone-active':  isDragging,
        'zone-remplie': fichiers.length > 0,
        'zone-erreur':  erreur
      }"
      @click="inputRef.click()"
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragover.prevent
      @drop.prevent="surDrop"
    >
      <span class="icone">
        {{ isDragging ? '📂' : fichiers.length > 0 ? '✅' : '📁' }}
      </span>

      <div class="texte-zone">
        <p v-if="isDragging">Déposez ici !</p>
        <p v-else-if="fichiers.length > 0">
          {{ fichiers.length }} fichier(s) sélectionné(s)
        </p>
        <p v-else>{{ label }}</p>
        <small>{{ descriptionTypes }}</small>
      </div>
    </div>

    <!-- ─── Input caché ─── -->
    <input
      ref="inputRef"
      type="file"
      :multiple="multiple"
      :accept="accept"
      style="display: none"
      @change="surChange"
    />

    <!-- ─── Erreur ─── -->
    <p v-if="erreur" class="msg-erreur">❌ {{ erreur }}</p>

    <!-- ─── Liste des fichiers ─── -->
    <ul v-if="fichiers.length > 0 && afficherListe" class="liste">
      <li v-for="(f, i) in fichiers" :key="i">
        <span>{{ obtenirIcone(f.type) }} {{ f.name }}</span>
        <span>{{ formaterTaille(f.size) }}</span>
        <button @click.stop="supprimer(i)">✕</button>
      </li>
    </ul>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ─── Props ───
const props = defineProps({
  multiple: {
    type: Boolean,
    default: false
  },
  accept: {
    type: String,
    default: '*/*'
  },
  tailleMax: {
    type: Number,
    default: 10 * 1024 * 1024 // 10 Mo
  },
  label: {
    type: String,
    default: 'Cliquez ou glissez un fichier ici'
  },
  afficherListe: {
    type: Boolean,
    default: true
  }
})

// ─── Emits ───
const emit = defineEmits(['update:fichiers', 'erreur'])

// ─── État ───
const inputRef  = ref(null)
const fichiers  = ref([])
const isDragging = ref(false)
const erreur    = ref('')

// ─── Description des types acceptés ───
const descriptionTypes = computed(() => {
  if (props.accept === '*/*') return 'Tous types acceptés'
  return `Formats : ${props.accept}`
})

// ─── Traiter les fichiers ───
function traiterFichiers(liste) {
  erreur.value = ''
  const tableau = Array.from(liste)

  for (const f of tableau) {
    if (f.size > props.tailleMax) {
      erreur.value = `${f.name} dépasse ${formaterTaille(props.tailleMax)}.`
      emit('erreur', erreur.value)
      return
    }
  }

  if (props.multiple) {
    fichiers.value = [...fichiers.value, ...tableau]
  } else {
    fichiers.value = [tableau[0]]
  }

  emit('update:fichiers', fichiers.value)
}

function surChange(event) {
  traiterFichiers(event.target.files)
  if (inputRef.value) inputRef.value.value = ''
}

function surDrop(event) {
  isDragging.value = false
  traiterFichiers(event.dataTransfer.files)
}

function supprimer(index) {
  fichiers.value.splice(index, 1)
  emit('update:fichiers', fichiers.value)
}

function obtenirIcone(type) {
  if (type.startsWith('image/'))  return '🖼️'
  if (type === 'application/pdf') return '📕'
  return '📄'
}

function formaterTaille(octets) {
  if (octets < 1024 * 1024)
    return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.input-fichier { width: 100%; }

.zone {
  border: 2px dashed #3498db;
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  background: #f0f8ff;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.zone:hover       { background: #e8f4ff; }
.zone-active      { background: #d6eaf8; border-color: #1a6ea8; }
.zone-remplie     { border-color: #198754; background: #f0fff4; }
.zone-erreur      { border-color: #dc3545; background: #fff5f5; }

.icone { font-size: 2.5rem; }
.texte-zone p     { margin: 0; font-weight: 600; color: #444; }
.texte-zone small { color: #6c757d; font-size: 0.8rem; }

.msg-erreur { color: #dc3545; font-size: 0.85rem; margin-top: 6px; }

.liste {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
}
.liste li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 0.88rem;
}
.liste li span:first-child { flex: 1; }
.liste li span:nth-child(2) { color: #6c757d; }
.liste li button {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
}
</style>
```

### Utilisation du composant réutilisable

```vue
<!-- App.vue -->
<template>
  <div class="app">
    <h1>Formulaire avec Upload</h1>

    <!-- ─── Image de profil (un seul fichier) ─── -->
    <h3>Photo de profil</h3>
    <InputFichier
      accept="image/*"
      :taille-max="2 * 1024 * 1024"
      label="Choisir une photo de profil"
      @update:fichiers="surFichiersPhoto"
      @erreur="surErreur"
    />

    <!-- ─── Documents (plusieurs fichiers) ─── -->
    <h3>Documents</h3>
    <InputFichier
      multiple
      accept=".pdf,.doc,.docx"
      :taille-max="10 * 1024 * 1024"
      label="Glissez vos documents ici"
      @update:fichiers="surFichiersDocuments"
    />

    <!-- ─── Affichage des fichiers ─── -->
    <div v-if="photo" class="recap">
      <p>📸 Photo : {{ photo.name }}</p>
    </div>

    <div v-if="documents.length > 0" class="recap">
      <p>📄 {{ documents.length }} document(s) sélectionné(s)</p>
    </div>

    <!-- ─── Erreur globale ─── -->
    <p v-if="erreurGlobale" class="erreur-globale">
      ❌ {{ erreurGlobale }}
    </p>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import InputFichier from './composants/InputFichier.vue'

const photo         = ref(null)
const documents     = ref([])
const erreurGlobale = ref('')

function surFichiersPhoto(fichiers) {
  photo.value = fichiers[0] || null
}

function surFichiersDocuments(fichiers) {
  documents.value = fichiers
}

function surErreur(msg) {
  erreurGlobale.value = msg
}
</script>

<style scoped>
.app { max-width: 600px; margin: 0 auto; padding: 20px; }
.recap {
  margin-top: 12px;
  padding: 10px;
  background: #d1e7dd;
  border-radius: 6px;
  color: #0f5132;
}
.erreur-globale { color: #dc3545; margin-top: 10px; }
</style>
```

---

## 9. 📋 Tableaux Récapitulatifs

---

### 9.1 Attributs de l'Input Fichier

| Attribut | Rôle | Exemple |
|---|---|---|
| `type="file"` | Déclare un input fichier | `<input type="file">` |
| `multiple` | Permet plusieurs fichiers | `<input type="file" multiple>` |
| `accept` | Filtre les types | `accept="image/*"` |
| `@change` | Événement de sélection | `@change="surSelection"` |
| `ref` | Référence à l'input | `ref="inputRef"` |

---

### 9.2 Types `accept` courants

| Valeur | Description |
|---|---|
| `image/*` | Toutes les images |
| `image/jpeg` | JPEG uniquement |
| `image/png` | PNG uniquement |
| `video/*` | Toutes les vidéos |
| `audio/*` | Tous les audios |
| `application/pdf` | PDF uniquement |
| `.pdf,.doc,.docx` | Extensions spécifiques |
| `*/*` | Tous les fichiers |

---

### 9.3 Propriétés d'un objet `File`

| Propriété | Type | Description |
|---|---|---|
| `file.name` | string | Nom du fichier |
| `file.size` | number | Taille en octets |
| `file.type` | string | Type MIME |
| `file.lastModified` | number | Timestamp de modification |

---

### 9.4 Événements Drag & Drop

| Événement | Rôle |
|---|---|
| `@dragenter` | Curseur entre dans la zone |
| `@dragleave` | Curseur sort de la zone |
| `@dragover` | Curseur survole la zone |
| `@drop` | Fichier déposé |

> ⚠️ Toujours ajouter `.prevent` sur `@dragover`
> sinon le navigateur ouvre le fichier !

---

### 9.5 Méthodes utiles

| Méthode | Rôle | Exemple |
|---|---|---|
| `event.target.files` | Liste des fichiers | `files[0]` |
| `event.dataTransfer.files` | Fichiers déposés | `files[0]` |
| `Array.from(files)` | Convertir en tableau | `Array.from(files)` |
| `FileReader` | Lire le contenu | `new FileReader()` |
| `reader.readAsDataURL()` | Aperçu en base64 | Prévisualisation image |
| `URL.createObjectURL()` | URL temporaire | Aperçu rapide |

---

### 9.6 Récapitulatif des Cas d'Usage

| Cas | Méthode | Composant |
|---|---|---|
| **Un seul fichier** | `ref(null)` | Input simple |
| **Plusieurs fichiers** | `ref([])` + `multiple` | Input multiple |
| **Prévisualisation image** | `FileReader` | Section 3 |
| **Glisser-déposer** | `@drop` + `dataTransfer` | Section 5 |
| **Validation** | Type + Taille | Section 6 |
| **Upload avec barre** | `Promise` + progression | Section 7 |
| **Composant réutilisable** | Props + Emits | Section 8 |

---

## ✅ Règles d'or

```
┌──────────────────────────────────────────────────────┐
│              Règles d'or Upload                      │
├──────────────────────────────────────────────────────┤
│ ✅ Toujours valider le type de fichier               │
│ ✅ Toujours valider la taille du fichier             │
│ ✅ Réinitialiser l'input après sélection             │
│    (inputRef.value.value = '')                       │
│ ✅ Utiliser FileReader pour prévisualiser            │
│ ✅ Ajouter .prevent sur @dragover                    │
│ ✅ Afficher la progression pour les gros fichiers    │
│ ✅ Gérer les erreurs avec try/catch                  │
│ ✅ Utiliser multiple pour plusieurs fichiers         │
│ ✅ Utiliser accept pour filtrer les types            │
│ ✅ Créer un composant réutilisable pour les projets  │
└──────────────────────────────────────────────────────┘
```