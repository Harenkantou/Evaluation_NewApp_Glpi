import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' }
})

/**
 * Service pour les tickets côté FrontOffice
 * Récupère les tickets depuis le backend SQLite
 */

/**
 * Récupère la liste de tous les tickets
 */
export async function getTickets() {
  try {
    const { data } = await api.get('/tickets')
    return data
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets:', error)
    throw error
  }
}

/**
 * Récupère les détails d'un ticket spécifique
 * @param {number|string} ticketId - L'ID du ticket
 */
export async function getTicket(ticketId) {
  try {
    const { data } = await api.get(`/tickets/${ticketId}`)
    return data
  } catch (error) {
    console.error(`Erreur lors de la récupération du ticket ${ticketId}:`, error)
    throw error
  }
}

/**
 * Récupère les coûts associés à un ticket
 * @param {number|string} ticketId - L'ID du ticket
 */
export async function getTicketCosts(ticketId) {
  try {
    const { data } = await api.get(`/tickets/${ticketId}/costs`)
    return data
  } catch (error) {
    console.error(`Erreur lors de la récupération des coûts du ticket ${ticketId}:`, error)
    throw error
  }
}

/**
 * Récupère les éléments associés à un ticket
 * @param {number|string} ticketId - L'ID du ticket
 */
export async function getTicketElements(ticketId) {
  try {
    const { data } = await api.get(`/tickets/${ticketId}/elements`)
    return data
  } catch (error) {
    console.error(`Erreur lors de la récupération des éléments du ticket ${ticketId}:`, error)
    throw error
  }
}

/**
 * Crée un nouveau ticket
 * @param {object} ticketData - Les données du ticket
 */
export async function createTicket(ticketData) {
  try {
    const { data } = await api.post('/tickets', ticketData)
    return data
  } catch (error) {
    console.error('Erreur lors de la création du ticket:', error)
    throw error
  }
}

/**
 * Met à jour un ticket existant
 * @param {number|string} ticketId - L'ID du ticket
 * @param {object} ticketData - Les données mises à jour
 */
export async function updateTicket(ticketId, ticketData) {
  try {
    const { data } = await api.put(`/tickets/${ticketId}`, ticketData)
    return data
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du ticket ${ticketId}:`, error)
    throw error
  }
}

/**
 * Supprime un ticket
 * @param {number|string} ticketId - L'ID du ticket
 */
export async function deleteTicket(ticketId) {
  try {
    await api.delete(`/tickets/${ticketId}`)
  } catch (error) {
    console.error(`Erreur lors de la suppression du ticket ${ticketId}:`, error)
    throw error
  }
}

/**
 * Ajoute un élément à un ticket
 * @param {number|string} ticketId - L'ID du ticket
 * @param {number|string} elementId - L'ID de l'élément
 */
export async function linkElementToTicket(ticketId, elementId) {
  try {
    const { data } = await api.post(`/tickets/${ticketId}/elements/${elementId}`)
    return data
  } catch (error) {
    console.error(`Erreur lors de la liaison de l'élément au ticket:`, error)
    throw error
  }
}

/**
 * Retire un élément d'un ticket
 * @param {number|string} ticketId - L'ID du ticket
 * @param {number|string} elementId - L'ID de l'élément
 */
export async function unlinkElementFromTicket(ticketId, elementId) {
  try {
    await api.delete(`/tickets/${ticketId}/elements/${elementId}`)
  } catch (error) {
    console.error(`Erreur lors de la déliasion de l'élément du ticket:`, error)
    throw error
  }
}

export default {
  getTickets,
  getTicket,
  getTicketCosts,
  getTicketElements,
  createTicket,
  updateTicket,
  deleteTicket,
  linkElementToTicket,
  unlinkElementFromTicket
}
