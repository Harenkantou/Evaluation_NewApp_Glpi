<script setup>
import { ref, computed, onMounted } from 'vue'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getComputers, getMonitors, createTicket, linkItemToTicket } from '@/services/glpiApi'

const glpi = useGlpiStore()

const titre = ref('')
const description = ref('')
const elements = ref([])        // tous les éléments disponibles
const selection = ref([])       // ids cochés (checkbox multiple)
const search = ref('')

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref('')

async function load() {
  loading.value = true
  try {
    const t = await glpi.ensureToken()
    const [computers, monitors] = await Promise.all([getComputers(t), getMonitors(t)])
    elements.value = [
      ...computers.map((e) => ({ id: e.id, name: e.name, itemtype: 'Computer' })),
      ...monitors.map((e) => ({ id: e.id, name: e.name, itemtype: 'Monitor' }))
    ]
  } catch (e) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

const filtered = computed(() =>
  elements.value.filter((e) =>
    !search.value || e.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

async function submit() {
  error.value = ''
  success.value = ''
  if (!titre.value.trim()) { error.value = 'Le titre est obligatoire.'; return }

  submitting.value = true
  try {
    const t = await glpi.ensureToken()
    // 1) créer le ticket
    const res = await createTicket(t, {
      name: titre.value.trim(),
      content: description.value.trim(),
      status: 1
    })
    const ticketId = res.id || res

    // 2) lier chaque élément coché
    for (const id of selection.value) {
      const el = elements.value.find((e) => e.id === id)
      if (el) await linkItemToTicket(t, ticketId, el.itemtype, el.id)
    }

    success.value = `Ticket #${ticketId} créé avec ${selection.value.length} élément(s) associé(s).`
    titre.value = ''
    description.value = ''
    selection.value = []
  } catch (e) {
    error.value = e.message || 'Création échouée'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <FoLayout>
    <h1>Créer un ticket</h1>

    <div class="card">
      <label>Titre</label>
      <input v-model="titre" placeholder="Titre du ticket" />

      <label>Description</label>
      <textarea v-model="description" rows="3" placeholder="Description"></textarea>

      <label>Éléments à associer ({{ selection.length }} sélectionné(s))</label>
      <input v-model="search" class="search" placeholder="Filtrer les éléments..." />

      <div v-if="loading" class="info">Chargement des éléments...</div>
      <div v-else class="elements-list">
        <label v-for="el in filtered" :key="el.itemtype + '-' + el.id" class="el-row">
          <input type="checkbox" :value="el.id" v-model="selection" />
          <span>{{ el.name }}</span>
          <small>{{ el.itemtype }}</small>
        </label>
        <p v-if="!filtered.length" class="info">Aucun élément.</p>
      </div>

      <button :disabled="submitting" @click="submit">
        {{ submitting ? 'Création...' : 'Créer le ticket' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="ok">{{ success }}</p>
    </div>
  </FoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.card {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 560px;
}
label { display: block; font-weight: 600; margin: 0.8rem 0 0.3rem; color: #334155; }
input, textarea {
  width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;
}
.search { margin-bottom: 0.5rem; }
.elements-list {
  max-height: 220px; overflow: auto; border: 1px solid #e2e8f0;
  border-radius: 8px; padding: 0.5rem;
}
.el-row {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 400; margin: 0; padding: 0.3rem;
}
.el-row input { width: auto; }
.el-row small { color: #94a3b8; margin-left: auto; }
button {
  margin-top: 1rem; background: #0f766e; color: #fff; border: none;
  padding: 0.7rem 1.4rem; border-radius: 8px; cursor: pointer;
}
button:disabled { opacity: 0.6; }
.info { color: #94a3b8; }
.error { color: #dc2626; margin-top: 0.8rem; }
.ok { color: #16a34a; margin-top: 0.8rem; }
</style>
