<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FoLayout from '@/views/frontoffice/FoLayout.vue'

const route = useRoute()
const router = useRouter()

const ticket = ref(null)
const costs = ref([])
const loading = ref(true)
const error = ref('')
const isEditing = ref(false)

// Données d'édition
const editForm = ref({
  titre: '',
  description: '',
  type: 1,
  priority: 3
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    // TODO: Récupérer le ticket depuis votre API backend
    // const response = await fetch(`/api/tickets/${route.params.id}`)
    // ticket.value = await response.json()
    
    // Données d'exemple pour la structure
    ticket.value = {
      id: route.params.id,
      titre: 'Exemple de ticket détaillé',
      description: 'Description détaillée du ticket...',
      type: 'Incident',
      priority: 'Moyenne',
      status: 'Nouveau',
      date: new Date().toLocaleDateString('fr-FR'),
      heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      elements: [
        { id: 1, name: 'PC-ADM-001', type: 'Computer', status: 'Actif', location: 'Bureau 1' },
        { id: 2, name: 'MON-001', type: 'Monitor', status: 'Actif', location: 'Bureau 1' }
      ]
    }
    
    costs.value = [
      { id: 1, durationSecond: 3600, timeCost: 45.50, fixedCost: 25.00 },
      { id: 2, durationSecond: 1800, timeCost: 22.75, fixedCost: 0 }
    ]

    if (isEditing.value) {
      editForm.value = {
        titre: ticket.value.titre,
        description: ticket.value.description,
        type: ticket.value.type,
        priority: ticket.value.priority
      }
    }
  } catch (e) {
    error.value = e.message || 'Impossible de charger le ticket'
  } finally {
    loading.value = false
  }
}

function startEdit() {
  isEditing.value = true
  editForm.value = {
    titre: ticket.value.titre,
    description: ticket.value.description,
    type: ticket.value.type,
    priority: ticket.value.priority
  }
}

function cancelEdit() {
  isEditing.value = false
}

async function saveEdit() {
  try {
    // TODO: Envoyer les modifications à votre API backend
    // await fetch(`/api/tickets/${route.params.id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(editForm.value)
    // })
    
    ticket.value = { ...ticket.value, ...editForm.value }
    isEditing.value = false
  } catch (e) {
    error.value = 'Erreur lors de la sauvegarde'
  }
}

async function deleteTicket() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) return
  try {
    // TODO: Supprimer le ticket via votre API backend
    // await fetch(`/api/tickets/${route.params.id}`, { method: 'DELETE' })
    router.push('/tickets')
  } catch (e) {
    error.value = 'Erreur lors de la suppression'
  }
}

function printTicket() {
  window.print()
}

const totalCost = computed(() => {
  return costs.value.reduce((sum, cost) => sum + (cost.timeCost || 0) + (cost.fixedCost || 0), 0)
})

