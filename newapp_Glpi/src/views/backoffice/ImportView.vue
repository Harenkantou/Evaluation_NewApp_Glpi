<script setup>
import { ref } from 'vue'
import JSZip from 'jszip'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { importAll } from '@/services/import'
import { useGlpiStore } from '@/stores/glpi'

const glpi = useGlpiStore()

// 4 fichiers obligatoires
const fileElements = ref(null)
const fileTickets = ref(null)
const fileCosts = ref(null)
const fileImages = ref(null)

const loading = ref(false)
const progress = ref(0)
const phase = ref('')
const result = ref(null)
const error = ref('')

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

// Extrait les images du ZIP en { filename, data: Uint8Array }
async function extractImagesFromZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile)
  const images = []
  const entries = Object.values(zip.files).filter((f) => !f.dir)
  for (const entry of entries) {
    const fileName = entry.name.split('/').pop()
    if (!fileName || fileName.startsWith('.') || entry.name.includes('__MACOSX')) continue
    const ext = fileName.split('.').pop().toLowerCase()
    if (!IMAGE_EXT.includes(ext)) continue
    const data = await entry.async('uint8array')
    images.push({ filename: fileName, data })
  }
  return images
}

async function submit() {
  error.value = ''
  result.value = null

  if (!fileElements.value || !fileTickets.value || !fileCosts.value || !fileImages.value) {
    error.value = 'Veuillez sélectionner les 4 fichiers demandés.'
    return
  }

  loading.value = true
  progress.value = 0
  try {
    // Purge totale avant import (repart propre)
    phase.value = 'Réinitialisation...'
    await glpi.purgeAllData()
    progress.value = 15

    // Extraire les images du ZIP
    phase.value = 'Lecture du ZIP...'
    const images = await extractImagesFromZip(fileImages.value)
    progress.value = 25

    // Lancer l'import (tout ou rien sur les CSV)
    const res = await importAll({
      feuille1: fileElements.value,
      feuille2: fileTickets.value,
      feuille3: fileCosts.value,
      images,
      onProgress: (p) => {
        if (p.message) phase.value = p.message
        if (p.total) {
          // progression indicative selon la phase
          const base = { elements: 30, tickets: 60, costs: 75, images: 85 }[p.phase] || progress.value
          progress.value = Math.min(95, base + Math.round((p.done / p.total) * 10))
        }
      }
    })

    if (!res.success) {
      throw new Error(res.message)
    }
    result.value = res.details
    progress.value = 100
    phase.value = 'Terminé'
  } catch (e) {
    progress.value = 0
    error.value = 'Erreur fatale : ' + (e.message || 'inconnue')
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

      <div v-if="loading" class="progress-box">
        <label>{{ phase }} — {{ progress }}%</label>
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
        <li><strong>{{ result.elements }}</strong> éléments</li>
        <li><strong>{{ result.elementsDuplicates }}</strong> doublons ignorés</li>
        <li><strong>{{ result.tickets }}</strong> tickets</li>
        <li><strong>{{ result.costs }}</strong> coûts</li>
      </ul>
      <p class="images-line">Images : {{ result.images }}</p>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
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
button {
  background: #2563eb; color: #fff; border: none; padding: 0.7rem 1.4rem;
  border-radius: 8px; cursor: pointer; font-size: 1rem;
}
button:disabled { opacity: 0.6; cursor: default; }
.error { margin-top: 1rem; color: #dc2626; background: #fee2e2; padding: 0.6rem; border-radius: 8px; }
.success { border-left: 4px solid #16a34a; }
.stats { list-style: none; display: flex; gap: 1.5rem; padding: 0; flex-wrap: wrap; }
.stats strong { font-size: 1.5rem; color: #2563eb; display: block; }
.images-line { margin-top: 1rem; color: #475569; }
.progress-box { margin-bottom: 1rem; }
.progress-box label { display: block; margin-bottom: 0.5rem; color: #334155; }
progress { width: 100%; height: 10px; }
</style>