<script setup>
import { ref, computed, onMounted } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getComputers, getMonitors, getPhones, getTickets } from '@/services/glpiApi'
import { getAllCosts, updateCost } from '@/services/costService'

const glpi = useGlpiStore()

const loading = ref(true)
const costs = ref([])  // Coûts depuis SQLite (Spring Boot)
const computers = ref([])
const monitors = ref([])
const phones = ref([])
const tickets = ref([])

// Structure pour stocker les coûts par élément
const elementCosts = ref([])

// Configuration des types d'éléments
const ELEMENT_TYPES = {
  Computer: { label: 'Ordinateur', icon: '💻' },
  Monitor: { label: 'Moniteur', icon: '🖥' },
  Phone: { label: 'Téléphone', icon: '📱' }
}

async function loadData() {
  loading.value = true
  try {
    const t = await glpi.ensureToken()
    
    // Charger les éléments depuis GLPI et les coûts depuis SQLite
    const [computersData, monitorsData, phonesData, ticketsData, allCosts] = await Promise.all([
      getComputers(t),
      getMonitors(t),
      getPhones(t),
      getTickets(t),
      getAllCosts()  // ← Utilise costService pour récupérer les coûts SQLite
    ])
    
    computers.value = computersData
    monitors.value = monitorsData
    phones.value = phonesData
    tickets.value = ticketsData
    costs.value = allCosts  // Coûts depuis SQLite
    
    console.log('Coûts chargés depuis SQLite:', costs.value)
    console.log('Nombre de tickets:', tickets.value.length)
    console.log('Nombre de computers:', computers.value.length)
    console.log('Nombre de monitors:', monitors.value.length)
    
    // Calculer les coûts par élément
    calculateElementCosts()
    
  } catch (error) {
    console.error('Erreur chargement données:', error)
  } finally {
    loading.value = false
  }
}

// Calculer la répartition des coûts par élément
function calculateElementCosts() {
  const elementsMap = new Map()
  
  // 1. Ajouter tous les éléments existants (même sans coût)
  for (const computer of computers.value) {
    const key = `Computer-${computer.id}`
    elementsMap.set(key, {
      elementId: computer.id,
      elementName: computer.name,
      elementType: 'Computer',
      glpiCost: 0,
      superCost: 0,
      totalCost: 0,
      tickets: []
    })
  }
  
  for (const monitor of monitors.value) {
    const key = `Monitor-${monitor.id}`
    elementsMap.set(key, {
      elementId: monitor.id,
      elementName: monitor.name,
      elementType: 'Monitor',
      glpiCost: 0,
      superCost: 0,
      totalCost: 0,
      tickets: []
    })
  }
  
  for (const phone of phones.value) {
    const key = `Phone-${phone.id}`
    elementsMap.set(key, {
      elementId: phone.id,
      elementName: phone.name,
      elementType: 'Phone',
      glpiCost: 0,
      superCost: 0,
      totalCost: 0,
      tickets: []
    })
  }
  
  // 2. Pour chaque coût sauvegardé (depuis SQLite), répartir sur les éléments
  for (const cost of costs.value) {
    const totalTicketCost = cost.cost || 0
    if (totalTicketCost <= 0) continue
    
    const ticketId = cost.ticketId
    const ticket = tickets.value.find(t => t.id == ticketId)
    const ticketName = ticket?.name || cost.ticketName || `Ticket #${ticketId}`
    
    // Chercher les éléments associés au ticket
    const linkedElements = getLinkedElementsForTicket(ticket)
    
    if (linkedElements.length === 0) {
      // Si aucun élément associé, créer une entrée "Ticket seul"
      const key = `Ticket-${ticketId}`
      if (!elementsMap.has(key)) {
        elementsMap.set(key, {
          elementId: ticketId,
          elementName: ticketName,
          elementType: 'Ticket',
          glpiCost: 0,
          superCost: 0,
          totalCost: 0,
          tickets: []
        })
      }
      const current = elementsMap.get(key)
      current.superCost += totalTicketCost
      current.totalCost = current.glpiCost + current.superCost
      current.tickets.push({
        ticketId: ticketId,
        ticketName: ticketName,
        cost: totalTicketCost
      })
    } else {
      // Répartir le coût entre les éléments associés
      const costPerElement = totalTicketCost / linkedElements.length
      
      for (const element of linkedElements) {
        const key = `${element.itemtype}-${element.id}`
        if (elementsMap.has(key)) {
          const current = elementsMap.get(key)
          current.superCost += costPerElement
          current.totalCost = current.glpiCost + current.superCost
          current.tickets.push({
            ticketId: ticketId,
            ticketName: ticketName,
            cost: costPerElement
          })
        }
      }
    }
  }
  
  // Convertir la Map en tableau et trier
  elementCosts.value = Array.from(elementsMap.values())
    .sort((a, b) => a.elementName.localeCompare(b.elementName))
  
  console.log('Éléments avec coûts calculés:', elementCosts.value.filter(e => e.superCost > 0))
}

