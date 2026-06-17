<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import FoLayout from '@/views/frontoffice/FoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import {getTickets, getTicket, updateTicketStatus, addSolution, addFollowup, getUsers, linkUserToTicket} from '@/services/glpiApi'
import { getSettings } from '@/services/sqliteService'
import { getAllCosts } from '@/services/costService'
// ✅ Service partagé
import { reopenTicket, closeTicket, cancelLastCost } from '@/services/ticketService'

const glpi = useGlpiStore()
const router = useRouter()
const STATUSES = [1, 2, 6]
const defaultLabels = { 1: 'Nouveau', 2: 'En cours', 6: 'Terminé' }
const reopenMode = ref(1)


// ─── State ───────────────────────────────────────────────────
const columns = ref(Object.fromEntries(STATUSES.map(code => [code, []])))
const settings = ref({})
const loading = ref(true)
const error = ref('')
const detail = ref(null)
const showSolution = ref(false)
const solutionText = ref('')
const costAmount = ref('')
const pendingClose = ref(null)
const showAssignModal = ref(false)
const selectedTechId = ref('')
const technicians = ref([])
const pendingAssign = ref(null)
const showReopenChoice = ref(false)
const reopenChoice = ref('')
const pendingReopen = ref(null)
const reopenTargetStatus = ref(1)
const lastTicketCost = ref(null)
const reopenPercentage = ref(10)

const firstTicketCost = ref(null)
const averageTicketCost = ref(null)
const sumTicketCost = ref(null)

// ─── Helpers reset ───────────────────────────────────────────
const resetError = () => { error.value = '' }
const resetCloseModal = () => {
  showSolution.value = false
  solutionText.value = ''
  costAmount.value = ''
  pendingClose.value = null
}
const resetAssignModal = () => {
  showAssignModal.value = false
  selectedTechId.value = ''
  pendingAssign.value = null
}
const resetReopenModal = () => {
  showReopenChoice.value = false
  reopenChoice.value = ''
  reopenPercentage.value = 10
  reopenMode.value = 1
  pendingReopen.value = null
  lastTicketCost.value = null 

}

// ─── Construction colonnes ───────────────────────────────────
const buildColumns = () => Object.fromEntries(STATUSES.map(code => [code, []]))
const extractTicketRef = (ticket) => {
  const content = String(ticket?.content || '')
  const match = content.match(/Ref_Ticket:\s*([^\s<]+)/i)
  if (match?.[1]) return match[1].trim()
  return String(ticket?.ref_ticket || ticket?.ticketRef || ticket?.id || '').trim()
}
const mapSettings = list => list.reduce((acc, item) => {
  const id = item.statusId ?? item.status_id
  if (id != null) acc[id] = item
  return acc
}, {})
const costValue = cost => Number(cost?.costValue || 0)
const isBaseCost = cost => cost.costType !== 'reopening' && cost.costType !== 'cancel'

// ─── Chargement ──────────────────────────────────────────────
const load = async () => {
  loading.value = true
  resetError()
  try {
    const token = await glpi.ensureToken()
    const [tickets, cfgList, users] = await Promise.all([
      getTickets(token),
      getSettings(),
      getUsers(token)
    ])
    const costs = await getAllCosts()

    settings.value = mapSettings(cfgList)
    technicians.value = users
    columns.value = buildColumns()

    const costByTicket = new Map()
    for (const cost of costs) {
      const id = String(cost.ticketId ?? '').trim()
      if (!id) continue
      if (!costByTicket.has(id)) costByTicket.set(id, [])
      costByTicket.get(id).push(cost)
    }

    tickets.forEach(ticket => {
      const status = Number(ticket.status)
      const ref = extractTicketRef(ticket)
      const ticketCosts = (costByTicket.get(String(ticket.id)) || [])
        .filter(isBaseCost)
      const lastCost = ticketCosts.length ? ticketCosts[ticketCosts.length - 1] : null
      const decoratedTicket = { ...ticket, _ticketRef: ref, _lastCost: lastCost }
      if (columns.value[status]) columns.value[status].push(decoratedTicket)
    })

    // ✅ Tri par _ticketRef
    Object.keys(columns.value).forEach(status => {
      columns.value[status].sort((a, b) => {
        const refA = Number(a._ticketRef) || 999999
        const refB = Number(b._ticketRef) || 999999
        return refA - refB
      })
    })

  } catch (err) {
    error.value = err?.response?.data?.detail || err?.message || 'Erreur API GLPI'
  } finally {
    loading.value = false
  }
}

