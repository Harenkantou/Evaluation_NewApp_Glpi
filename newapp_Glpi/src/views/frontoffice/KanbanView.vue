<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import {
  getTickets, getTicket,
  updateTicketStatus, addSolution, addFollowup, getUsers, linkUserToTicket
} from '@/services/glpiApi'
import { getSettings } from '@/services/sqliteService'
import { saveCost } from '@/services/costService'

const glpi = useGlpiStore()
const router = useRouter()

// Les 3 statuts/colonnes (codes GLPI)
const STATUSES = [1, 2, 6]

// Données par colonne (tableaux LOCAUX mutables -> nécessaire pour le drag)
const columns = ref({ 1: [], 2: [], 6: [] })

// Réglages SQLite
const settings = ref({})

const loading = ref(true)
const error = ref('')

// --- Modale détails ---
const detail = ref(null)

// --- Modale solution (passage vers Clos) ---
const showSolution = ref(false)
const solutionText = ref('')
let pendingClose = null

// --- Modale attribution technicien (Nouveau -> In Progress) ---
const showAssignModal = ref(false)
const selectedTechId = ref('')
const technicians = ref([])
let pendingAssign = null

// --- Modale réouverture (depuis Clos -> Nouveau ou In Progress) ---
const showReopen = ref(false)
const reopenReason = ref('')
let pendingReopen = null
let reopenTargetStatus = 1
const costPercentReopen = ref(false)

// --- Modale coût (après clôture) ---
const showCostDialog = ref(false)
const costAmount = ref('')
let pendingCost = null

//Modale Annulation
const getLastCost = ref('')
const deleteLastCost = ref(false)



// ---------- Chargement ----------
async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    const [tickets, cfgList, usersList] = await Promise.all([
      getTickets(t), 
      getSettings(), 
      getUsers(t)
    ])

    const cfg = {}
    for (const s of cfgList) {
      const id = s.statusId ?? s.status_id
      if (id != null) cfg[id] = s
    }
    settings.value = cfg
    technicians.value = usersList


    const cols = { 1: [], 2: [], 6: [] }
    for (const tk of tickets) {
      const st = Number(tk.status)
      if (cols[st]) cols[st].push(tk)
    }
    columns.value = cols
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}

// helpers d'affichage
function colColor(code) { 
  return settings.value[code]?.color || '#f1f5f9' 
}

function colLabel(code) {
  const cfg = settings.value[code] || {}
  const defaultLabels = { 1: 'Nouveau', 2: 'En cours', 6: 'Terminé' }
  return cfg.labelFr || cfg.label_fr || cfg.label_mg || cfg.labelMg || defaultLabels[code] || `Statut ${code}`
}

// ---------- Drag & drop ----------
async function onChange(evt, targetStatus) {
  if (!evt.added) return
  const ticket = evt.added.element
  const oldStatus = Number(ticket.status)

  // CAS 1 : RÉOUVERTURE -> on vient de Clos (6) vers Nouveau (1) ou In Progress (2)
  if (oldStatus === 6 && (targetStatus === 1 || targetStatus === 2)) {
    pendingReopen = ticket
    reopenTargetStatus = targetStatus
    reopenReason.value = ''
    showReopen.value = true
    costPercentReopen.value = true
    getLastCost.value = true
    deleteLastCost.value = true 
    return
  }

  // CAS 2 : Nouveau -> In Progress (1 -> 2) -> attribuer un technicien
  if (oldStatus === 1 && targetStatus === 2) {
    pendingAssign = ticket
    selectedTechId.value = ''
    showAssignModal.value = true
    return
  }

  // CAS 3 : passage vers Clos -> boîte de dialogue solution
  if (targetStatus === 6) {
    pendingClose = ticket
    solutionText.value = ''
    showSolution.value = true
    return
  }

  // CAS 4 : changement direct
  try {
    const t = await glpi.ensureToken()
    await updateTicketStatus(t, ticket.id, targetStatus)
    ticket.status = targetStatus
  } catch (e) {
    error.value = 'Changement de statut échoué : ' + (e.message || '')
    await load()
  }
}

// ---------- Réouverture ----------
async function confirmReopen() {
  if (!pendingReopen) return
  if (!reopenReason.value.trim()) {
    error.value = 'Veuillez saisir un motif de réouverture.'
    return
  }
  try {
    const t = await glpi.ensureToken()
    await addFollowup(t, pendingReopen.id, 'Réouverture : ' + reopenReason.value.trim())
    await updateTicketStatus(t, pendingReopen.id, reopenTargetStatus)
    pendingReopen.status = reopenTargetStatus
  } catch (e) {
    error.value = 'Réouverture échouée : ' + (e.message || '')
  } finally {
    showReopen.value = false
    pendingReopen = null
    costPercentReopen = false
    getLastCost = false
    deleteLastCost = false 
    await load()
  }
}

async function cancelReopen() {
  showReopen.value = false
  pendingReopen = null
  await load()
}

