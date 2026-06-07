<script setup>
import { ref } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { parseCsvFiles } from '@/services/csv'
import { useGlpiStore } from '@/stores/glpi'

const glpi = useGlpiStore()

const csvFiles = ref([])
const loading = ref(false)
const result = ref(null)
const error = ref('')

function onCsvChange(e) {
  csvFiles.value = Array.from(e.target.files)
}

async function submit() {
  error.value = ''
  result.value = null
  if (csvFiles.value.length === 0) {
    error.value = 'Veuillez sélectionner les fichiers CSV.'
    return
  }
  loading.value = true
  try {
    // 1) Lire les CSV (côté navigateur)
    const parsed = await parseCsvFiles(csvFiles.value)
    // 2) Envoyer vers GLPI via l'API REST (JSON)
    result.value = await glpi.importToGlpi(parsed)
  } catch (e) {
    error.value = "Erreur lors de l'import : " + (e.response?.data?.detail || e.message || e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BoLayout>
    <h1>Importer les données vers GLPI</h1>
    <p class="hint">
      Les fichiers CSV sont lus côté navigateur puis envoyés à GLPI via l'API REST (JSON).
      Sélectionnez les 3 fichiers fournis :
      feuille 1 = éléments, feuille 2 = tickets, feuille 3 = coûts.
    </p>

    <div class="card">
      <label class="field">
        <span>Fichiers CSV (éléments, tickets, coûts)</span>
        <input type="file" accept=".csv" multiple @change="onCsvChange" />
      </label>
      <ul v-if="csvFiles.length" class="files">
        <li v-for="f in csvFiles" :key="f.name">📄 {{ f.name }}</li>
      </ul>

      <button :disabled="loading" @click="submit">
        {{ loading ? 'Import vers GLPI...' : 'Importer vers GLPI' }}
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
</style>
