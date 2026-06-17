// src/services/costService.js

/**
 * Service pour gérer les coûts des tickets via l'API Spring Boot
 * 
 * Endpoints disponibles :
 *  GET    /api/ticket-costs                                → Tous les coûts
 *  GET    /api/ticket-costs/{id}                           → Un coût par ID
 *  GET    /api/ticket-costs/ticket/{ticketId}              → Coûts d'un ticket
 *  GET    /api/ticket-costs/item/{itemType}/{itemId}       → Coûts d'un item
 *  GET    /api/ticket-costs/type/{itemType}                → Coûts par type d'item
 *  GET    /api/ticket-costs/batch/{batchId}                → Coûts d'un batch
 *  GET    /api/ticket-costs/cost-type/{costType}           → Coûts par type de coût
 *  POST   /api/ticket-costs                                → Créer un coût
 *  PUT    /api/ticket-costs/{id}                           → Modifier un coût
 *  DELETE /api/ticket-costs/{id}                           → Supprimer un coût
 *  DELETE /api/ticket-costs/batch/{batchId}                → Supprimer un batch
 *  DELETE /api/ticket-costs/ticket/{ticketId}              → Supprimer tous les coûts d'un ticket
 */

const BASE = '/api/ticket-costs'

// ─────────────────────────────────────────────────────────────
// 🔍 GET : Récupération
// ─────────────────────────────────────────────────────────────

/**
 * Récupère TOUS les coûts
 * @returns {Promise<Array>}
 */
export const getAllCosts = async () => {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`Erreur récupération coûts (${res.status})`)
  return res.json()
}

/**
 * Récupère UN coût par son ID
 * @param {number} id
 * @returns {Promise<Object>}
 */
export const getCostById = async (id) => {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) throw new Error(`Coût ${id} introuvable`)
  return res.json()
}

/**
 * Récupère tous les coûts d'un ticket
 * @param {number} ticketId
 * @returns {Promise<Array>}
 */
export const getCostsByTicket = async (ticketId) => {
  const res = await fetch(`${BASE}/ticket/${ticketId}`)
  if (!res.ok) throw new Error(`Erreur récupération coûts ticket ${ticketId}`)
  return res.json()
}

/**
 * Récupère les coûts d'un item spécifique (ex: Computer #5)
 * @param {string} itemType - 'Computer', 'Monitor', 'Phone'
 * @param {number} itemId
 * @returns {Promise<Array>}
 */
export const getCostsByItem = async (itemType, itemId) => {
  const res = await fetch(`${BASE}/item/${itemType}/${itemId}`)
  if (!res.ok) throw new Error(`Erreur récupération coûts ${itemType} #${itemId}`)
  return res.json()
}

/**
 * Récupère tous les coûts d'un type d'item (ex: tous les Computer)
 * @param {string} itemType - 'Computer', 'Monitor', 'Phone'
 * @returns {Promise<Array>}
 */
export const getCostsByItemType = async (itemType) => {
  const res = await fetch(`${BASE}/type/${itemType}`)
  if (!res.ok) throw new Error(`Erreur récupération coûts type ${itemType}`)
  return res.json()
}

/**
 * Récupère tous les coûts d'un batch d'import
 * @param {string} batchId - ex: 'import-1734567890123'
 * @returns {Promise<Array>}
 */
export const getCostsByBatch = async (batchId) => {
  const res = await fetch(`${BASE}/batch/${batchId}`)
  if (!res.ok) throw new Error(`Erreur récupération batch ${batchId}`)
  return res.json()
}

/**
 * Récupère les coûts par type de coût
 * @param {string} costType - 'opening', 'closing', 'reopening', 'cancel', 'glpi'
 * @returns {Promise<Array>}
 */
export const getCostsByCostType = async (costType) => {
  const res = await fetch(`${BASE}/cost-type/${costType}`)
  if (!res.ok) throw new Error(`Erreur récupération coûts type ${costType}`)
  return res.json()
}

// ─────────────────────────────────────────────────────────────
// 💾 POST : Création
// ─────────────────────────────────────────────────────────────

/**
 * Sauvegarde un nouveau coût
 * 
 * @param {Object} payload
 * @param {number} payload.ticketId        - ID du ticket GLPI (obligatoire)
 * @param {string} payload.ticketName      - Nom du ticket
 * @param {number} payload.itemId          - ID de l'item (Computer, Monitor, Phone)
 * @param {string} payload.itemType        - Type d'item ('Computer', 'Monitor', 'Phone')
 * @param {string} payload.itemName        - Nom de l'item (ex: 'PC-ADM-001')
 * @param {string} payload.costType        - Type de coût ('opening', 'closing', 'reopening', 'cancel', 'glpi')
 * @param {number} payload.costValue       - Montant du coût (obligatoire)
 * @param {string} [payload.batchId]       - ID du batch (pour les imports)
 * @param {string} [payload.source]        - Source ('manual', 'csv', 'api'), défaut 'manual'
 * @returns {Promise<Object>}
 */
