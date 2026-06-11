<script setup>
import { ref, computed, onMounted } from 'vue'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { createTicket, linkItemToTicket } from '@/services/glpiApi'

const glpi = useGlpiStore()

// --- Données du formulaire ---
const form = ref({
  titre: '',
  description: '',
  type: 1,       // 1 = Incident, 2 = Demande
  priority: 3    // 3 = Moyenne
})

// --- Éléments disponibles + sélection ---
const elements = ref([])          // { id, name, itemtype }
const selected = ref(new Set())   // ids des éléments cochés (clé = itemtype-id)
const search = ref('')

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref(null)

// Charger les éléments (Computers + Monitors)
async function loadElements() {
  loading.value = true
  error.value = ''
  try {
    const { computers, monitors } = await glpi.fetchStats()
    elements.value = [
      ...computers.map((c) => ({ id: c.id, name: c.name, itemtype: 'Computer' })),
      ...monitors.map((m) => ({ id: m.id, name: m.name, itemtype: 'Monitor' }))
    ]
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur de chargement des éléments'
  } finally {
    loading.value = false
  }
}

const filteredElements = computed(() => {
  if (!search.value) return elements.value
  const q = search.value.toLowerCase()
  return elements.value.filter((e) => e.name.toLowerCase().includes(q))
})

function keyOf(el) {
  return `${el.itemtype}-${el.id}`
}

function toggle(el) {
  const k = keyOf(el)
  if (selected.value.has(k)) selected.value.delete(k)
  else selected.value.add(k)
  // forcer la réactivité du Set
  selected.value = new Set(selected.value)
}

function isSelected(el) {
  return selected.value.has(keyOf(el))
}

const selectedCount = computed(() => selected.value.size)

async function submit() {
  error.value = ''
  success.value = null

  if (!form.value.titre.trim()) {
    error.value = 'Le titre est obligatoire.'
    return
  }

  submitting.value = true
  try {
    // 1) Créer le ticket
    const t = await glpi.ensureToken()
    const res = await createTicket(t, {
      name: form.value.titre.trim(),
      content: form.value.description.trim(),
      type: Number(form.value.type),
      priority: Number(form.value.priority),
      entities_id: 0
    })
    const ticketId = res?.id || res?.[0]?.id
    if (!ticketId) throw new Error('Le ticket n\'a pas pu être créé.')

    // 2) Associer les éléments sélectionnés
    let links = 0
    for (const el of elements.value) {
      if (selected.value.has(keyOf(el))) {
        try {
          await linkItemToTicket(t, ticketId, el.itemtype, el.id)
          links++
        } catch (e) { /* liaison non bloquante */ }
      }
    }

    success.value = { ticketId, links }
    // réinitialiser le formulaire
    form.value = { titre: '', description: '', type: 1, priority: 3 }
    selected.value = new Set()
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur lors de la création.'
  } finally {
    submitting.value = false
  }
}

onMounted(loadElements)
</script>

<template>
  <FoLayout>
    <h1>Créer un ticket</h1>

    <div v-if="success" class="success">
      ✅ Ticket #{{ success.ticketId }} créé avec {{ success.links }} élément(s) associé(s).
    </div>

    <form class="form" @submit.prevent="submit">
      <label class="field">
        <span>Titre *</span>
        <input v-model="form.titre" placeholder="Titre du ticket" />
      </label>

      <label class="field">
        <span>Description</span>
        <textarea v-model="form.description" rows="4" placeholder="Décrivez le problème..."></textarea>
      </label>

      <div class="row">
        <label class="field">
          <span>Type</span>
          <select v-model="form.type">
            <option :value="1">Incident</option>
            <option :value="2">Demande</option>
          </select>
        </label>

        <label class="field">
          <span>Priorité</span>
          <select v-model="form.priority">
            <option :value="1">Très basse</option>
            <option :value="2">Basse</option>
            <option :value="3">Moyenne</option>
            <option :value="4">Haute</option>
            <option :value="5">Très haute</option>
          </select>
        </label>
      </div>

      <!-- Sélection multiple d'éléments -->
      <div class="field">
        <span>Éléments associés ({{ selectedCount }} sélectionné(s))</span>
        <input v-model="search" class="search" placeholder="Rechercher un élément..." />

        <div v-if="loading" class="info">Chargement des éléments...</div>
        <div v-else class="elements-list">
          <label v-for="el in filteredElements" :key="keyOf(el)" class="el-item">
            <input type="checkbox" :checked="isSelected(el)" @change="toggle(el)" />
            <span class="el-name">{{ el.name }}</span>
            <span class="el-type">{{ el.itemtype }}</span>
          </label>
          <p v-if="!filteredElements.length" class="info">Aucun élément.</p>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Création...' : 'Créer le ticket' }}
      </button>
    </form>
  </FoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.form { max-width: 640px; }
.field { display: block; margin-bottom: 1.2rem; }
.field > span { display: block; font-weight: 600; margin-bottom: 0.4rem; color: #334155; }
input, textarea, select {
  width: 100%; padding: 0.6rem 0.7rem; border: 1px solid #cbd5e1;
  border-radius: 8px; font-size: 0.95rem;
}
input:focus, textarea:focus, select:focus { outline: none; border-color: #0f766e; }
.row { display: flex; gap: 1rem; }
.row .field { flex: 1; }
.search { margin-bottom: 0.6rem; }
.elements-list {
  border: 1px solid #e2e8f0; border-radius: 8px; max-height: 240px;
  overflow-y: auto; background: #fff;
}
.el-item {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.5rem 0.8rem; border-bottom: 1px solid #f1f5f9; cursor: pointer;
}
.el-item:hover { background: #f8fafc; }
.el-item input[type="checkbox"] { width: auto; }
.el-name { flex: 1; }
.el-type {
  font-size: 0.75rem; background: #ccfbf1; color: #0f766e;
  padding: 0.1rem 0.5rem; border-radius: 999px;
}
.info { color: #94a3b8; padding: 0.5rem; }
.error { color: #dc2626; background: #fee2e2; padding: 0.6rem; border-radius: 8px; margin-bottom: 1rem; }
.success { color: #16a34a; background: #dcfce7; padding: 0.8rem; border-radius: 8px; margin-bottom: 1.5rem; }
button {
  background: #0f766e; color: #fff; border: none; padding: 0.7rem 1.6rem;
  border-radius: 8px; cursor: pointer; font-size: 1rem;
}
button:disabled { opacity: 0.6; cursor: default; }
</style>
