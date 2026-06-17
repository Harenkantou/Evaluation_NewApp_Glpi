<script setup>
import { ref } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { resetSettings as resetSqliteSettings } from '@/services/sqliteService'

const glpi = useGlpiStore()
const loading = ref(false)
const done = ref(false)
const error = ref('')

async function confirmReset() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT tous les ordinateurs, écrans et tickets de GLPI ?')) return
  loading.value = true
  error.value = ''
  done.value = false
  try {
    // On appelle la purge totale au lieu du reset partiel
    await glpi.purgeAllData()
    try {
      await resetSqliteSettings()
    } catch (sqliteError) {
      throw new Error(`Erreur SQLite : ${sqliteError.response?.data?.detail || sqliteError.message || 'reset impossible'}`)
    }
    done.value = true
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur pendant la reinitialisation'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BoLayout>
    <h1>Réinitialiser les données</h1>
    <div class="card">
      <p>Cette action est irréversible.</p>
      <button class="danger" :disabled="loading" @click="confirmReset">
        {{ loading ? 'Réinitialisation en cours...' : '🗑️ Reinitialiser les données' }}
      </button>
      <p v-if="done" class="ok">✅ Toutes les données ont été définitivement supprimées de GLPI.</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.hint { color: #dc2626; margin-bottom: 1.5rem; font-weight: bold; }
.card {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 480px;
}
.danger {
  background: #dc2626; color: #fff; border: none; padding: 0.7rem 1.4rem;
  border-radius: 8px; cursor: pointer; font-size: 1rem; margin-top: 0.5rem;
}
.danger:disabled { opacity: 0.6; }
.ok { color: #16a34a; margin-top: 1rem; font-weight: bold; }
.error { color: #dc2626; margin-top: 1rem; }
</style>
