<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getTickets } from '@/services/glpiApi'

const glpi = useGlpiStore()
const tickets = ref([])
const loading = ref(true)
const error = ref('')

// --- Pagination ---
const pageSize = 10
const currentPage = ref(1)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(tickets.value.length / pageSize))
)

const paginatedTickets = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return tickets.value.slice(start, start + pageSize)
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

// Garder la page courante dans les bornes si la liste change
watch(totalPages, (max) => {
  if (currentPage.value > max) currentPage.value = max
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    tickets.value = await getTickets(t)
    currentPage.value = 1
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

    <template v-else-if="tickets.length">
      <table class="grid">
        <thead>
          <tr><th>ID</th><th>Titre</th><th>Statut</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="t in paginatedTickets" :key="t.id">
            <td>{{ t.id }}</td>
            <td>{{ t.name || 'Sans titre' }}</td>
            <td>{{ t.status?.name || t.status }}</td>
            <td>
              <button class="view-btn" @click="$router.push({name: 'ticket-detail', params: {id: t.id}})">Voir detail ticket</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button class="page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">Précédent</button>
        <button
          v-for="page in totalPages"
          :key="page"
          class="page-btn"
          :class="{ active: page === currentPage }"
          @click="goToPage(page)"
        >{{ page }}</button>
        <button class="page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">Suivant</button>
      </div>
    </template>

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
.view-btn{
background-color: #2563eb;
color: white;
padding: 0.5rem 1rem;
border-radius: 6px;
cursor: pointer;
}
.pagination {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  flex-wrap: wrap;
}
.page-btn {
  min-width: 2.2rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
}
.page-btn:hover:not(:disabled) { background: #f1f5f9; }
.page-btn.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
