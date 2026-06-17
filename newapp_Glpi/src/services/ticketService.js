// src/services/ticketService.js
import {saveCost, deleteCost, getCostsByTicket
} from '@/services/costService'
import { getTicketItems } from '@/services/glpiApi'
import { useGlpiStore } from '@/stores/glpi'

const toAmount = (value) => Number(value || 0)

// ─── Helper : Normaliser le type d'item GLPI ─────────────
const normalizeItemType = (raw) => {
  const value = String(raw || '').trim().toLowerCase()
  if (value.includes('computer')) return 'Computer'
  if (value.includes('monitor') || value.includes('moniteur')) return 'Monitor'
  if (value.includes('phone')) return 'Phone'
  return 'Unknown'
}

// ─── Helper : Récupérer les items d'un ticket ────────────
async function fetchTicketItems(ticketId) {
  try {
    const glpi = useGlpiStore()
    const token = await glpi.ensureToken()
    const items = await getTicketItems(token, ticketId)
    
    if (!Array.isArray(items) || !items.length) return []
    
    return items
      .filter(item => item && item.itemtype)
      .map(item => ({
        itemId: item.items_id || item.id || 0,
        itemType: normalizeItemType(item.itemtype),
        itemName: item.name || ''
      }))
      .filter(item => item.itemType !== 'Unknown')
  } catch (err) {
    console.warn(`⚠️ Items ticket ${ticketId}:`, err.message)
    return []
  }
}

// ─── Helper : Générer un batchId unique ──────────────────
function generateBatchId(ticketId, costType) {
  return `${ticketId}-${costType}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
}

// ─── Helper : Sauvegarder un coût éclaté sur les items ───
async function saveCostsForItems({ ticketId, ticketName, costType, costValue, source, batchId }) {
  const items = await fetchTicketItems(ticketId)
  const groupBatchId = batchId || generateBatchId(ticketId, costType)
  
  if (items.length > 0) {
    const share = costValue / items.length
    const created = []
    
    for (const item of items) {
      const cost = await saveCost({
        ticketId,
        ticketName,
        costType,
        costValue: share,
        itemId: item.itemId,
        itemType: item.itemType,
        itemName: item.itemName,
        source,
        batchId: groupBatchId
      })
      created.push(cost)
    }
    
    console.log(`✅ ${ticketName} : ${costValue}€ sur ${items.length} item(s) [batch: ${groupBatchId}]`)
    return created
  }
  
  // Pas d'item → Unknown
  const cost = await saveCost({
    ticketId,
    ticketName,
    costType,
    costValue,
    itemId: 0,
    itemType: 'Unknown',
    itemName: '',
    source,
    batchId: groupBatchId
  })
  return [cost]
}

// ─── 🔄 RÉOUVERTURE ─────────────────────────────────────
export async function reopenTicket({ ticketId, ticketName, percent, batchId }) {
  const costs = await getCostsByTicket(ticketId)

  // ✅ Garder uniquement les closings triés par ID
  const closings = costs
    .filter(c => c.costType === 'closing')
    .sort((a, b) => (a.id || 0) - (b.id || 0))

  if (!closings.length) {
    throw new Error(`Aucun closing trouvé pour le ticket ${ticketId}`)
  }

  //Calcul selon Mode
  let lastBase = 0
  const values = closings.map (c => toAmount(c.costValue))

  switch (Number(mode)) {
    case 1: // Mode 1 = Dernier coût (par batchId)
      const lastBatchId = closings[closings.length - 1].batchId
      lastBase = lastBatchId
        ? closings.filter(c => c.batchId === lastBatchId).reduce((s, c) => s + toAmount(c.costValue), 0)
        : toAmount(closings[closings.length - 1].costValue)
      break

    case 2: // Mode 2 = Premier coût (par batchId)
      const firstBatchId = closings[0].batchId
      lastBase = firstBatchId
        ? closings.filter(c => c.batchId === firstBatchId).reduce((s, c) => s + toAmount(c.costValue), 0)
        : toAmount(closings[0].costValue)
      break

    case 3: // Mode 3 = Moyenne
      lastBase = values.reduce((s, v) => s + v, 0) / values.length
      break

    case 4: // Mode 4 = Somme
      lastBase = values.reduce((s, v) => s + v, 0)
      break
  }
  // ✅ Prendre le DERNIER closing
  const lastClosing = closings[closings.length - 1]
  const lastBatchId = lastClosing.batchId

  // ✅ Regrouper par batchId si disponible
  let sameGroup
  if (lastBatchId) {
    sameGroup = closings.filter(c => c.batchId === lastBatchId)
  } else {
    sameGroup = [lastClosing]
  }

  console.log(
    `🔍 Ticket ${ticketId} : dernier closing = ${lastBase}€ ` +
    `(${sameGroup.length} ligne(s), batchId: ${lastBatchId || 'N/A'})`
  )

  const cost = (lastBase * Number(percent || 0)) / 100

  const created = await saveCostsForItems({
    ticketId,
    ticketName,
    costType: 'reopening',
    costValue: cost,
    source: batchId ? 'csv' : 'manual',
    batchId
  })

  return { cost, baseCost: lastBase, created }
}

// ─── 🔒 CLÔTURE ─────────────────────────────────────────
export async function closeTicket({ ticketId, ticketName, amount, batchId }) {
  const cost = Number(amount || 0)
  if (cost <= 0) throw new Error('Montant invalide')

  const created = await saveCostsForItems({
    ticketId,
    ticketName,
    costType: 'closing',
    costValue: cost,
    source: batchId ? 'csv' : 'manual',
    batchId
  })

  return { cost, created }
}

// ─── ❌ ANNULATION ──────────────────────────────────────
export async function cancelLastCost(ticketId) {
  const costs = await getCostsByTicket(ticketId)
  if (!costs.length) throw new Error('Aucun coût à annuler')

  const sorted = costs.sort((a, b) => (b.id || 0) - (a.id || 0))
  const lastCost = sorted[0]
  const lastBatchId = lastCost.batchId

  // ✅ Supprimer tous les coûts du même batchId
  const toDelete = lastBatchId
    ? costs.filter(c => c.batchId === lastBatchId)
    : [lastCost]

  for (const cost of toDelete) {
    await deleteCost(cost.id)
  }

  const totalAmount = toDelete.reduce((s, c) => s + Number(c.costValue), 0)
  console.log(`🗑️ ${toDelete.length} coût(s) supprimé(s) (total: ${totalAmount}€)`)

  return { removed: lastCost, deletedCount: toDelete.length, totalAmount }
}