// Récupérer les éléments associés à un ticket
function getLinkedElementsForTicket(ticket) {
  const elements = []
  
  if (!ticket) return elements
  
  // Méthode 1: Vérifier le champ _item
  if (ticket._item && Array.isArray(ticket._item)) {
    for (const item of ticket._item) {
      const itemtype = item.itemtype
      if (itemtype === 'Computer' || itemtype === 'Monitor' || itemtype === 'Phone') {
        elements.push({
          id: item.items_id,
          name: item.name,
          itemtype: itemtype
        })
      }
    }
  }
  
  // Méthode 2: Vérifier le champ items
  if (elements.length === 0 && ticket.items && Array.isArray(ticket.items)) {
    for (const item of ticket.items) {
      const itemtype = item.itemtype
      if (itemtype === 'Computer' || itemtype === 'Monitor' || itemtype === 'Phone') {
        elements.push({
          id: item.items_id,
          name: item.name,
          itemtype: itemtype
        })
      }
    }
  }
  
  // Méthode 3: Chercher par nom dans le contenu
  if (elements.length === 0 && ticket.content) {
    const allElements = [
      ...computers.value.map(c => ({ id: c.id, name: c.name, type: 'Computer' })),
      ...monitors.value.map(m => ({ id: m.id, name: m.name, type: 'Monitor' })),
      ...phones.value.map(p => ({ id: p.id, name: p.name, type: 'Phone' }))
    ]
    
    for (const element of allElements) {
      if (ticket.content.includes(element.name)) {
        elements.push({
          id: element.id,
          name: element.name,
          itemtype: element.type
        })
      }
    }
  }
  
  return elements
}

// Mettre à jour le coût GLPI d'un élément
async function updateGlpiCost(element, newCost) {
  if (!element) return
  
  const newCostValue = parseFloat(newCost)
  if (isNaN(newCostValue)) {
    alert('Veuillez saisir un nombre valide')
    return
  }
  
  try {
    element.glpiCost = newCostValue
    element.totalCost = element.glpiCost + element.superCost
    
    // TODO: Sauvegarder dans GLPI si nécessaire
    alert(`Coût GLPI mis à jour pour ${element.elementName}: ${newCostValue}€`)
    
  } catch (error) {
    console.error('Erreur mise à jour:', error)
    alert('Erreur lors de la mise à jour')
  }
}

// Statistiques globales
const globalStats = computed(() => {
  let totalGlpiCost = 0
  let totalSuperCost = 0
  let totalCost = 0
  let elementsWithCost = 0
  
  for (const element of elementCosts.value) {
    totalGlpiCost += element.glpiCost
    totalSuperCost += element.superCost
    totalCost += element.totalCost
    if (element.superCost > 0 || element.glpiCost > 0) {
      elementsWithCost++
    }
  }
  
  return { 
    totalGlpiCost, 
    totalSuperCost, 
    totalCost, 
    elementsWithCost, 
    totalElements: elementCosts.value.length 
  }
})

// Regrouper par type d'élément
const elementsByType = computed(() => {
  const grouped = {
    Computer: [],
    Monitor: [],
    Phone: [],
    Ticket: []
  }
  
  for (const element of elementCosts.value) {
    const type = element.elementType
    if (grouped[type]) {
      grouped[type].push(element)
    }
  }
  
  return grouped
})

