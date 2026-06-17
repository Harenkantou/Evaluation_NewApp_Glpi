<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import StatCard from '@/components/backoffice/StatCard.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getAllTicketCosts, getTicketItems } from '@/services/glpiApi'
import { getAllCosts } from '@/services/costService'

const router = useRouter()
const glpi = useGlpiStore()
const loading = ref(true)
const error = ref('')
const stats = ref({ computers: [], monitors: [], tickets: [] })
const costRows = ref([])
const costTotals = ref({ glpi: 0, super: 0, reopening: 0, total: 0 })

// Libellés des types de ticket GLPI (le champ "type" reste numérique)
const TICKET_TYPE_LABEL = { 1: 'Incident', 2: 'Demande' }

const elementCount = computed(() => stats.value.computers.length + stats.value.monitors.length)
const ticketCount = computed(() => stats.value.tickets.length)

const elementsByType = computed(() => ({
  Computer: stats.value.computers.length,
  Monitor: stats.value.monitors.length
}))

const ticketsByType = computed(() => {
  const map = {}
  for (const t of stats.value.tickets) {
    let label = t.type
    if (typeof label === 'number' || /^\d+$/.test(String(label))) {
      label = TICKET_TYPE_LABEL[Number(label)] || `Type ${label}`
    }
    label = label || '(non typé)'
    map[label] = (map[label] || 0) + 1
  }
  return map
})

const normalizeItemType = (raw) => {
  const value = String(raw || '').trim().toLowerCase()
  if (value.includes('computer')) return 'Computer'
  if (value.includes('monitor') || value.includes('moniteur')) return 'Monitor'
  if (value.includes('printer') || value.includes('imprimante')) return 'Printer'
  if (value.includes('phone')) return 'Phone'
  if (value.includes('peripheral')) return 'Peripheral'
  if (value.includes('network')) return 'NetworkEquipment'
  return 'Unknown'
}

const extractTicketRef = (ticket) => {
  const content = String(ticket?.content || '')
  const match = content.match(/Ref_Ticket:\s*([^\s<]+)/i)
  if (match?.[1]) return String(match[1]).trim()
  return String(ticket?.ref_ticket || ticket?.ticketRef || ticket?.id || '').trim()
}