// costService.js
export async function saveCost(costData) {
  const payload = {
    ticketId: costData.ticketId,
    ticketName: costData.ticketName || '',
    costType: costData.costType,
    costValue: Number(costData.costValue || 0),
    
    // ✅ AJOUTER ces champs s'ils manquent
    itemId: costData.itemId || 0,
    itemType: costData.itemType || 'Unknown',
    itemName: costData.itemName || '',
    
    source: costData.source || 'manual',
    batchId: costData.batchId || null
  }
  
  const response = await fetch('http://localhost:8080/api/ticket-costs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) throw new Error(`Erreur API: ${response.status}`)
  return await response.json()
}

// ─────────────────────────────────────────────────────────────
// ✏️ PUT : Modification
// ─────────────────────────────────────────────────────────────

/**
 * Met à jour un coût existant
 * Seuls les champs fournis sont mis à jour (les autres restent inchangés)
 * 
 * @param {number} id          - ID du coût à modifier
 * @param {Object} payload     - Champs à mettre à jour
 * @returns {Promise<Object>}
 */
export const updateCost = async (id, payload) => {
  if (!id) throw new Error('ID du coût est obligatoire')

  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Erreur mise à jour coût ${id} (${res.status}) : ${errText}`)
  }
  return res.json()
}

// ─────────────────────────────────────────────────────────────
// 🗑️ DELETE : Suppression
// ─────────────────────────────────────────────────────────────

/**
 * Supprime un coût par son ID
 * @param {number} id
 * @returns {Promise<void>}
 */
export const deleteCost = async (id) => {
  if (!id) throw new Error('ID du coût est obligatoire')

  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Erreur suppression coût ${id} (${res.status}) : ${errText}`)
  }
}

/**
 * Supprime tous les coûts d'un batch (rollback d'un import)
 * @param {string} batchId
 * @returns {Promise<string>} Message de confirmation
 */
export const deleteBatch = async (batchId) => {
  if (!batchId) throw new Error('batchId est obligatoire')

  const res = await fetch(`${BASE}/batch/${batchId}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`Erreur suppression batch ${batchId}`)
  }
  return res.text()
}

/**
 * Supprime tous les coûts d'un ticket
 * @param {number} ticketId
 * @returns {Promise<string>}
 */
export const deleteByTicket = async (ticketId) => {
  if (!ticketId) throw new Error('ticketId est obligatoire')

  const res = await fetch(`${BASE}/ticket/${ticketId}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`Erreur suppression coûts ticket ${ticketId}`)
  }
  return res.text()
}

// ─────────────────────────────────────────────────────────────
// 🛠️ HELPERS : Fonctions utilitaires
// ─────────────────────────────────────────────────────────────

/**
 * Récupère le DERNIER coût NON-réouverture d'un ticket
 * Utile pour calculer les réouvertures en %
 * 
 * @param {number} ticketId
 * @returns {Promise<number>}
 */
export const getLastBaseCost = async (ticketId) => {
  const costs = await getCostsByTicket(ticketId)
  const baseCosts = costs
    .filter(c => c.costType !== 'reopening' && c.costType !== 'cancel')
    .sort((a, b) => (a.id || 0) - (b.id || 0))
  
  return baseCosts.length 
    ? Number(baseCosts[baseCosts.length - 1].costValue) 
    : 0
}

/**
 * Récupère le DERNIER coût (tout type) d'un ticket
 * @param {number} ticketId
 * @returns {Promise<Object|null>}
 */
export const getLastCost = async (ticketId) => {
  const costs = await getCostsByTicket(ticketId)
  const sorted = costs.sort((a, b) => (a.id || 0) - (b.id || 0))
  return sorted.length ? sorted[sorted.length - 1] : null
}

/**
 * Calcule le total des coûts d'un ticket
 * @param {number} ticketId
 * @returns {Promise<number>}
 */
export const getTotalCostForTicket = async (ticketId) => {
  const costs = await getCostsByTicket(ticketId)
  return costs.reduce((sum, c) => sum + Number(c.costValue || 0), 0)
}

/**
 * Calcule le total des coûts d'un item spécifique
 * @param {string} itemType
 * @param {number} itemId
 * @returns {Promise<number>}
 */
export const getTotalCostForItem = async (itemType, itemId) => {
  const costs = await getCostsByItem(itemType, itemId)
  return costs.reduce((sum, c) => sum + Number(c.costValue || 0), 0)
}

/**
 * Génère un batchId unique pour un import
 * @returns {string} ex: 'import-1734567890123'
 */
export const generateBatchId = () => {
  return `import-${Date.now()}`
}