onMounted(loadData)
</script>

<template>
  <BoLayout>
    <div class="cost-management">
      <div class="header">
        <h1>💰 Gestion des coûts par actif</h1>
        
        <!-- Statistiques -->
        <div class="stats-cards">
          <div class="stat-card">
            <span class="label">Actifs total</span>
            <span class="value">{{ globalStats.totalElements }}</span>
          </div>
          <div class="stat-card">
            <span class="label">Actifs avec coûts</span>
            <span class="value">{{ globalStats.elementsWithCosts }}</span>
          </div>
          <div class="stat-card">
            <span class="label">Coût total SuperCost</span>
            <span class="value">{{ globalStats.totalSuperCost.toFixed(2) }} €</span>
          </div>
          <div class="stat-card primary">
            <span class="label">Coût TOTAL GLOBAL</span>
            <span class="value">{{ globalStats.totalCost.toFixed(2) }} €</span>
          </div>
        </div>
      </div>
      
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Chargement des actifs et des coûts...</p>
      </div>
      
      <div v-else-if="costs.length === 0" class="empty-state">
        <div class="empty-icon">💰</div>
        <h3>Aucun coût enregistré</h3>
        <p>Commencez par clôturer des tickets dans le Kanban pour enregistrer des coûts.</p>
        <router-link to="/kanban" class="btn-link">→ Aller au Kanban</router-link>
      </div>
      
      <div v-else-if="elementCosts.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>Aucun actif trouvé</h3>
        <p>Assurez-vous d'avoir importé des données depuis l'interface d'import.</p>
        <router-link to="/admin/import" class="btn-link">→ Importer des données</router-link>
      </div>
      
      <div v-else class="content">
        <!-- Tableau principal -->
        <div class="table-container">
          <table class="costs-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Nom de l'actif</th>
                <th class="amount">Coût GLPI</th>
                <th class="amount">Coût SuperCost</th>
                <th class="amount">Total</th>
                <th class="amount">Tickets</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="element in elementCosts" :key="`${element.elementType}-${element.elementId}`">
                <td class="type-cell">
                  <span :class="['type-badge', getTypeClass(element.elementType)]">
                    {{ getTypeIcon(element.elementType) }} {{ getTypeLabel(element.elementType) }}
                  </span>
                </td>
                <td class="name-cell">{{ element.elementName }}</td>
                <td class="amount">
                  <span class="cost-value">{{ element.glpiCost.toFixed(2) }} €</span>
                </td>
                <td class="amount super-cost">
                  <span class="cost-value">{{ element.superCost.toFixed(2) }} €</span>
                  <span v-if="element.tickets.length" class="ticket-count-badge">
                    ({{ element.tickets.length }})
                  </span>
                </td>
                <td class="amount total-cost">
                  <strong>{{ element.totalCost.toFixed(2) }} €</strong>
                </td>
                <td class="amount">
                  <span v-if="element.tickets.length" class="ticket-list" :title="element.tickets.map(t => t.ticketName).join('\n')">
                    📋 {{ element.tickets.length }}
                  </span>
                  <span v-else class="no-tickets">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Résumé par type -->
        <div class="summary-by-type">
          <h2>Résumé par type d'actif</h2>
          <div class="type-summary-cards">
            <div v-for="(elements, type) in elementsByType" :key="type" class="type-card" v-if="elements.length">
              <div class="type-header">
                <span class="type-icon">{{ getTypeIcon(type) }}</span>
                <span class="type-name">{{ getTypeLabel(type) }}</span>
                <span class="type-count">{{ elements.length }} actif(s)</span>
              </div>
              <div class="type-stats">
                <div class="stat-line">
                  <span>Coût GLPI:</span>
                  <strong>{{ elements.reduce((sum, e) => sum + e.glpiCost, 0).toFixed(2) }} €</strong>
                </div>
                <div class="stat-line">
                  <span>Coût SuperCost:</span>
                  <strong>{{ elements.reduce((sum, e) => sum + e.superCost, 0).toFixed(2) }} €</strong>
                </div>
                <div class="stat-line total">
                  <span>Total:</span>
                  <strong>{{ elements.reduce((sum, e) => sum + e.totalCost, 0).toFixed(2) }} €</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Liste des tickets avec coûts -->
        <div class="tickets-section" v-if="costs.length">
          <h2>📋 Tickets clôturés avec coûts</h2>
          <div class="tickets-list">
            <div v-for="cost in costs" :key="cost.id" class="ticket-item">
              <div class="ticket-info">
                <span class="ticket-id">#{{ cost.ticketId }}</span>
                <span class="ticket-name">{{ cost.ticketName }}</span>
              </div>
              <div class="ticket-cost">{{ cost.cost?.toFixed(2) }} €</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BoLayout>
