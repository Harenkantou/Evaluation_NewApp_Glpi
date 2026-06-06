<script setup>
import { ref, onMounted } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getTickets } from '@/services/glpiApi'

const glpi = useGlpiStore()
const tickets = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    tickets.value = await getTickets(t)
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
    <h1>Tickets (GLPI)</h1>

    <div v-if="loading" class="info">Chargement...</div>
    <div v-else-if="error" class="error">{{ error }} <button @click="load">Réessayer</button></div>

    <table v-else-if="tickets.length" class="grid">
      <thead>
        <tr><th>ID</th><th>Titre</th><th>Statut</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in tickets" :key="t.id">
          <td>{{ t.id }}</td>
          <td>{{ t.name || 'Sans titre' }}</td>
          <td>{{ t.status?.name || t.status }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="info">Aucun ticket.</p>
  </BoLayout>
</template>

<style scoped>
h1 { margin-top: 0; }
.info { color: #94a3b8; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; }
.grid {
  width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
th, td { padding: 0.8rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
th { background: #f8fafc; font-size: 0.85rem; color: #475569; }
</style>