// ─── Helpers UI ──────────────────────────────────────────────
const colColor = code => settings.value[code]?.color || '#f1f5f9'
const colLabel = code => {
  const cfg = settings.value[code] || {}
  return cfg.labelFr || cfg.label_fr || cfg.label_mg || cfg.labelMg || defaultLabels[code] || `Statut ${code}`
}

const changeStatus = async (ticket, status) => {
  const token = await glpi.ensureToken()
  await updateTicketStatus(token, ticket.id, status)
  ticket.status = status
}

// ─── Drag & Drop ─────────────────────────────────────────────
const onChange = async (evt, targetStatus) => {
  if (!evt.added) return
  const ticket = evt.added.element
  const oldStatus = Number(ticket.status)

  // 🔄 Ticket Terminé → En cours/Nouveau = choix Annulation/Réouverture
  if (oldStatus === 6 && (targetStatus === 1 || targetStatus === 2)) {
    pendingReopen.value = ticket
    reopenTargetStatus.value = targetStatus

    try {
      const costs = await getAllCosts()
      const ticketCosts = costs.filter(c =>
        String(c.ticketId) === String(ticket.id) && isBaseCost(c)
      )
      lastTicketCost.value = ticketCosts.length ? ticketCosts[ticketCosts.length - 1] : null
    } catch {
      lastTicketCost.value = null
    }

    showReopenChoice.value = true
    return
  }

  // 👨‍💻 Nouveau → En cours = attribution technicien
  if (oldStatus === 1 && targetStatus === 2) {
    pendingAssign.value = ticket
    showAssignModal.value = true
    return
  }

  // 🔒 → Terminé = saisir coût
  if (targetStatus === 6) {
    pendingClose.value = ticket
    showSolution.value = true
    return
  }

  // Changement simple
  try {
    await changeStatus(ticket, targetStatus)
  } catch (err) {
    error.value = 'Changement de statut échoué : ' + (err?.message || '')
    await load()
  }
}

// ─── 🔵 CLÔTURE ──────────────────────────────────────────────
const confirmClose = async () => {
  if (!pendingClose.value) return
  const amount = parseFloat(costAmount.value)

  try {
    const token = await glpi.ensureToken()

    if (solutionText.value.trim()) {
      await addSolution(token, pendingClose.value.id, solutionText.value.trim())
    }

    await updateTicketStatus(token, pendingClose.value.id, 6)

    // ✅ Service partagé
    await closeTicket({
      ticketId: pendingClose.value.id,
      ticketName: pendingClose.value.name || `Ticket #${pendingClose.value.id}`,
      amount
    })

    pendingClose.value.status = 6
  } catch (err) {
    error.value = 'Clôture échouée : ' + (err?.message || '')
  } finally {
    resetCloseModal()
    await load()
  }
}

const cancelClose = () => {
  resetCloseModal()
  load()
}

// ─── ❌ ANNULATION ───────────────────────────────────────────
const confirmCancel = async () => {
  if (!pendingReopen.value) return

  try {
    // ✅ Service partagé
    const result = await cancelLastCost(pendingReopen.value.id)
    console.log(`🗑️ Coût ${result.removed.costValue}€ supprimé`)

    await changeStatus(pendingReopen.value, reopenTargetStatus.value)
  } catch (err) {
    error.value = 'Annulation échouée : ' + (err?.message || '')
  } finally {
    resetReopenModal()
    await load()
  }
}

