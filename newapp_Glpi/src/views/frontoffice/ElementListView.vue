<script setup>
import { ref, computed, onMounted } from 'vue'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'

const glpi = useGlpiStore()

const elements = ref([])
const loading = ref(true)
const error = ''

const filters = ref({
  name: '', type: '', location: '', manufacturer: '', status: '', user: ''
})
const errorRef = ref('')

// Avec l'API v1 + expand_dropdowns, les champs sont des NOMS directs :
//   locations_id = "Administration", manufacturers_id = "Dell",
//   states_id = "En production", users_id = "Rakoto Jean"
async function load() {
  loading.value = true
  errorRef.value = ''
  try {
    const { computers, monitors } = await glpi.fetchStats()
    const norm = (item, type) => ({
      id: item.id,
      name: item.name || '',
      type,
      location: cleanVal(item.locations_id),
      manufacturer: cleanVal(item.manufacturers_id),
      status: cleanVal(item.states_id),
      user: cleanVal(item.users_id)
    })
    elements.value = [
      ...computers.map((c) => norm(c, 'Computer')),
      ...monitors.map((m) => norm(m, 'Monitor'))
    ]
  } catch (e) {
    errorRef.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}

// GLPI renvoie parfois "&nbsp;" ou "0" pour un dropdown vide -> on nettoie
function cleanVal(v) {
  if (v == null) return ''
  const s = String(v).replace(/&nbsp;/g, '').trim()
  if (s === '0' || s === '') return ''
  return s
}

const uniq = (key) =>
  [...new Set(elements.value.map((e) => e[key]).filter(Boolean))].sort()

const locations = computed(() => uniq('location'))
const manufacturers = computed(() => uniq('manufacturer'))
const statuses = computed(() => uniq('status'))

const filtered = computed(() => {
  const f = filters.value
  return elements.value.filter((e) => {
    const mName = !f.name || e.name.toLowerCase().includes(f.name.toLowerCase())
    const mType = !f.type || e.type === f.type
    const mLoc = !f.location || e.location === f.location
    const mManu = !f.manufacturer || e.manufacturer === f.manufacturer
    const mStat = !f.status || e.status === f.status
    const mUser = !f.user || e.user.toLowerCase().includes(f.user.toLowerCase())
    return mName && mType && mLoc && mManu && mStat && mUser
  })
})

function resetFilters() {
  filters.value = { name: '', type: '', location: '', manufacturer: '', status: '', user: '' }
}

onMounted(load)
</script>

<template>
  <FoLayout>
    <h1>Liste des éléments</h1>

    <div class="search">
      <input v-model="filters.name" placeholder="Nom..." />
      <select v-model="filters.type">
        <option value="">Tous les types</option>
        <option value="Computer">Computer</option>
        <option value="Monitor">Monitor</option>
        <option value="Phone">Phone</option>
      </select>
      <select v-model="filters.location">
        <option value="">Tous les lieux</option>
        <option v-for="l in locations" :key="l" :value="l">{{ l }}</option>
      </select>
      <select v-model="filters.manufacturer">
        <option value="">Tous les fabricants</option>
        <option v-for="m in manufacturers" :key="m" :value="m">{{ m }}</option>
      </select>
      <select v-model="filters.status">
        <option value="">Tous les statuts</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <input v-model="filters.user" placeholder="Utilisateur..." />
      <button class="reset" @click="resetFilters">Réinitialiser</button>
    </div>

    <div v-if="loading" class="info">Chargement...</div>
    <div v-else-if="errorRef" class="error">{{ errorRef }} <button @click="load">Réessayer</button></div>

    <div v-else>
      <p class="count">{{ filtered.length }} / {{ elements.length }} élément(s)</p>
      <table v-if="filtered.length" class="grid">
        <thead>
          <tr>
            <th>Nom</th><th>Type</th><th>Lieu</th>
            <th>Fabricant</th><th>Statut</th><th>Utilisateur</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filtered" :key="e.type + '-' + e.id">
            <td>{{ e.name }}</td>
            <td><span class="badge">{{ e.type }}</span></td>
            <td>{{ e.location || '—' }}</td>
            <td>{{ e.manufacturer || '—' }}</td>
            <td>{{ e.status || '—' }}</td>
            <td>{{ e.user || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="info">Aucun élément ne correspond aux critères.</p>
    </div>
  </FoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.search { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.5rem; }
.search input, .search select {
  padding: 0.5rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem;
}
.search input:focus, .search select:focus { outline: none; border-color: #0f766e; }
.reset { background: #e2e8f0; border: none; border-radius: 8px; padding: 0.5rem 1rem; cursor: pointer; }
.reset:hover { background: #cbd5e1; }
.count { color: #64748b; margin-bottom: 0.5rem; }
.info { color: #94a3b8; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; }
.grid {
  width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
th, td { padding: 0.7rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
th { background: #f8fafc; font-size: 0.85rem; color: #475569; }
.badge { background: #ccfbf1; color: #0f766e; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.8rem; }
</style>