// ---------- Clôture ----------
async function confirmClose() {
  if (!pendingClose) return
  try {
    const t = await glpi.ensureToken()
    if (solutionText.value.trim()) {
      await addSolution(t, pendingClose.id, solutionText.value.trim())
    }
    await updateTicketStatus(t, pendingClose.id, 6)
    pendingClose.status = 6
    
    // Fermer la modale solution
    showSolution.value = false
    
    // Ouvrir la modale de coût
    pendingCost = pendingClose
    costAmount.value = ''
    showCostDialog.value = true
    
  } catch (e) {
    error.value = 'Clôture échouée : ' + (e.message || '')
    showSolution.value = false
    pendingClose = null
    await load()
  }

}

async function cancelClose() {
  showSolution.value = false
  pendingClose = null
  await load()
}

// ---------- Sauvegarde du coût ----------
async function confirmCost() {
  if (!pendingCost) return
  
  // Validation du montant
  const amount = parseFloat(costAmount.value)
  if (isNaN(amount) || amount <= 0) {
    alert('❌ Veuillez saisir un montant valide (supérieur à 0)')
    return
  }
  
  try {
    // Sauvegarder le coût dans SQLite via costService
    const result = await saveCost({
      ticketId: pendingCost.id,
      ticketName: pendingCost.name || `Ticket #${pendingCost.id}`,
      cost: amount
    })
    
    console.log('✅ Coût sauvegardé:', result)
    alert(`✅ Coût de ${amount.toFixed(2)}€ enregistré pour le ticket #${pendingCost.id}`)
    
  } catch (e) {
    console.error('❌ Erreur sauvegarde:', e)
    alert('❌ Erreur lors de la sauvegarde du coût: ' + (e.response?.data?.message || e.message || 'Erreur inconnue'))
  } finally {
    // Fermer la modale et nettoyer
    showCostDialog.value = false
    pendingCost = null
    costAmount.value = ''
    await load()
  }
}

async function deleteCost () {
  
}
async function cancelCost() {
  showCostDialog.value = false
  pendingCost = null
  costAmount.value = ''
  await load()
}

// ---------- Attribution technicien ----------
async function confirmAssign() {
  if (!pendingAssign || !selectedTechId.value) {
    error.value = 'Veuillez sélectionner un technicien'
    return
  }
  try {
    const t = await glpi.ensureToken()
    await linkUserToTicket(t, pendingAssign.id, selectedTechId.value, 2)
    await updateTicketStatus(t, pendingAssign.id, 2)
    pendingAssign.status = 2
  } catch (e) {
    error.value = 'Attribution échouée : ' + (e.message || '')
  } finally {
    showAssignModal.value = false
    pendingAssign = null
    selectedTechId.value = ''
    await load()
  }
}

async function cancelAssign() {
  showAssignModal.value = false
  pendingAssign = null
  selectedTechId.value = ''
  await load()
}

// ---------- Ajouter un ticket ----------
function goToCreateTicket() {
  router.push({ name: 'fo-create-ticket' })
}

// ---------- Détails ----------
async function openDetail(ticket) {
  try {
    const t = await glpi.ensureToken()
    detail.value = await getTicket(t, ticket.id)
  } catch (e) {
    detail.value = ticket
  }
}

onMounted(load)
</script>

