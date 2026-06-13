<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import StatCard from '@/components/backoffice/StatCard.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getAllTicketCosts } from '@/services/glpiApi'

const router = useRouter()
const glpi = useGlpiStore()
const loading = ref(true)
const error = ref('')
const stats = ref({ computers: [], monitors: [], tickets: [] })
const totalCost = ref(0)

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

async function load() {
  loading.value = true
  error.value = ''
  try {
  const t = await glpi.ensureToken()
const [statsData, allCosts] = await Promise.all([
  glpi.fetchStats(),
  getAllTicketCosts(t)
])
stats.value = statsData
totalCost.value = allCosts.reduce((sum, c) => sum + c.costTime + c.costFixed + c.costMaterial, 0)  } catch (e) {
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
        <StatCard label="Coûts" :value="totalCost.toFixed(2) + ' €'" icon="💰" @click="goToCostManagement" clickable />
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

        <!-- NOUVEAU PANEL : Accès rapide -->
        <section class="panel quick-access">
          <h2>Accès rapide</h2>
          <div class="quick-buttons">
            <button class="quick-btn" @click="goToTickets">
              <span class="btn-icon">🎫</span>
              Voir les tickets
            </button>
            <button class="quick-btn" @click="goToCostManagement">
              <span class="btn-icon">💰</span>
              Gérer les coûts
            </button>
            <button class="quick-btn" @click="goToImport">
              <span class="btn-icon">📥</span>
              Importer des données
            </button>
          </div>
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