const totalDuration = computed(() => {
  const seconds = costs.value.reduce((sum, cost) => sum + (cost.durationSecond || 0), 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
})

onMounted(load)
</script>

<template>
  <FoLayout>
    <div class="detail-container">
      <!-- En-tête avec actions -->
      <div class="detail-header">
        <div class="header-left">
          <button class="back-btn" @click="router.back()">⬅ Retour</button>
          <h1>Ticket #{{ route.params.id }}</h1>
        </div>
        <div class="header-actions" v-if="ticket && !isEditing">
          <button class="action-btn edit-btn" @click="startEdit">✎ Modifier</button>
          <button class="action-btn print-btn" @click="printTicket">⌨ Imprimer</button>
          <button class="action-btn delete-btn" @click="deleteTicket">🗑 Supprimer</button>
        </div>
      </div>

      <!-- États de chargement/erreur -->
      <div v-if="loading" class="info-box">⏳ Chargement des détails...</div>
      <div v-else-if="error" class="error-box">
        ❌ {{ error }}
        <button @click="load" class="retry-btn">Réessayer</button>
      </div>

      <!-- Contenu principal -->
      <div v-else-if="ticket" class="ticket-detail">
        
        <!-- SECTION 1: Informations principales -->
        <section class="detail-section">
          <div class="section-header">
            <h2>📋 Informations principales</h2>
          </div>

          <div v-if="!isEditing" class="info-grid">
            <div class="info-item">
              <label>Titre</label>
              <p class="value">{{ ticket.titre }}</p>
            </div>
            <div class="info-item">
              <label>Type</label>
              <span class="badge badge-type">{{ ticket.type }}</span>
            </div>
            <div class="info-item">
              <label>Priorité</label>
              <span class="badge" :class="`badge-priority-${ticket.priority?.toLowerCase()}`">
                {{ ticket.priority }}
              </span>
            </div>
            <div class="info-item">
              <label>Status</label>
              <span class="badge badge-status">{{ ticket.status }}</span>
            </div>
            <div class="info-item">
              <label>Date création</label>
              <p class="value">{{ ticket.date }} à {{ ticket.heure }}</p>
            </div>
          </div>

          <!-- Mode édition -->
          <div v-else class="edit-form">
            <div class="form-group">
              <label>Titre *</label>
              <input v-model="editForm.titre" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea v-model="editForm.description" class="form-textarea" rows="6"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Type</label>
                <select v-model="editForm.type" class="form-select">
                  <option value="1">Incident</option>
                  <option value="2">Demande</option>
                </select>
              </div>
              <div class="form-group">
                <label>Priorité</label>
                <select v-model="editForm.priority" class="form-select">
                  <option value="1">Basse</option>
                  <option value="2">Moyenne-basse</option>
                  <option value="3">Moyenne</option>
                  <option value="4">Moyenne-haute</option>
                  <option value="5">Haute</option>
                </select>
              </div>
            </div>
            <div class="edit-actions">
              <button @click="saveEdit" class="btn btn-primary">💾 Enregistrer</button>
              <button @click="cancelEdit" class="btn btn-secondary">❌ Annuler</button>
            </div>
          </div>

          <!-- Description -->
          <div class="description-box">
            <h3>Description complète</h3>
            <p>{{ ticket.description }}</p>
          </div>
        </section>

        <!-- SECTION 2: Éléments associés -->
        <section class="detail-section" v-if="ticket.elements?.length">
          <div class="section-header">
            <h2>🖥 Éléments associés ({{ ticket.elements.length }})</h2>
          </div>

          <div class="elements-grid">
            <div v-for="element in ticket.elements" :key="element.id" class="element-card">
              <div class="element-image" v-if="element.imagePath">
                <img :src="element.imagePath" :alt="element.name" />
              </div>
              <div v-else class="element-image placeholder">
                <span v-if="element.type === 'Computer'">💻</span>
                <span v-else-if="element.type === 'Monitor'">🖥</span>
                <span v-else>📦</span>
              </div>
              
              <div class="element-info">
                <h4>{{ element.name }}</h4>
                <div class="element-detail">
                  <span class="badge badge-small">{{ element.type }}</span>
                  <span class="status-small" :class="{ active: element.status === 'Actif' }">
                    {{ element.status }}
                  </span>
                </div>
                <p class="location">📍 {{ element.location || 'Localisation inconnue' }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 3: Coûts associés -->
        <section class="detail-section" v-if="costs?.length">
          <div class="section-header">
            <h2>💰 Détail des coûts</h2>
          </div>

          <div class="costs-summary">
            <div class="summary-item">
              <span class="label">Durée totale</span>
              <span class="value highlight">{{ totalDuration }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Coût total</span>
              <span class="value highlight cost">{{ totalCost.toFixed(2) }}€</span>
            </div>
          </div>

          <table class="costs-table">
            <thead>
              <tr>
                <th>Durée</th>
                <th>Coût (temps)</th>
                <th>Coût (fixe)</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(cost, idx) in costs" :key="idx">
                <td>{{ Math.floor(cost.durationSecond / 3600) }}h {{ Math.floor((cost.durationSecond % 3600) / 60) }}m</td>
                <td>{{ cost.timeCost?.toFixed(2) || '0.00' }}€</td>
                <td>{{ cost.fixedCost?.toFixed(2) || '0.00' }}€</td>
                <td class="total-cell">
                  <strong>{{ ((cost.timeCost || 0) + (cost.fixedCost || 0)).toFixed(2) }}€</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- SECTION 4: Historique/Commentaires (futur) -->
        <section class="detail-section">
          <div class="section-header">
            <h2>💬 Commentaires (à venir)</h2>
          </div>
          <p class="placeholder-text">Les commentaires seront disponibles dans une prochaine version.</p>
        </section>

      </div>
    </div>
  </FoLayout>
</template>

<style scoped>
.detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* En-tête */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-left h1 {
  margin: 0;
  color: #1e293b;
  font-size: 1.8rem;
}

.back-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.header-actions {
  display: flex;
  gap: 0.8rem;
}

.action-btn {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.action-btn.edit-btn {
  background: #2563eb;
  color: white;
}

.action-btn.edit-btn:hover {
  background: #1d4ed8;
}

.action-btn.print-btn {
  background: #8b5cf6;
  color: white;
}

.action-btn.print-btn:hover {
  background: #7c3aed;
}

.action-btn.delete-btn {
  background: #dc2626;
  color: white;
}

.action-btn.delete-btn:hover {
  background: #b91c1c;
}

/* Boîtes d'information */
.info-box,
.error-box {
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  font-size: 1rem;
}

.info-box {
  background: #dbeafe;
  color: #075985;
}

.error-box {
  background: #fee2e2;
  color: #991b1b;
}

.retry-btn {
  margin-left: 1rem;
  padding: 0.4rem 0.8rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

/* Sections */
.detail-section {
  background: white;
  margin-bottom: 2rem;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

/* Grille d'infos */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-weight: 600;
  color: #64748b;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.info-item .value {
  margin: 0;
  color: #1e293b;
  font-size: 1rem;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: fit-content;
}

.badge-type {
  background: #dbeafe;
  color: #0c4a6e;
}

.badge-priority-basse {
  background: #d1fae5;
  color: #065f46;
}

.badge-priority-moyenne-basse {
  background: #fef3c7;
  color: #78350f;
}

.badge-priority-moyenne {
  background: #fed7aa;
  color: #7c2d12;
}

.badge-priority-moyenne-haute {
  background: #fecaca;
  color: #7f1d1d;
}

.badge-priority-haute {
  background: #fca5a5;
  color: #991b1b;
}

.badge-status {
  background: #c7d2e0;
  color: #1e293b;
}

.badge-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
}

.status-small {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #fed7aa;
  color: #7c2d12;
}

.status-small.active {
  background: #d1fae5;
  color: #065f46;
}

/* Description */
.description-box {
  padding: 2rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.description-box h3 {
  margin-top: 0;
  color: #1e293b;
}

.description-box p {
  color: #475569;
  line-height: 1.6;
}

/* Formulaire d'édition */
.edit-form {
  padding: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.edit-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

/* Éléments associés */
.elements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.element-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.element-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.element-image {
  width: 100%;
  height: 150px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  overflow: hidden;
}

.element-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.element-image.placeholder {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.element-info {
  padding: 1rem;
}

.element-info h4 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
  font-size: 0.95rem;
}

.element-detail {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.element-info .location {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

/* Coûts */
.costs-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  background: #f8fafc;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #2563eb;
}

.summary-item .label {
  font-weight: 600;
  color: #64748b;
}

.summary-item .value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e293b;
}

.summary-item .value.highlight {
  color: #2563eb;
}

.summary-item .value.cost {
  color: #dc2626;
}

.costs-table {
  width: 100%;
  border-collapse: collapse;
  padding: 2rem;
}

.costs-table thead {
  background: #f1f5f9;
}

.costs-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #cbd5e1;
}

.costs-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
}

.costs-table tr:hover {
  background: #f8fafc;
}

.total-cell {
  font-weight: 600;
  color: #dc2626;
}

/* Placeholder */
.placeholder-text {
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-left h1 {
    font-size: 1.3rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .elements-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .costs-table {
    font-size: 0.85rem;
  }

  .costs-table th,
  .costs-table td {
    padding: 0.7rem;
  }
}

@media print {
  .detail-header,
  .header-actions,
  .action-btn {
    display: none;
  }

  .detail-container {
    padding: 0;
  }

  .detail-section {
    page-break-inside: avoid;
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
}
</style>