const extractItemNamesFromContent = (ticket) => {
  const content = String(ticket?.content || '')
  const match = content.match(/Items:\s*([\s\S]*?)(?:\n\s*\w+\s*:|$)/i)
  const raw = String(match?.[1] || '').trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean)
  } catch {}
  return raw
    .replace(/^[\[]|[\]]$/g, '')
    .replace(/["']/g, '')
    .split(',')
    .map((x) => String(x).trim())
    .filter(Boolean)
}

const fmt = (value) => Number(value || 0).toFixed(2)

async function buildCostRows(token, tickets, glpiCosts, sqliteCosts) {
  const ticketItemsByRef = new Map()
  const elementTypeByName = new Map()

  for (const el of stats.value.elements || []) {
    const name = String(el.name || '').trim().toLowerCase()
    if (!name) continue
    const type = String(el._type || '').trim()
    if (type) elementTypeByName.set(name, type)
  }

  await Promise.all((tickets || []).map(async (ticket) => {
    const ref = extractTicketRef(ticket)
    if (!ref) return
    try {
      const items = await getTicketItems(token, ticket.id)
      const itemTypesFromApi = [...new Set(
        (items || [])
          .filter((item) => item && item.itemtype)
          .map((item) => normalizeItemType(item.itemtype))
          .filter((type) => type !== 'Unknown')
      )]

      const itemNamesFromContent = extractItemNamesFromContent(ticket)
      const itemTypesFromContent = [...new Set(
        itemNamesFromContent
          .map((name) => elementTypeByName.get(name.toLowerCase()))
          .filter((type) => type && type !== 'Unknown')
      )]

      const itemTypes = itemTypesFromApi.length ? itemTypesFromApi : itemTypesFromContent
      ticketItemsByRef.set(ref, itemTypes)
    } catch {
      const itemNamesFromContent = extractItemNamesFromContent(ticket)
      const itemTypesFromContent = [...new Set(
        itemNamesFromContent
          .map((name) => elementTypeByName.get(name.toLowerCase()))
          .filter((type) => type && type !== 'Unknown')
      )]
      ticketItemsByRef.set(ref, itemTypesFromContent)
    }
  }))

  const rowsMap = new Map()
  const addRow = (itemType, field, amount) => {
    const row = rowsMap.get(itemType) || {
      itemType,
      glpiCost: 0,
      reopeningCost: 0,
      superCost: 0
    }
    row[field] += amount
    rowsMap.set(itemType, row)
  }

  const allCosts = [
    ...glpiCosts.map((item) => ({ ...item, source: 'glpi' })),
    ...sqliteCosts.map((item) => ({ ...item, source: 'sqlite', isReopening: Boolean(item.isReopening) }))
  ]

  for (const cost of allCosts) {
    const amount = cost.source === 'glpi'
      ? ((cost.actiontime || 0) / 3600) * (cost.costTime || 0) + (cost.costFixed || 0) + (cost.costMaterial || 0)
      : Number(cost.cost) || 0

    if (amount <= 0) continue

    const ticketRef = String(cost.ticketRef ?? cost.ticketId ?? '').trim()
    const itemTypes = ticketItemsByRef.get(ticketRef) || ticketItemsByRef.get(String(cost.ticketId)) || []
    const field = cost.source === 'glpi'
      ? 'glpiCost'
      : (cost.isReopening ? 'reopeningCost' : 'superCost')

    const targetTypes = itemTypes.length ? itemTypes : ['Unknown']
    const share = amount / targetTypes.length
    targetTypes.forEach((type) => addRow(type, field, share))
  }

  const rows = [...rowsMap.values()].sort((a, b) => {
    const order = ['Computer', 'Monitor', 'Printer', 'Phone', 'Peripheral', 'NetworkEquipment', 'Unknown']
    return (order.indexOf(a.itemType) - order.indexOf(b.itemType)) || a.itemType.localeCompare(b.itemType)
  })

  const totals = rows.reduce((sum, row) => ({
    glpi: sum.glpi + row.glpiCost,
    reopening: sum.reopening + row.reopeningCost,
    super: sum.super + row.superCost,
    total: sum.total + row.glpiCost + row.reopeningCost + row.superCost
  }), { glpi: 0, reopening: 0, super: 0, total: 0 })

  costRows.value = rows
  costTotals.value = totals
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    const [statsData, glpiCosts, sqliteCosts] = await Promise.all([
      glpi.fetchStats(),
      getAllTicketCosts(t),
      getAllCosts()
    ])
    stats.value = statsData
    await buildCostRows(t, statsData.tickets || [], glpiCosts, sqliteCosts)
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}

function goToCostManagement() {
  router.push('/backoffice/costs')
}

function goToTickets() {
  router.push('/admin/tickets')
}

function goToImport() {
  router.push('/admin/import')
}

onMounted(load)
</script>

<template>
  <BoLayout>
    <h1>Tableau de bord</h1>

    <div v-if="loading" class="info">Chargement depuis GLPI...</div>
    <div v-else-if="error" class="error">{{ error }} <button @click="load">Réessayer</button></div>

    <div v-else>
      <div class="cards">
        <StatCard label="Éléments" :value="elementCount" icon="🖥️" />
        <StatCard label="Tickets" :value="ticketCount" icon="🎫" />
      </div>

      <div class="details">
        <section class="panel">
          <h2>Éléments par type</h2>
          <table>
            <tr v-for="(n, type) in elementsByType" :key="type">
              <td>{{ type }}</td>
              <td class="num">{{ n }}</td>
            </tr>
          </table>
        </section>

        <section class="panel">
          <h2>Tickets par type</h2>
          <table v-if="Object.keys(ticketsByType).length">
            <tr v-for="(n, type) in ticketsByType" :key="type">
              <td>{{ type }}</td>
              <td class="num">{{ n }}</td>
            </tr>
          </table>
          <p v-else class="empty">Aucun ticket.</p>
        </section>
      </div>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; color: #1e293b; }
.info { color: #94a3b8; text-align: center; padding: 2rem; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.error button { background: #dc2626; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; }

.cards { display: flex; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }

.details { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.panel {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-width: 280px; flex: 1;
}
.panel h2 { margin-top: 0; font-size: 1.1rem; color: #1e293b; }
table { width: 100%; border-collapse: collapse; }
td { padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
.num { text-align: right; font-weight: 700; color: #2563eb; }
.empty { color: #94a3b8; text-align: center; padding: 1rem; }

.pivot-panel {
  margin-top: 1.5rem;
}

.pivot-head {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.8rem;
}

.pivot-subtitle {
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 600;
}

.pivot-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* Quick access panel */
.quick-access {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.quick-access h2 {
  color: white;
}

.quick-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: translateX(4px);
}

.btn-icon {
  font-size: 1.2rem;
}
</style>
