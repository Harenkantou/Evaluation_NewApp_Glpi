<script setup>
import { ref, computed, onMounted } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import {
  getAllTicketCosts,
  getTicketItems,
  getComputers,
  getMonitors,
  getPhones
} from '@/services/glpiApi'
import { getAllCosts } from '@/services/costService'

const glpi = useGlpiStore()

const loading = ref(true)
const error = ref('')
const glpiCosts = ref([])
const sqliteCosts = ref([])
const rows = ref([])

//const reopeningByMode = ref([])

const selectedType = ref(null)
const allComputers = ref([])
const allMonitors = ref([])
const allPhones = ref([])

const normalizeItemType = raw => {
  const value = String(raw || '').trim().toLowerCase()
  if (value.includes('computer')) return 'Computer'
  if (value.includes('monitor') || value.includes('moniteur')) return 'Monitor'
  if (value.includes('phone')) return 'Phone'
  return null
}

const getItemsForTicket = async (token, ticketId, cache) => {
  if (cache.has(ticketId)) return cache.get(ticketId)
  try {
    const items = await getTicketItems(token, ticketId)
    const normalized = items
      .filter(item => item && item.itemtype)
      .map(item => ({ ...item, itemtype: normalizeItemType(item.itemtype) }))
      .filter(item => item.itemtype !== null)
    cache.set(ticketId, normalized)
    return normalized
  } catch {
    cache.set(ticketId, [])
    return []
  }
}

const addRow = (map, itemType, field, amount) => {
  const row = map.get(itemType) ?? { 
    itemType, 
    glpiCost: 0, 
    superCost: 0, 
    reopeningCost: 0 
  }
  row[field] += amount
  map.set(itemType, row)
}

const buildRows = async () => {
  const rowsMap = new Map()

  // 1️⃣ Coûts GLPI (toujours via API GLPI)
  for (const cost of glpiCosts.value) {
    const amount = ((cost.actiontime || 0) / 3600) * (cost.costTime || 0)
      + (cost.costFixed || 0) + (cost.costMaterial || 0)
    if (amount <= 0) continue

    // Pour les coûts GLPI, on récupère encore les items via API
    const token = await glpi.ensureToken()
    const items = await getTicketItems(token, cost.ticketId)
    const normalized = (items || [])
      .map(i => normalizeItemType(i.itemtype))
      .filter(t => t !== null)
    
    if (!normalized.length) continue
    const share = amount / normalized.length
    normalized.forEach(type => addRow(rowsMap, type, 'glpiCost', share))
  }

  // 2️⃣ Coûts SQLite (avec itemType déjà en base !)
  for (const cost of sqliteCosts.value) {
    const amount = Number(cost.costValue) || 0
    if (amount <= 0) continue
    
    // ✅ Plus besoin d'appeler GLPI : itemType est en base !
    const itemType = cost.itemType
    if (!itemType || itemType === 'Unknown') {
      console.warn(`⚠️ Coût SQLite #${cost.id} sans itemType → ignoré`)
      continue
    }
    
    const field = cost.costType === 'reopening' ? 'reopeningCost' : 'superCost'
    addRow(rowsMap, itemType, field, amount)
  }

  rows.value = [...rowsMap.values()].sort((a, b) => a.itemType.localeCompare(b.itemType))
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = await glpi.ensureToken()

    const [glpiC, sqliteC, computers, monitors, phones] = await Promise.all([
      getAllTicketCosts(token),
      getAllCosts(),
      getComputers(token),
      getMonitors(token),
      getPhones(token)
    ])

    glpiCosts.value = glpiC
    sqliteCosts.value = sqliteC
    allComputers.value = computers || []
    allMonitors.value = monitors || []
    allPhones.value = phones || []

    await buildRows()   // ✅ Plus besoin de token
  } catch (err) {
    error.value = err.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
}

const totals = computed(() => rows.value.reduce((sum, row) => ({
  glpi: sum.glpi + row.glpiCost,
  super: sum.super + row.superCost,
  reopening: sum.reopening + row.reopeningCost,
  total: sum.total + row.glpiCost + row.superCost + row.reopeningCost
}), { glpi: 0, super: 0, reopening: 0, total: 0 }))

// ✅ Items affichés selon le type sélectionné
const selectedItems = computed(() => {
  if (!selectedType.value) return []
  switch (selectedType.value) {
    case 'Computer': return allComputers.value
    case 'Monitor':  return allMonitors.value
    case 'Phone':    return allPhones.value
    default:         return []
  }
})

const selectType = (type) => {
  selectedType.value = selectedType.value === type ? null : type
}

const closeDetail = () => {
  selectedType.value = null
}

const fmt = value => Number(value || 0).toFixed(2)

onMounted(loadData)
</script>

