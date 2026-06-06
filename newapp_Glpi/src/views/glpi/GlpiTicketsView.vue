<script setup>
import { onMounted, ref } from 'vue'
import { initSession, getTickets } from '@/services/glpiApi'

const tickets = ref([])
const loading = ref(true)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const accessToken = await initSession()
    const response = await getTickets(accessToken)
    tickets.value = Array.isArray(response)
      ? response
      : (Array.isArray(response?.data) ? response.data : [])
  } catch (err) {
    error.value =
      err.response?.data?.detail ||
      err.response?.data?.title ||
      err.message ||
      "Erreur de connexion à l'API GLPI"
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="glpi">
    <header class="bar">
      <h1>ExistingApp — Tickets GLPI</h1>
      <router-link class="link" :to="{ name: 'dashboard' }">→ BackOffice NewApp</router-link>
    </header>

    <div v-if="loading" class="info">Chargement des tickets GLPI...</div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="load">Réessayer</button>
    </div>

    <div v-else>
      <p class="count">{{ tickets.length }} ticket(s)</p>
      <table v-if="tickets.length" class="grid">
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
      <p v-else class="info">Aucun ticket trouvé.</p>
    </div>
  </div>
</template>

<style scoped>
.glpi { padding: 2rem; max-width: 900px; margin: 0 auto; }
.bar { display: flex; justify-content: space-between; align-items: center; }
.link { color: #2563eb; text-decoration: none; }
.count { color: #64748b; }
.info { color: #94a3b8; padding: 1rem 0; }
.error { color: #dc2626; background: #fee2e2; padding: 1rem; border-radius: 8px; }
.error button { margin-top: 0.5rem; }
.grid {
  width: 100%; border-collapse: collapse; background: #fff;
  border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
th, td { padding: 0.8rem 1rem; text-align: left; border-bottom: 1px solid #f1f5f9; }
th { background: #f8fafc; font-size: 0.85rem; color: #475569; }
</style>
