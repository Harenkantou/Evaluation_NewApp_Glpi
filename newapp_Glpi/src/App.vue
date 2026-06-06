<script setup>
import { onMounted, ref } from 'vue'
import { initSession, getTickets } from './services/glpiApi'

const tickets = ref([])
const loading = ref(true)
const error = ref(null)

async function loadTickets() {
  loading.value = true
  error.value = null

  try {
    // 1. Obtenir un access_token OAuth2 (API v2)
    const accessToken = await initSession()
    console.log('Token OAuth2 obtenu avec succès')

    // 2. Récupérer les tickets avec le Bearer token
    const response = await getTickets(accessToken)

    // L'API v2 renvoie un tableau d'items.
    // On reste tolérant sur le format de la réponse.
    if (Array.isArray(response)) {
      tickets.value = response
    } else if (Array.isArray(response?.data)) {
      tickets.value = response.data
    } else {
      tickets.value = []
    }

    console.log(`${tickets.value.length} tickets récupérés`)
  } catch (err) {
    console.error('Erreur détaillée:', err)
    error.value =
      err.response?.data?.detail ||
      err.response?.data?.title ||
      err.response?.data?.message ||
      err.message ||
      "Erreur de connexion à l'API GLPI"
  } finally {
    loading.value = false
  }
}

onMounted(loadTickets)
</script>

<template>
  <main>
    <h1>NewApp GLPI</h1>

    <!-- État de chargement -->
    <div v-if="loading" class="loading">
      Chargement des tickets...
    </div>

    <!-- Erreur -->
    <div v-else-if="error" class="error">
      <h2>Erreur</h2>
      <p>{{ error }}</p>
      <button @click="loadTickets">Réessayer</button>
    </div>

    <!-- Tickets -->
    <div v-else>
      <p>Nombre de tickets : {{ tickets.length }}</p>

      <ul v-if="tickets.length > 0">
        <li v-for="ticket in tickets" :key="ticket.id">
          <strong>{{ ticket.name || 'Sans titre' }}</strong>
          <span v-if="ticket.status" class="status">
            Statut : {{ ticket.status.name || ticket.status }}
          </span>
        </li>
      </ul>

      <p v-else class="empty">
        Aucun ticket trouvé
      </p>
    </div>
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
  font-family: Arial, sans-serif;
}

.loading {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.error {
  color: #d32f2f;
  background: #ffebee;
  padding: 1rem;
  border-radius: 8px;
}

.error button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #d32f2f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background: #f5f5f5;
  margin: 0.5rem 0;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  font-size: 0.8rem;
  color: #666;
  background: #e0e0e0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.empty {
  text-align: center;
  color: #999;
  padding: 2rem;
}
</style>
