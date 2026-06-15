import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/ticket-costs',
  headers: { 'Content-Type': 'application/json' }
})

export async function getTicketCosts(ticketId) {
  try {
    const { data } = ticketId ? await api.get(`/${ticketId}`) : await api.get('')
    return data
  } catch (error) {
    console.error('Erreur chargement couts:', error)
    return []
  }
}

export async function getAllCosts() {
  return getTicketCosts()
}

export async function saveCost(costData) {
  try {
    const { data } = await api.post('', {
      ticketId: costData.ticketId,
      ticketName: costData.ticketName,
      cost: Number(costData.cost) || 0,
      isReopening: costData.isReopening || false
    })
    return data
  } catch (error) {
    console.error('Erreur sauvegarde cout:', error)
    throw error
  }
}

export async function updateCost(costId, costData) {
  try {
    const { data } = await api.put(`/${costId}`, {
      ...costData,
      cost: Number(costData.cost) || 0
    })
    return data
  } catch (error) {
    console.error('Erreur mise a jour cout:', error)
    throw error
  }
}

// Récupérer le dernier coût d'un ticket
export const getLastCostByTicket = async (ticketId) => {
  const costs = await getAllCosts()
  return costs.filter(c => c.ticketId === ticketId).pop() // Le dernier
}

// Supprimer un coût
export const deleteCost = async (costId) => {
  return api.delete(`/ticket-costs/${costId}`)
}