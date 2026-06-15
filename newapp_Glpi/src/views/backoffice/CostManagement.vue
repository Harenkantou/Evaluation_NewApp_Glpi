<script setup>
import { ref, computed, onMounted } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getAllTicketCosts, getTicketItems } from '@/services/glpiApi'
import { getAllCosts } from '@/services/costService'

const glpi = useGlpiStore()
const loading = ref(true)
const error = ref('')
const glpiCosts = ref([])
const sqliteCosts = ref([])
const rows = ref([])

const normalizeItemType = raw => {
  const value = String(raw || '').trim().toLowerCase()
  if (value.includes('computer')) return 'Computer'
  if (value.includes('monitor') || value.includes('moniteur')) return 'Monitor'
  if (value.includes('phone')) return 'Phone'
  return 'Unknown'
}

const getItems = async (token, ticketId, cache) => {
  if (cache.has(ticketId)) return cache.get(ticketId)
  try {
    const items = await getTicketItems(token, ticketId)
    // ✅ CORRECTION 1 : Filtrer les liens invalides AVANT normalisation
    const normalized = items
      .filter(item => item && item.itemtype)
      .map(item => ({
        ...item,
        itemtype: normalizeItemType(item.itemtype)
      }))
    cache.set(ticketId, normalized)
    return normalized
  } catch {
    cache.set(ticketId, [])
    return []
  }
}

const addRow = (map, itemType, field, amount) => {
  const row = map.get(itemType) ?? { itemType, glpiCost: 0, superCost: 0, reopeningCost: 0 }
  row[field] += amount
  map.set(itemType, row)
}

const buildRows = async token => {
  const cache = new Map()
  const rowsMap = new Map()

  const costs = [
    ...glpiCosts.value.map(item => ({ ...item, source: 'glpi', isReopening: false })),
    ...sqliteCosts.value.map(item => ({ ...item, source: 'sqlite', isReopening: item.isReopening || false }))
  ]

  for (const cost of costs) {
    const amount = cost.source === 'glpi'
      ? ((cost.actiontime || 0) / 3600) * (cost.costTime || 0) + (cost.costFixed || 0) + (cost.costMaterial || 0)
      : Number(cost.cost) || 0
    if (amount <= 0) continue

    const items = await getItems(token, cost.ticketId, cache)
    // ✅ CORRECTION 2 : Déduplication stricte des itemTypes (un seul Computer même si lié plusieurs fois)
    const itemTypes = [...new Set(items.map(i => i.itemtype))].filter(type => type !== 'Unknown')
    
    // Déterminer le champ cible (glpiCost, superCost, ou reopeningCost)
    let field = 'glpiCost'
    if (cost.source === 'sqlite') {
      field = cost.isReopening ? 'reopeningCost' : 'superCost'
    }

    // 🔍 LOG de diagnostic (à retirer en production)
    console.log(`[Ticket ${cost.ticketId}] amount=${amount} field=${field} itemTypes=`, itemTypes)

    if (!itemTypes.length) {
      addRow(rowsMap, 'Unknown', field, amount)
      continue
    }

    // ✅ CORRECTION 3 : Partage équitable du montant entre les items distincts
    const share = amount / itemTypes.length
    itemTypes.forEach(type => addRow(rowsMap, type, field, share))
  }

  rows.value = [...rowsMap.values()].sort((a, b) => a.itemType.localeCompare(b.itemType))
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const token = await glpi.ensureToken()
    const [glpiC, sqliteC] = await Promise.all([getAllTicketCosts(token), getAllCosts()])
    glpiCosts.value = glpiC
    sqliteCosts.value = sqliteC
    await buildRows(token)
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
            <td><span :class="`badge badge-${row.itemType.toLowerCase()}`">{{ row.itemType }}</span></td>
            <td class="right">{{ fmt(row.glpiCost) }} €</td>
            <td class="right blue">{{ fmt(row.superCost) }} €</td>
            <td class="right green">{{ fmt(row.reopeningCost) }} €</td>
            <td class="right bold">{{ fmt(row.glpiCost + row.superCost + row.reopeningCost) }} €</td>
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
    </div>
  </BoLayout>
</template>

<style scoped>
/* (styles inchangés) */
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
  margin-bottom: 1rem;
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
tr:last-child td { border-bottom: none; }
tfoot td {
  border-top: 2px solid #e2e8f0;
  background: #f8fafc;
}

.right { text-align: right; }
.bold  { font-weight: 700; }
.blue  { color: #2563eb; }
.green { color: #059669; }

.badge {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-computer { background: #dbeafe; color: #1e40af; }
.badge-monitor  { background: #fef3c7; color: #92400e; }
.badge-phone    { background: #dcfce7; color: #166534; }
.badge-unknown  { background: #e2e8f0; color: #0f172a; }
.badge-ticket   { background: #f1f5f9; color: #475569; }

.empty {
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  padding: 2rem;
}
</style>