import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/ticket-costs',
  headers: { 'Content-Type': 'application/json' }
})

// Dans costService.js
export async function getTicketCosts(ticketId) {
  try {
    if (ticketId) {
      const { data } = await api.get(`/${ticketId}`)
      return data
    } else {
      // Récupérer tous les coûts
      const { data } = await api.get('/')
      return data
    }
  } catch (error) {
    console.error('Erreur:', error)
    return []
  }
}

export async function getAllCosts() {
  try {
    const { data } = await api.get('/')
    return data
  } catch (error) {
    console.error('Erreur chargement tous les coûts:', error)
    return []
  }
}

export async function saveCost(costData) {
  try {
    const { data } = await api.post('/', {
      ticketId: costData.ticketId,
      ticketName: costData.ticketName,
      cost: costData.cost,
      createdAt: new Date().toISOString()
    })
    return data
  } catch (error) {
    console.error('Erreur sauvegarde coût:', error)
    throw error
  }
}

export async function updateCost(costId, costData) {
  try {
    const { data } = await api.put(`/${costId}`, costData)
    return data
  } catch (error) {
    console.error('Erreur mise à jour coût:', error)
    throw error
  }
}