</template>

<script>
// Fonctions helpers
function getTypeIcon(type) {
  const icons = {
    'Computer': '💻',
    'Monitor': '🖥',
    'Phone': '📱',
    'Ticket': '🎫'
  }
  return icons[type] || '📦'
}

function getTypeLabel(type) {
  const labels = {
    'Computer': 'Ordinateur',
    'Monitor': 'Moniteur',
    'Phone': 'Téléphone',
    'Ticket': 'Ticket'
  }
  return labels[type] || type
}

function getTypeClass(type) {
  const classes = {
    'Computer': 'type-computer',
    'Monitor': 'type-monitor',
    'Phone': 'type-phone',
    'Ticket': 'type-ticket'
  }
  return classes[type] || 'type-default'
}
</script>

<style scoped>
.cost-management {
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0 0 1.5rem 0;
  color: #1e293b;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card .label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
  opacity: 0.8;
}

.stat-card .value {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
}

.loading-container {
  text-align: center;
  padding: 3rem;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: #f8fafc;
  border-radius: 12px;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

.empty-state p {
  margin: 0.5rem 0;
  color: #64748b;
}

.btn-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-link:hover {
  background: #2563eb;
}

.table-container {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.costs-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.costs-table thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.costs-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
}

.costs-table th.amount {
  text-align: right;
}

.costs-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.costs-table tr:hover {
  background: #f8fafc;
}

.type-cell {
  width: 110px;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.type-computer { background: #dbeafe; color: #1e40af; }
.type-monitor { background: #fef3c7; color: #92400e; }
.type-phone { background: #dcfce7; color: #166534; }
.type-ticket { background: #fce7f3; color: #9d174d; }
.type-default { background: #f1f5f9; color: #475569; }

.name-cell {
  font-weight: 500;
  color: #1e293b;
}

.amount {
  text-align: right;
}

.cost-value {
  font-family: monospace;
  font-size: 0.9rem;
}

.super-cost .cost-value {
  color: #2563eb;
}

.total-cost {
  color: #dc2626;
  font-weight: bold;
}

.ticket-count-badge {
  font-size: 0.7rem;
  color: #94a3b8;
  margin-left: 0.25rem;
}

.ticket-list {
  cursor: help;
  font-size: 0.8rem;
  color: #64748b;
}

.no-tickets {
  color: #94a3b8;
  font-size: 0.8rem;
}

.summary-by-type {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.summary-by-type h2 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1.1rem;
}

.type-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.type-card {
  background: white;
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
}

.type-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.type-header .type-icon {
  font-size: 1.3rem;
}

.type-header .type-name {
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.type-header .type-count {
  font-size: 0.7rem;
  color: #64748b;
}

.type-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.stat-line.total {
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.9rem;
  font-weight: bold;
}

.tickets-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
}

.tickets-section h2 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1.1rem;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ticket-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.ticket-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.ticket-id {
  font-family: monospace;
  font-size: 0.8rem;
  color: #64748b;
}

.ticket-name {
  font-weight: 500;
  color: #1e293b;
}

.ticket-cost {
  font-weight: bold;
  color: #dc2626;
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .costs-table {
    font-size: 0.8rem;
  }
  
  .costs-table th,
  .costs-table td {
    padding: 0.5rem;
  }
}
</style>