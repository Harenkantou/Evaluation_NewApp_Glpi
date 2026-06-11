<script setup>
import { ref, onMounted } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { getSettings, saveSettings, resetSettings } from '@/services/sqliteService'

// Réglages des 3 statuts : [{ status_id, color, label_mg, label_fr }]
const settings = ref([])
const loading = ref(true)
const saved = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    settings.value = await getSettings()
  } catch (e) {
    error.value = 'Erreur SQLite : ' + (e.message || '')
  } finally {
    loading.value = false
  }
}

async function save() {
  saved.value = false
  error.value = ''
  try {
    await saveSettings(settings.value)
    saved.value = true
  } catch (e) {
    error.value = 'Sauvegarde échouée : ' + (e.message || '')
  }
}

async function reset() {
  saved.value = false
  error.value = ''
  try {
    await resetSettings()
    saved.value = true
  } catch (e) {
    error.value = 'Reinitialisation echouée: ' + (e.message || '')
  }
}

onMounted(load)
</script>

<template>
  <BoLayout>
    <h1>Personnalisation du Kanban</h1>
    <p class="hint">Couleur de fond et nom (malgache) de chaque colonne. Stocké dans SQLite.</p>

    <div v-if="loading" class="info">Chargement...</div>
    <div v-else class="card">
      <div v-for="s in settings" :key="s.status_id" class="row">
        <div class="label">
          {{ s.label_fr || ('Statut ' + s.status_id) }}
          <small>(code {{ s.status_id }})</small>
        </div>
        <div class="field">
          <label>Couleur</label>
          <input type="color" v-model="s.color" />
        </div>
        <div class="field grow">
          <label>Nom malgache</label>
          <input type="text" v-model="s.label_mg" placeholder="ex: vaovao" />
        </div>
      </div>

      <div class="actions">
        <button class="primary" @click="save">💾 Enregistrer</button>
        <button class="reset" @click="reset"> Réinitialiser </button>
        <span v-if="saved" class="ok">✅ Enregistré dans SQLite</span>
        <span v-if="error" class="err">{{ error }}</span>
      </div>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.hint { color: #64748b; margin-bottom: 1.5rem; }
.info { color: #94a3b8; }
.card {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 640px;
}
.row {
  display: flex; align-items: flex-end; gap: 1rem;
  padding: 0.8rem 0; border-bottom: 1px solid #f1f5f9;
}
.label { width: 160px; font-weight: 600; color: #334155; }
.label small { display: block; color: #94a3b8; font-weight: 400; }
.field { display: flex; flex-direction: column; }
.field.grow { flex: 1; }
.field label { font-size: 0.8rem; color: #64748b; margin-bottom: 0.3rem; }
.field input[type="text"] {
  padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 8px; width: 100%;
}
.field input[type="color"] {
  width: 48px; height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer;
}
.actions { margin-top: 1.2rem; display: flex; align-items: center; gap: 1rem; }
.primary { background: #2563eb; color: #fff; border: none; padding: 0.6rem 1.4rem; border-radius: 8px; cursor: pointer; }
.ok { color: #16a34a; }
.err { color: #dc2626; }

.reset { 
  background: #e2e8f0; 
  border: none; 
  padding: 0.6rem 1.4rem; 
  border-radius: 8px; 
  cursor: pointer; 
}
</style>