// ─── 🔄 RÉOUVERTURE (%) ──────────────────────────────────────
const confirmReopenWithPercent = async () => {
  if (!pendingReopen.value) return

  const percent = Number(reopenPercentage.value) || 0
  if (percent <= 0 || percent > 100) {
    error.value = 'Veuillez entrer un pourcentage entre 0 et 100'
    return
  }

  try {
    const token = await glpi.ensureToken()

    // ✅ Service partagé
    const result = await reopenTicket({
      ticketId: pendingReopen.value.id,
      ticketName: pendingReopen.value.name || `Ticket #${pendingReopen.value.id}`,
      percent,

      mode: reopenMode.value
    })

    // Follow-up pour traçabilité
    await addFollowup(
      token,
      pendingReopen.value.id,
      `Réouverture : ${percent}% de ${result.baseCost.toFixed(2)}€ → +${result.cost.toFixed(2)}€`
    )

    await changeStatus(pendingReopen.value, reopenTargetStatus.value)
  } catch (err) {
    error.value = 'Réouverture échouée : ' + (err?.message || '')
  } finally {
    resetReopenModal()
    await load()
  }
}

const cancelReopenChoice = () => {
  resetReopenModal()
  load()
}

// ─── 👨‍💻 ATTRIBUTION TECHNICIEN ────────────────────────────
const confirmAssign = async () => {
  if (!pendingAssign.value || !selectedTechId.value) {
    error.value = 'Veuillez sélectionner un technicien'
    return
  }

  try {
    const token = await glpi.ensureToken()
    await linkUserToTicket(token, pendingAssign.value.id, selectedTechId.value, 2)
    await changeStatus(pendingAssign.value, 2)
  } catch (err) {
    error.value = 'Attribution échouée : ' + (err?.message || '')
  } finally {
    resetAssignModal()
    await load()
  }
}

const cancelAssign = () => {
  resetAssignModal()
  load()
}

// ─── Détails ticket ──────────────────────────────────────────
const goToCreateTicket = () => router.push({ name: 'fo-create-ticket' })

const openDetail = async ticket => {
  try {
    const token = await glpi.ensureToken()
    detail.value = await getTicket(token, ticket.id)
  } catch {
    detail.value = ticket
  }
}

const fmt = value => Number(value || 0).toFixed(2)

onMounted(load)
</script>