<template>
  <FoLayout>
    <div class="kanban-head">
      <h1>📋 Tableau Kanban</h1>
      <button class="add-btn" @click="goToCreateTicket">+ Nouveau ticket</button>
    </div>

    <div v-if="loading" class="info">⏳ Chargement des tickets...</div>
    <div v-else-if="error" class="error">
      ❌ {{ error }}
      <button @click="load" class="retry-btn">Réessayer</button>
    </div>

    <div v-else class="board">
      <div v-for="code in STATUSES" :key="code" class="column" :style="{ background: colColor(code) }">
        <div class="col-head">
          <span>{{ colLabel(code) }}</span>
          <span class="count">{{ columns[code].length }}</span>
        </div>

        <draggable
          :list="columns[code]"
          group="tickets"
          item-key="id"
          class="col-body"
          @change="(evt) => onChange(evt, code)"
        >
          <template #item="{ element }">
            <div class="card" @click="openDetail(element)">
              <strong>{{ element.name || 'Sans titre' }}</strong>
              <small>#{{ element.id }}</small>
            </div>
          </template>
        </draggable>

        <button class="add-ticket-btn-col" @click="goToCreateTicket">+ Ajouter</button>
      </div>
    </div>

    <!-- Modale : détails -->
    <div v-if="detail" class="overlay" @click.self="detail = null">
      <div class="modal">
        <h2>Ticket #{{ detail.id }}</h2>
        <div class="row"><span>Titre</span><b>{{ detail.name }}</b></div>
        <div class="row"><span>Description</span><b v-html="detail.content"></b></div>
        <div class="row"><span>Statut</span><b>{{ detail.status?.name || detail.status }}</b></div>
        <div class="row"><span>Priorité</span><b>{{ detail.priority?.name || detail.priority }}</b></div>
        <div class="modal-actions">
          <button class="primary" @click="detail = null">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Modale : solution avant clôture -->
    <div v-if="showSolution" class="overlay" @click.self="cancelClose">
      <div class="modal">
        <h2>🔒 Clôturer le ticket</h2>
        <p class="hint">Veuillez saisir la solution apportée avant de clore.</p>
        <textarea v-model="solutionText" rows="4" placeholder="Solution..."></textarea>
        <div class="modal-actions">
          <button class="ghost" @click="cancelClose">Annuler</button>
          <button class="primary" @click="confirmClose">Valider la clôture</button>
        </div>
      </div>
    </div>

    <!-- Modale : saisir le coût APRÈS clôture -->
    <div v-if="showCostDialog" class="overlay" @click.self="cancelCost">
      <div class="modal cost-modal">
        <div class="modal-header">
          <span class="modal-icon">💰</span>
          <h2>Saisir le coût</h2>
        </div>
        
        <div class="ticket-info">
          <span class="label">Ticket :</span>
          <strong>{{ pendingCost?.name || `#${pendingCost?.id}` }}</strong>
        </div>
        
        <div class="form-group">
          <label>Montant (€)</label>
          <input 
            v-model="costAmount" 
            type="number" 
            step="0.01"
            min="0"
            placeholder="0.00"
            class="cost-input"
            autofocus
            @keyup.enter="confirmCost"
          />
        </div>
        
        <p class="hint">💡 Saisissez le coût total associé à ce ticket (main d'œuvre, pièces, etc.)</p>
        
        <div class="modal-actions">
          <button class="ghost" @click="cancelCost">Annuler</button>
          <button class="primary" @click="confirmCost" :disabled="!costAmount || parseFloat(costAmount) <= 0">
            Valider ({{ costAmount || 0 }} €)
          </button>
        </div>
      </div>
    </div>

    <!-- Modale : attribuer technicien -->
    <div v-if="showAssignModal" class="overlay" @click.self="cancelAssign">
      <div class="modal">
        <h2>👨‍💻 Assigner un technicien</h2>
        <p><strong>Ticket :</strong> {{ pendingAssign?.name }}</p>
        
        <label>Sélectionner un technicien</label>
        <select v-model="selectedTechId" class="tech-select">
          <option value="">-- Sélectionner --</option>
          <option v-for="tech in technicians" :key="tech.id" :value="tech.id">
            {{ tech.name }} {{ tech.realname ? `(${tech.realname})` : '' }}
          </option>
        </select>
        
        <div class="modal-actions">
          <button class="ghost" @click="cancelAssign">Annuler</button>
          <button class="primary" @click="confirmAssign" :disabled="!selectedTechId">Assigner</button>
        </div>
      </div>
    </div>

    <!-- Modale : réouverture -->
    <div v-if="showReopen" class="overlay" @click.self="cancelReopen">
      <div class="modal">
        <h2>🔄 Réouvrir le ticket</h2>
        <p><strong>Ticket :</strong> {{ pendingReopen?.name }}</p>
        
        <label>Motif de réouverture</label>
        <textarea v-model="reopenReason" rows="4" placeholder="Motif..."></textarea>
        
        <div class="modal-actions">
          <button class="ghost" @click="cancelReopen">Annuler</button>
          <button class="primary" @click="confirmReopen" :disabled="!reopenReason.trim()">Réouvrir</button>
        </div>
      </div>
    </div>
  </FoLayout>
</template>

<style scoped>
.kanban-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

h1 { margin: 0; }

.add-btn {
  background: #0f766e;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #0d5c56;
}

.info { color: #94a3b8; text-align: center; padding: 2rem; }

.error {
  color: #dc2626;
  background: #fee2e2;
  padding: 0.8rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.retry-btn {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
}

.board {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  align-items: flex-start;
  overflow-x: auto;
}

.column {
  flex: 1;
  min-width: 280px;
  border-radius: 12px;
  padding: 0.8rem;
  min-height: 400px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.col-head {
  font-weight: 700;
  margin-bottom: 0.8rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #1e293b;
}

.count {
  background: rgba(0,0,0,0.15);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
  font-size: 0.85rem;
}

.col-body {
  min-height: 350px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 0.7rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  transition: all 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.card small {
  color: #94a3b8;
  font-size: 0.7rem;
}

.add-ticket-btn-col {
  width: 100%;
  margin-top: 0.8rem;
  background: rgba(255,255,255,0.6);
  border: 1px dashed #cbd5e1;
  color: #475569;
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.15s;
}

.add-ticket-btn-col:hover {
  background: white;
  border-color: #94a3b8;
}

/* Modales */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  width: 450px;
  max-width: 90vw;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.cost-modal {
  width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal h2 {
  margin: 0;
}

.ticket-info {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}

.ticket-info .label {
  color: #64748b;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1e293b;
}

.modal input, .modal textarea, .modal select {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
}

.cost-input {
  font-size: 1.2rem;
  text-align: center;
}

.hint {
  color: #64748b;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.row {
  display: flex;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.row span {
  width: 100px;
  color: #64748b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.5rem;
}

.ghost {
  background: #e2e8f0;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.ghost:hover {
  background: #cbd5e1;
}

.primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tech-select {
  width: 100%;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .board {
    flex-direction: column;
  }
  
  .modal {
    width: 95vw;
  }
}
</style>