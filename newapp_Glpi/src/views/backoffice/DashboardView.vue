<script setup>
import { ref, onMounted, computed } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import StatCard from '@/components/backoffice/StatCard.vue'
import { useGlpiStore } from '@/stores/glpi'

const glpi = useGlpiStore()
const loading = ref(true)
const error = ref('')
const stats = ref({ computers: [], monitors: [], tickets: [] })

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
    // type peut être un nombre (1/2) ou déjà un libellé selon l'API
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
    stats.value = await glpi.fetchStats()
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
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
              <td>{{ type }}</td><td class="num">{{ n }}</td>
            </tr>
          </table>
        </section>

        <section class="panel">
          <h2>Tickets par type</h2>
          <table v-if="Object.keys(ticketsByType).length">
            <tr v-for="(n, type) in ticketsByType" :key="type">
              <td>{{ type }}</td><td class="num">{{ n }}</td>
            </tr>
          </table>
          <p v-else class="empty">Aucun ticket.</p>
        </section>
      </div>
    </div>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.info { color: #94a3b8; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; }
.cards { display: flex; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
.details { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.panel {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-width: 280px; flex: 1;
}
.panel h2 { margin-top: 0; font-size: 1.1rem; }
table { width: 100%; border-collapse: collapse; }
td { padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
.num { text-align: right; font-weight: 700; color: #2563eb; }
.empty { color: #94a3b8; }
</style>
