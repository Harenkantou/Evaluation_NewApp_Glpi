<script setup>
import { ref } from 'vue'
import JSZip from 'jszip'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { parseCsvFiles } from '@/services/csv'
import { useGlpiStore } from '@/stores/glpi'

const glpi = useGlpiStore()

// Variables pour les 4 fichiers obligatoires
const fileElements = ref(null)
const fileTickets = ref(null)
const fileCosts = ref(null)
const fileImages = ref(null)

const loading = ref(false)
const progress = ref(0)
const result = ref(null)
const error = ref('')

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

/**
 * Extrait les images du ZIP en objets File, indexés par nom SANS extension
 * (ex. "PC-ADM-001.jpg" -> clé "PC-ADM-001"), pour les lier aux éléments
 * portant le même Name.
 */
async function extractImagesFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile)
  const images = {}
  const entries = Object.values(zip.files).filter((f) => !f.dir)
  for (const entry of entries) {
    const fileName = entry.name.split('/').pop()
    if (!fileName) continue
    const ext = fileName.split('.').pop().toLowerCase()
    if (!IMAGE_EXT.includes(ext)) continue
    const blob = await entry.async('blob')
    const baseName = fileName.replace(/\.[^.]+$/, '')
    images[baseName] = new File([blob], fileName, { type: blob.type || 'application/octet-stream' })
  }
  return images
}

async function submit() {
  error.value = ''
  result.value = null

  // Vérification que les 4 fichiers sont présents
  if (!fileElements.value || !fileTickets.value || !fileCosts.value || !fileImages.value) {
    error.value = 'Veuillez sélectionner les 4 fichiers demandés.'
    return
  }

  loading.value = true
  try {
    progress.value = 10

    // Purge totale avant import (repart d'une base propre)
    await glpi.purgeAllData()
    progress.value = 25

    // 1) Lire et parser les fichiers CSV
    const csvFilesToParse = [fileElements.value, fileTickets.value, fileCosts.value]
    const parsed = await parseCsvFiles(csvFilesToParse)
    progress.value = 35

    // 2) Extraire les images du ZIP (objets File)
    const images = await extractImagesFromZip(fileImages.value)
    progress.value = 50

    // 3) Envoyer CSV + images vers GLPI (API)
    const importResult = await glpi.importToGlpi(parsed, images)
    progress.value = 90

    result.value = importResult
    progress.value = 100

  } catch (e) {
    progress.value = 0
    error.value = "Erreur fatale : " + (e.message || "inconnue")
      + ". Loi du tout ou rien appliquée : aucune nouvelle donnée n'a été insérée."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BoLayout>
    <h1>Importer les données vers GLPI</h1>
    <div class="card">
      <label class="field">
        <span>Fichier Éléments (CSV)</span>
        <input type="file" accept=".csv" @change="e => fileElements = e.target.files[0]" />
      </label>
      <label class="field">
        <span>Fichier Tickets (CSV)</span>
        <input type="file" accept=".csv" @change="e => fileTickets = e.target.files[0]" />
      </label>
      <label class="field">
        <span>Fichier Coûts (CSV)</span>
        <input type="file" accept=".csv" @change="e => fileCosts = e.target.files[0]" />
      </label>
      <label class="field">
        <span>Fichier Images (ZIP)</span>
        <input type="file" accept=".zip" @change="e => fileImages = e.target.files[0]" />
      </label>

      <!-- Barre de progression -->
      <div v-if="loading" class="progress-box">
        <label>Progression de l'import : {{ progress }}%</label>
        <progress :value="progress" max="100"></progress>
      </div>

      <button :disabled="loading" @click="submit" class="submit-btn">
        {{ loading ? 'Traitement en cours...' : 'Importer vers GLPI' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-if="result" class="card success">
      <h2>Import terminé ✅</h2>
      <ul class="stats">
        <li><strong>{{ result.computers }}</strong> ordinateurs</li>
        <li><strong>{{ result.monitors }}</strong> écrans</li>
        <li><strong>{{ result.tickets }}</strong> tickets</li>
        <li><strong>{{ result.links }}</strong> liaisons</li>
        <li><strong>{{ result.images }}</strong> images</li>
      </ul>
      <div v-if="result.warnings && result.warnings.length" class="warnings">
        <h3>Avertissements</h3>
        <ul><li v-for="(w, i) in result.warnings" :key="i">⚠️ {{ w }}</li></ul>
      </div>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.hint { color: #64748b; margin-bottom: 1.5rem; }
.card {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 560px; margin-bottom: 1.5rem;
}
.field { display: block; margin-bottom: 1.2rem; }
.field span { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #334155; }
input[type="file"] {
  width: 100%; padding: 0.5rem; border: 1px dashed #cbd5e1;
  border-radius: 8px; background: #f8fafc;
}
.files { list-style: none; padding: 0; margin: 0 0 1rem; color: #475569; font-size: 0.9rem; }
button {
  background: #2563eb; color: #fff; border: none; padding: 0.7rem 1.4rem;
  border-radius: 8px; cursor: pointer; font-size: 1rem;
}
button:disabled { opacity: 0.6; cursor: default; }
.error { margin-top: 1rem; color: #dc2626; background: #fee2e2; padding: 0.6rem; border-radius: 8px; }
.success { border-left: 4px solid #16a34a; }
.stats { list-style: none; display: flex; gap: 1.5rem; padding: 0; flex-wrap: wrap; }
.stats strong { font-size: 1.5rem; color: #2563eb; display: block; }
.warnings { margin-top: 1rem; color: #92400e; }
.progress-box { margin-bottom: 1rem; }
.progress-box label { display: block; margin-bottom: 0.5rem; color: #334155; }
progress { width: 100%; height: 10px; }
</style>