<template>
  <BoLayout>
    <div class="header">
      <h1>💰 Gestion des coûts</h1>
      <button class="btn-refresh" @click="loadData" :disabled="loading">
        {{ loading ? '⏳' : '🔄' }} Actualiser
      </button>
    </div>

    <p v-if="loading">⏳ Chargement...</p>
    <div v-else-if="error" class="alert-error">❌ {{ error }}</div>

    <div v-else>
      <!-- Stats globales -->
      <div class="stats">
        <div class="stat-card">
          <span>Coût GLPI</span>
          <strong>{{ fmt(totals.glpi) }} €</strong>
        </div>
        <div class="stat-card">
          <span>Coût SuperCost</span>
          <strong>{{ fmt(totals.super) }} €</strong>
        </div>
        <div class="stat-card">
          <span>Total Réouverture</span>
          <strong>{{ fmt(totals.reopening) }} €</strong>
        </div>
        <div class="stat-card accent">
          <span>Total général</span>
          <strong>{{ fmt(totals.total) }} €</strong>
        </div>
      </div>

      <!-- Tableau principal -->
      <table v-if="rows.length">
        <thead>
          <tr>
            <th>Item Type</th>
            <th class="right">Coût GLPI</th>
            <th class="right">Coût SuperCost</th>
            <th class="right">Total Réouverture</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.itemType">
            <!-- ✅ SEUL le badge est cliquable -->
            <td>
              <span
                :class="['badge', `badge-${row.itemType.toLowerCase()}`, 'clickable']"
                :title="`Cliquer pour voir les ${row.itemType}`"
                @click="selectType(row.itemType)"
              >
                {{ row.itemType }} 👁️
              </span>
            </td>
            <td class="right">{{ fmt(row.glpiCost) }} €</td>
            <td class="right blue">{{ fmt(row.superCost) }} €</td>
            <td class="right green">{{ fmt(row.reopeningCost) }} €</td>
            <td class="right bold">
              {{ fmt(row.glpiCost + row.superCost + row.reopeningCost) }} €
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="right bold">{{ fmt(totals.glpi) }} €</td>
            <td class="right bold blue">{{ fmt(totals.super) }} €</td>
            <td class="right bold green">{{ fmt(totals.reopening) }} €</td>
            <td class="right bold">{{ fmt(totals.total) }} €</td>
          </tr>
        </tfoot>
      </table>


      <p v-else class="empty">Aucun coût enregistré.</p>

      <!-- ─── DÉTAIL au clic ──────────────────────────────── -->
      <div v-if="selectedType" class="detail-panel">
        <div class="detail-header">
          <h2>
            <span :class="`badge badge-${selectedType.toLowerCase()}`">
              {{ selectedType }}
            </span>
            Items concernés ({{ selectedItems.length }})
          </h2>
          <button class="btn-close" @click="closeDetail">✕</button>
        </div>

        <table v-if="selectedItems.length">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Fabricant</th>
              <th>Modèle</th>
              <th>Statut</th>
              <th>Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in selectedItems" :key="item.id">
              <td><strong>{{ item.name || `#${item.id}` }}</strong></td>
              <td>{{ item.manufacturers_id || '-' }}</td>
              <td>
                {{
                  item.computermodels_id ||
                  item.monitormodels_id ||
                  item.phonemodels_id ||
                  '-'
                }}
              </td>
              <td>
                <span class="status-badge">{{ item.states_id || '-' }}</span>
              </td>
              <td>{{ item.users_id || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty">Aucun item dans cette catégorie.</p>
      </div>
    </div>
  </BoLayout>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
h1 { margin: 0; color: #1e293b; }

.btn-refresh {
  background: #e2e8f0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.btn-refresh:hover:not(:disabled) { background: #cbd5e1; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

.stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.stat-card {
  background: white;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  min-width: 160px;
}
.stat-card.accent { background: #f0fdf4; }
.stat-card span {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.3rem;
}
.stat-card strong { font-size: 1.3rem; color: #1e293b; }

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.8rem 1rem;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
th, td {
  padding: 0.7rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
}
th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 0.82rem;
  text-transform: uppercase;
}
tfoot td {
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
}

.right { text-align: right; }
.bold  { font-weight: 700; }
.blue  { color: #2563eb; }
.green { color: #059669; }

/* ✅ Badge cliquable */
.badge {
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.badge.clickable {
  cursor: pointer;
  transition: all 0.2s;
}
.badge.clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.badge-computer { background: #dbeafe; color: #1e40af; }
.badge-monitor  { background: #fef3c7; color: #92400e; }
.badge-phone    { background: #dcfce7; color: #166534; }

.status-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.empty {
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  padding: 2rem;
}

.detail-panel {
  margin-top: 1.5rem;
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border-left: 4px solid #2563eb;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid #f1f5f9;
}
.detail-header h2 {
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-close {
  background: #fee2e2;
  color: #991b1b;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
}
.btn-close:hover { background: #fecaca; }
</style>