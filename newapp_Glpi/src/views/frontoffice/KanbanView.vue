<script setup>
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import {
  getTickets, getTicket, createTicket,
  updateTicketStatus, addSolution
} from '@/services/glpiApi'
import { getSettings } from '@/services/sqliteService'

const glpi = useGlpiStore()

// Les 3 statuts/colonnes (codes GLPI)
const STATUSES = [1, 2, 6]

// Données par colonne (tableaux LOCAUX mutables -> nécessaire pour le drag)
const columns = ref({
  1: [],
  2: [],
  6: []
})

// Réglages SQLite : { 1: {color,label_fr}, 2: {...}, 6: {...} }
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
let pendingClose = null   // { id } du ticket à clore

// ---------- Chargement ----------
async function load() {
  loading.value = true
  error.value = ''
  try {
    const t = await glpi.ensureToken()
    const [tickets, cfgList] = await Promise.all([getTickets(t), getSettings()])

    // indexer les réglages par statusId
    const cfg = {}
    for (const s of cfgList) {
      const id = s.statusId ?? s.status_id
      if (id != null) cfg[id] = s
    }
    settings.value = cfg

    // répartir les tickets par statut
    const cols = { 1: [], 2: [], 6: [] }
    for (const tk of tickets) {
      const st = Number(tk.status)
      if (cols[st]) cols[st].push(tk)
      // les autres statuts (3,4,5) ne sont pas affichés
    }
    columns.value = cols
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}

// helper d'affichage
function colColor(code) { return settings.value[code]?.color || '#f1f5f9' }
function colLabel(code) {
  const cfg = settings.value[code] || {}
  const defaultLabels = {
    1: 'Nouveau',
    2: 'In Progress',
    6: 'Terminé'
  }
  return cfg.labelFr || cfg.label_mg || cfg.labelMg || defaultLabels[code] || `Statut ${code}`
}

// ---------- Drag & drop ----------
// vuedraggable émet @change sur la liste de destination avec { added }
async function onChange(evt, targetStatus) {
  if (!evt.added) return
  const ticket = evt.added.element

  // Cas spécial : passage vers Clos -> boîte de dialogue solution
  if (targetStatus === 6) {
    pendingClose = ticket
    solutionText.value = ''
    showSolution.value = true
    return
  }

  // Changement direct
  try {
    const t = await glpi.ensureToken()
    await updateTicketStatus(t, ticket.id, targetStatus)
    ticket.status = targetStatus
  } catch (e) {
    error.value = 'Changement de statut échoué : ' + (e.message || '')
    await load() // revenir à l'état réel
  }
}

// Valider la clôture (depuis la modale solution)
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
    await load() // resynchroniser l'affichage
  }
}

// Annuler la clôture -> remettre le ticket dans sa colonne d'origine
async function cancelClose() {
  showSolution.value = false
  pendingClose = null
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
    error.value = "Création du ticket échouée : " + (e.message || '')
  }
}

// ---------- Détails ----------
async function openDetail(ticket) {
  try {
    const t = await glpi.ensureToken()
    detail.value = await getTicket(t, ticket.id)
  } catch (e) {
    detail.value = ticket // fallback : afficher au moins les infos déjà là
  }
}

onMounted(load)
</script>

<template>
  <FoLayout>
    <div class="kanban-head">
      <h1>Tableau Kanban</h1>
      <button class="add-btn" @click="showAdd = true">+ Ajouter 1 ticket</button>
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
.add-btn {
  background: #0f766e; color: #fff; border: none; padding: 0.6rem 1.2rem;
  border-radius: 8px; cursor: pointer; font-size: 0.95rem;
}
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

/* Modales */
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
.modal input, .modal textarea {
  padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;
}
.hint { color: #64748b; font-size: 0.9rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1rem; }
.ghost { background: #e2e8f0; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.primary { background: #2563eb; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.row { display: flex; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; }
.row span { width: 110px; color: #64748b; }
</style>
