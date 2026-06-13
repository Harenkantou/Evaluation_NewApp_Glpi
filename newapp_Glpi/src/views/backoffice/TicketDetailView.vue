<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getTicket, getTicketCosts } from '@/services/glpiApi'
//import { useGlpiStore} from '@/stores/glpi'
//import { getTicket} from '@/services/glpiApi'
const route = useRoute()
const router = useRouter()
const glpi = useGlpiStore()

const ticket = ref(null)
const costs = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
     const response = await fetch(`/api/tickets/${route.params.id}`)
    ticket.value = await response.json()
    
    const t = await glpi.ensureToken()
    const id = route.params.id

    const tk = await getTicket(t, id) 
    ticket.value = {
      titre: tk.name, 
      description: tk.content,
      status: tk.status,
    }
    
    costs.value = await getTicketCosts(t, id)
  } catch (e) {
    error.value = e.response?.data?.detail || e.messsage || 'Impossible de charger le ticket'
  } finally {
    loading.value = false
  }

}

onMounted(load)
</script>

<template>
  <BoLayout>
    <div class="header">
      <h1>Fiche du Ticket #{{ route.params.id }}</h1>
      <button class="back-btn" @click="router.back()">⬅ Retour à la liste</button>
    </div>

    <div v-if="loading" class="info">Chargement des détails...</div>
    <div v-else-if="error" class="error">{{ error }} <button @click="load">Réessayer</button></div>

    <div v-else-if="ticket" class="ticket-card">
      <div class="status-badge">{{ ticket.status?.name || ticket.status }}</div>
      <h2>{{ ticket.name || 'Sans titre' }}</h2>
      
      <div class="meta-info">
        <p><strong>Date de création :</strong> {{ new Date(ticket.date).toLocaleString() }}</p>
        <p><strong>Priorité :</strong> {{ ticket.priority || 'Non définie' }}</p>
      </div>
      
      <div class="content-box">
        <h3>Description du ticket</h3>
        <div class="description" v-html="ticket.content"></div>
      </div>

      <div class="content-box" v-if="costs.length">
  <h3>Coûts associés</h3>
  <table class="costs-table">
    <thead>
      <tr><th>Durée (s)</th><th>Coût horaire</th><th>Coût fixe</th><th>Coût matériel</th></tr>
    </thead>
    <tbody>
      <tr v-for="c in costs" :key="c.id">
        <td>{{ c.durationSecond }}</td>
        <td>{{ c.timeCost }}</td>
        <td>{{ c.fixedCost }}</td>
        <td>{{ c.materialCost }}</td>
      </tr>
    </tbody>
  </table>
</div>
<p v-else-if="!loading" class="info">Aucun coût enregistré pour ce ticket.</p>    </div>
  </BoLayout>
</template>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { margin: 0; }
.back-btn {
  background: #cbd5e1; color: #334155; border: none; padding: 0.6rem 1rem;
  border-radius: 8px; cursor: pointer; font-weight: bold;
}
.back-btn:hover { background: #94a3b8; }
.info { color: #94a3b8; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; }
.ticket-card {
  background: #fff; padding: 2rem; border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05); position: relative;
}
.status-badge {
  position: absolute; top: 2rem; right: 2rem; background: #2563eb;
  color: white; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold;
}
h2 { margin-top: 0; color: #1e293b; padding-right: 100px; }
.meta-info { display: flex; gap: 2rem; color: #64748b; margin-bottom: 2rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; }
.content-box { background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; }
.content-box h3 { margin-top: 0; font-size: 1rem; color: #475569; }
.description { color: #334155; line-height: 1.6; }
.costs-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
.costs-table th, .costs-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; }
.costs-table th { background: #f1f5f9; color: #475569; font-weight: 600; }
</style>