<template>
  <FoLayout>
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
              <small>#{{ element._ticketRef || element.id }}</small>
              <small v-if="element._lastCost" class="cost-badge">
                Dernier coût: {{ fmt(element._lastCost.costValue) }} €
              </small>
            </div>
          </template>
        </draggable>

        <button v-if="code === 1" class="add-ticket-btn-col" @click="goToCreateTicket">
          + Ajouter
        </button>
      </div>
    </div>

    <!-- Modale : détails -->
    <div v-if="detail" class="overlay" @click.self="detail = null">
      <div class="modal">
        <h2>Ticket #{{ detail._ticketRef || detail.id }}</h2>
        <div class="row"><span>Titre</span><b>{{ detail.name }}</b></div>
        <div class="row"><span>Description</span><b v-html="detail.content"></b></div>
        <div class="row"><span>Statut</span><b>{{ detail.status?.name || detail.status }}</b></div>
        <div class="row"><span>Priorité</span><b>{{ detail.priority?.name || detail.priority }}</b></div>
        <div class="modal-actions">
          <button class="primary" @click="detail = null">Fermer</button>
        </div>
      </div>
    </div>

    <!-- Modale : clôture -->
    <div v-if="showSolution" class="overlay" @click.self="cancelClose">
      <div class="modal">
        <h2>🔒 Clôturer le ticket</h2>
        <p class="ticket-ref">
          <strong>Ticket :</strong> {{ pendingClose?.name || `#${pendingClose?.id}` }}
        </p>

        <div class="form-group">
          <label>Solution <span class="optional">(facultatif)</span></label>
          <textarea v-model="solutionText" rows="3" placeholder="Décrivez la solution..."></textarea>
        </div>

        <div class="form-group">
          <label>💰 Coût <span class="required">*</span></label>
          <div class="input-with-unit">
            <input v-model="costAmount" type="number" min="0.01" step="0.01" placeholder="0.00" />
            <span class="unit">€</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="ghost" @click="cancelClose">Annuler</button>
          <button class="primary" :disabled="!costAmount || parseFloat(costAmount) <= 0" @click="confirmClose">
            Valider la clôture
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

    <!-- Modale 1 : Choix Annulation vs Réouverture -->
    <div v-if="showReopenChoice && reopenChoice === ''" class="overlay" @click.self="cancelReopenChoice">
      <div class="modal">
        <h2>🔄 Choisir une action</h2>
        <p class="ticket-ref"><strong>Ticket :</strong> {{ pendingReopen?.name }}</p>
        <p v-if="lastTicketCost" class="ticket-ref">
          Dernier coût : <strong>{{ fmt(lastTicketCost.costValue) }} €</strong>
        </p>

        <div class="modal-actions">
          <button class="ghost" @click="cancelReopenChoice">Fermer</button>
          <button class="primary" @click="reopenChoice = 'cancel'" v-if="lastTicketCost">
            ❌ Annulation
          </button>
          <button class="primary" @click="reopenChoice = 'reopen'" v-if="lastTicketCost">
            🔄 Réouverture (%)
          </button>
        </div>
      </div>
    </div>

    <!-- Modale 2 : Annulation -->
    <div v-if="showReopenChoice && reopenChoice === 'cancel'" class="overlay" @click.self="cancelReopenChoice">
      <div class="modal">
        <h2>❌ Annuler le coût</h2>
        <p class="ticket-ref"><strong>Ticket :</strong> {{ pendingReopen?.name }}</p>

        <div class="form-group">
          <label>Coût à supprimer</label>
          <p style="font-size: 1.3rem; font-weight: bold; color: #dc2626;">
            {{ fmt(lastTicketCost?.costValue) }} €
          </p>
        </div>

        <p class="hint">⚠️ Cette action supprime le dernier coût et bascule en "En cours".</p>

        <div class="modal-actions">
          <button class="ghost" @click="reopenChoice = ''">← Retour</button>
          <button class="primary" @click="confirmCancel" style="background: #dc2626;">
            Confirmer
          </button>
        </div>
      </div>
    </div>

    <!-- Modale 3 : Réouverture avec % -->
    <div v-if="showReopenChoice && reopenChoice === 'reopen'" class="overlay" @click.self="cancelReopenChoice">
      <div class="modal">
        <h2>🔄 Réouverture avec %</h2>
        <p class="ticket-ref"><strong>Ticket :</strong> {{ pendingReopen?.name }}</p>

        <div class="form-group">
          <label>Dernier coût</label>
          <p style="font-size: 1.1rem; font-weight: bold;">{{ fmt(lastTicketCost?.costValue) }} €</p>
        </div>
        <div class="form-group">
          <label>Mode de calcul</label>
          <select v-model.number="reopenMode">
            <option :value ="1"> Dernier cout </option>
            <option :value="2"> Premier cout</option>
            <option :value="3"> Moyen cout </option>
            <option :value="4"> Somme de cout</option>
          </select>
        </div>
        <div class="form-group">
          <label>Pourcentage <span class="required">*</span></label>
          <div class="input-with-unit">
            <input v-model.number="reopenPercentage" type="number" min="0" max="100" placeholder="10" />
            <span class="unit">%</span>
          </div>
        </div>

        <div class="form-group">
          <label>Coût calculé</label>
          <p style="font-size: 1.2rem; font-weight: bold; color: #0f766e;">
            {{ fmt((costValue(lastTicketCost) * reopenPercentage) / 100) }} €
          </p>
        </div>

        <div class="modal-actions">
          <button class="ghost" @click="reopenChoice = ''">← Retour</button>
          <button class="primary" @click="confirmReopenWithPercent"
                  :disabled="!reopenPercentage || reopenPercentage <= 0">
            Valider
          </button>
        </div>
      </div>
    </div>
  </FoLayout>
