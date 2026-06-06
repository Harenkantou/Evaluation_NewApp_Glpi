<script setup>
import { ref, computed } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'

const glpi = useGlpiStore()
const loading = ref(false)
const done = ref(false)
const error = ref('')

const counts = computed(() => {
  const i = glpi.importedIds
  return {
    computers: i.computers.length,
    monitors: i.monitors.length,
    tickets: i.tickets.length
  }
})

async function confirmReset() {
  if (!confirm('Supprimer dans GLPI tout ce que NewApp a importé ?')) return
  loading.value = true
  error.value = ''
  done.value = false
  try {
    await glpi.resetImported()
    done.value = true
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BoLayout>
    <h1>Réinitialiser les données</h1>
    <p class="hint">Supprime dans GLPI uniquement les éléments et tickets créés par l'import NewApp.</p>

    <div class="card">
      <p>À supprimer :
        <strong>{{ counts.computers }}</strong> ordinateurs,
        <strong>{{ counts.monitors }}</strong> écrans,
        <strong>{{ counts.tickets }}</strong> tickets.
      </p>
      <button class="danger" :disabled="loading" @click="confirmReset">
        {{ loading ? 'Suppression...' : '🗑️ Réinitialiser dans GLPI' }}
      </button>
      <p v-if="done" class="ok">✅ Données importées supprimées de GLPI.</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.hint { color: #64748b; margin-bottom: 1.5rem; }
.card {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 480px;
}
.danger {
  background: #dc2626; color: #fff; border: none; padding: 0.7rem 1.4rem;
  border-radius: 8px; cursor: pointer; font-size: 1rem; margin-top: 0.5rem;
}
.danger:disabled { opacity: 0.6; }
.ok { color: #16a34a; margin-top: 1rem; }
.error { color: #dc2626; margin-top: 1rem; }
</style>
