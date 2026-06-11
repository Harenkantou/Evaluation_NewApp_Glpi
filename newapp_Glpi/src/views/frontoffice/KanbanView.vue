<script setup>
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import {
  getTickets, getTicket, createTicket,
  updateTicketStatus, addSolution, addFollowup, getUsers, linkUserToTicket
} from '@/services/glpiApi'
import { getSettings } from '@/services/sqliteService'

const glpi = useGlpiStore()

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

// --- Modale ajout ---
const showAdd = ref(false)
const newTitre = ref('')
const newContent = ref('')

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
let pendingReopen = null        // ticket à rouvrir
let reopenTargetStatus = 1      // statut cible (1 ou 2)

// ---------- Chargement ----------
async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    const [tickets, cfgList, usersList] = await Promise.all([
      getTickets(t), getSettings(), getUsers(t)
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
function colColor(code) { return settings.value[code]?.color || '#f1f5f9' }
function colLabel(code) {
  const cfg = settings.value[code] || {}
  const defaultLabels = { 1: 'Nouveau', 2: 'In Progress', 6: 'Terminé' }
  return cfg.labelFr || cfg.label_fr || cfg.label_mg || cfg.labelMg || defaultLabels[code] || `Statut ${code}`
}

// Un ticket a-t-il déjà un technicien assigné ?
// (selon l'API, l'info peut être dans users_id_assign / _users_id_assign / team)
function hasTechnician(ticket) {
  if (ticket.users_id_assign && Number(ticket.users_id_assign) > 0) return true
  if (ticket._users_id_assign && Number(ticket._users_id_assign) > 0) return true
  return false
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

  // CAS 4 : changement direct (ex. In Progress -> Nouveau)
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
    // 1) Tracer le motif comme suivi
    await addFollowup(t, pendingReopen.id, 'Réouverture : ' + reopenReason.value.trim())
    // 2) Changer le statut (1 ou 2 selon la colonne d'arrivée)
    await updateTicketStatus(t, pendingReopen.id, reopenTargetStatus)
    pendingReopen.status = reopenTargetStatus
  } catch (e) {
    error.value = 'Réouverture échouée : ' + (e.message || '')
  } finally {
    showReopen.value = false
    pendingReopen = null
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
  } catch (e) {
    error.value = 'Clôture échouée : ' + (e.message || '')
  } finally {
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

// ---------- Attribution technicien ----------
async function confirmAssign() {
  if (!pendingAssign || !selectedTechId.value) return
  try {
    const t = await glpi.ensureToken()
    // 1) Lier le technicien — NON bloquant : si la liaison existe déjà
    //    (ex. le ticket avait déjà été attribué avant un retour en New),
    //    GLPI renvoie une erreur "doublon" qu'on ignore volontairement.
    try {
      await linkUserToTicket(t, pendingAssign.id, selectedTechId.value, 2)
    } catch (linkErr) {
      console.warn('Technicien déjà lié ou liaison ignorée:', linkErr?.message)
    }
    // 2) Le changement de statut, lui, doit TOUJOURS se faire
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
async function submitAdd() {
  if (!newTitre.value.trim()) return
  try {
    const t = await glpi.ensureToken()
    await createTicket(t, {
      name: newTitre.value.trim(),
      content: newContent.value.trim(),
      status: 1
    })
    showAdd.value = false
    newTitre.value = ''
    newContent.value = ''
    await load()
  } catch (e) {
    error.value = 'Création du ticket échouée : ' + (e.message || '')
  }
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
      <h1>Tableau Kanban</h1>
    </div>

    <div v-if="loading" class="info">Chargement...</div>
    <div v-else-if="error" class="error">{{ error }} <button @click="load">Réessayer</button></div>

    <div v-else class="board">
      <div v-for="code in STATUSES" :key="code" class="column" :style="{ background: colColor(code) }">
        <div class="col-head">
          {{ colLabel(code) }}
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

        <button v-if="code === 1" class="add-ticket-btn-col" @click="showAdd = true">
          + Ajouter 1 ticket
        </button>
      </div>
    </div>

    <!-- Modale : ajouter un ticket -->
    <div v-if="showAdd" class="overlay" @click.self="showAdd = false">
      <div class="modal">
        <h2>Nouveau ticket</h2>
        <label>Titre</label>
        <input v-model="newTitre" placeholder="Titre du ticket" />
        <label>Description</label>
        <textarea v-model="newContent" rows="4" placeholder="Description"></textarea>
        <div class="modal-actions">
          <button class="ghost" @click="showAdd = false">Annuler</button>
          <button class="primary" @click="submitAdd">Créer</button>
        </div>
      </div>
    </div>

    <!-- Modale : solution avant clôture -->
    <div v-if="showSolution" class="overlay" @click.self="cancelClose">
      <div class="modal">
        <h2>Clôturer le ticket</h2>
        <p class="hint">Veuillez saisir la solution apportée avant de clore.</p>
        <textarea v-model="solutionText" rows="4" placeholder="Solution..."></textarea>
        <div class="modal-actions">
          <button class="ghost" @click="cancelClose">Annuler</button>
          <button class="primary" @click="confirmClose">Valider la clôture</button>
        </div>
      </div>
    </div>

    <!-- Modale : attribuer un technicien (Nouveau -> In Progress) -->
    <div v-if="showAssignModal" class="overlay" @click.self="cancelAssign">
      <div class="modal">
        <h2>Attribuer le ticket</h2>
        <p class="hint">Veuillez sélectionner un technicien GLPI pour ce ticket.</p>
        <label for="tech-select">Technicien</label>
        <select id="tech-select" v-model="selectedTechId" class="tech-select-dropdown">
          <option value="" disabled>-- Choisir un technicien --</option>
          <option v-for="tech in technicians" :key="tech.id" :value="tech.id">
            {{ tech.name }} (ID: {{ tech.id }})
          </option>
        </select>
        <div class="modal-actions">
          <button class="ghost" @click="cancelAssign">Annuler</button>
          <button class="primary" @click="confirmAssign" :disabled="!selectedTechId">Valider</button>
        </div>
      </div>
    </div>

    <!-- Modale : réouverture (depuis Clos) -->
    <div v-if="showReopen" class="overlay" @click.self="cancelReopen">
      <div class="modal">
        <h2>Rouvrir le ticket</h2>
        <p class="hint">
          Ce ticket est clôturé. Indiquez le motif de réouverture
          (il sera ajouté comme suivi).
        </p>
        <textarea v-model="reopenReason" rows="4" placeholder="Motif de réouverture..."></textarea>
        <div class="modal-actions">
          <button class="ghost" @click="cancelReopen">Annuler</button>
          <button class="primary" @click="confirmReopen">Rouvrir</button>
        </div>
      </div>
    </div>

    <!-- Modale : détails d'un ticket -->
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
  </FoLayout>
</template>

<style scoped>
.kanban-head { display: flex; justify-content: space-between; align-items: center; }
h1 { margin: 0; }
.info { color: #94a3b8; }
.error { color: #dc2626; background: #fee2e2; padding: 0.8rem; border-radius: 8px; }

.board { display: flex; gap: 1rem; margin-top: 1.5rem; align-items: flex-start; }
.column {
  flex: 1; border-radius: 12px; padding: 0.8rem; min-height: 300px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.col-head {
  font-weight: 700; margin-bottom: 0.8rem; display: flex;
  justify-content: space-between; align-items: center; color: #1e293b;
}
.count {
  background: rgba(0,0,0,0.15); color: #1e293b; border-radius: 999px;
  padding: 0.1rem 0.6rem; font-size: 0.85rem;
}
.col-body { min-height: 250px; display: flex; flex-direction: column; gap: 0.5rem; }
.card {
  background: #fff; border-radius: 8px; padding: 0.7rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15); cursor: grab;
  display: flex; flex-direction: column; gap: 0.2rem;
}
.card:hover { background: #f8fafc; }
.card small { color: #94a3b8; }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 50;
}
.modal {
  background: #fff; border-radius: 12px; padding: 1.5rem;
  width: 420px; max-width: 90vw; display: flex; flex-direction: column;
}
.modal h2 { margin-top: 0; }
.modal label { font-weight: 600; font-size: 0.85rem; margin: 0.5rem 0 0.3rem; }
.modal input, .modal textarea, .modal select {
  padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;
}
.hint { color: #64748b; font-size: 0.9rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1rem; }
.ghost { background: #e2e8f0; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.primary { background: #2563eb; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.primary:disabled { opacity: 0.5; cursor: default; }
.row { display: flex; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; }
.row span { width: 110px; color: #64748b; }

.add-ticket-btn-col {
  width: 100%; margin-top: 0.8rem; background: rgba(255, 255, 255, 0.6);
  border: 1px dashed #cbd5e1; color: #475569; padding: 0.6rem;
  border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;
  transition: all 0.15s;
}
.add-ticket-btn-col:hover { background: #fff; border-color: #94a3b8; color: #0f172a; }
.tech-select-dropdown { width: 100%; margin-top: 0.5rem; margin-bottom: 0.5rem; background: #fff; }
.tech-select-dropdown:focus { border-color: #2563eb; }
</style>