</template>

<style scoped>
.info { color: #94a3b8; text-align: center; padding: 2rem; }
.error {
  color: #dc2626; background: #fee2e2; padding: 0.8rem;
  border-radius: 8px; display: flex; justify-content: space-between;
  align-items: center; flex-wrap: wrap; gap: 1rem;
}
.retry-btn {
  background: #dc2626; color: white; border: none;
  padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;
}
.board {
  display: flex; gap: 1rem; margin-top: 1.5rem;
  align-items: flex-start; overflow-x: auto;
}
.column {
  flex: 1; min-width: 280px; border-radius: 12px;
  padding: 0.8rem; min-height: 400px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.col-head {
  font-weight: 700; margin-bottom: 0.8rem;
  display: flex; justify-content: space-between; align-items: center;
  color: #1e293b;
}
.count {
  background: rgba(0,0,0,0.15); border-radius: 999px;
  padding: 0.1rem 0.6rem; font-size: 0.85rem;
}
.col-body {
  min-height: 350px; display: flex; flex-direction: column; gap: 0.5rem;
}
.card {
  background: white; border-radius: 8px; padding: 0.7rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15); cursor: pointer;
  display: flex; flex-direction: column; gap: 0.2rem;
  transition: all 0.2s;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
.card small { color: #94a3b8; font-size: 0.7rem; }
.cost-badge { color: #0f766e; font-weight: 700; }

.add-ticket-btn-col {
  width: 100%; margin-top: 0.8rem; background: rgba(255,255,255,0.6);
  border: 1px dashed #cbd5e1; color: #475569; padding: 0.6rem;
  border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;
}
.add-ticket-btn-col:hover { background: white; border-color: #94a3b8; }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: white; border-radius: 16px; padding: 1.5rem;
  width: 450px; max-width: 90vw; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}
.modal h2 { margin: 0 0 1rem 0; }

.ticket-ref {
  background: #f8fafc; border-left: 3px solid #3b82f6;
  padding: 0.5rem 0.75rem; border-radius: 4px;
  margin-bottom: 1rem; font-size: 0.9rem; color: #475569;
}

.form-group { margin-bottom: 1rem; }
.form-group label {
  display: block; font-weight: 600; margin-bottom: 0.4rem; color: #1e293b;
}
.modal input, .modal textarea, .modal select {
  width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1;
  border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;
}

.input-with-unit { display: flex; align-items: center; gap: 0.5rem; }
.input-with-unit input { flex: 1; text-align: right; font-size: 1.1rem; font-weight: 600; }
.unit { font-size: 1.2rem; font-weight: 700; color: #0f766e; }

.optional { color: #94a3b8; font-weight: 400; font-size: 0.8rem; }
.required { color: #dc2626; }
.hint { color: #64748b; font-size: 0.78rem; margin-top: 0.4rem; }

.row { display: flex; padding: 0.4rem 0; border-bottom: 1px solid #f1f5f9; }
.row span { width: 100px; color: #64748b; }

.modal-actions {
  display: flex; justify-content: flex-end; gap: 0.6rem; margin-top: 1.5rem;
}
.ghost {
  background: #e2e8f0; border: none; padding: 0.5rem 1rem;
  border-radius: 8px; cursor: pointer;
}
.ghost:hover { background: #cbd5e1; }
.primary {
  background: #2563eb; color: white; border: none;
  padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;
}
.primary:hover:not(:disabled) { background: #1d4ed8; }
.primary:disabled { opacity: 0.5; cursor: not-allowed; }

.tech-select { width: 100%; margin-top: 0.5rem; }

@media (max-width: 768px) {
  .board { flex-direction: column; }
  .modal { width: 95vw; }
}
</style>
