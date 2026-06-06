import axios from 'axios'

// baseURL = /glpi-api  (proxyfié par Vite vers http://glpi.local/api.php)
const api = axios.create({
  baseURL: import.meta.env.VITE_GLPI_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * API v2 (High-Level) : authentification OAuth2 (grant "password").
 * Renvoie un access_token de type Bearer (et NON un session_token).
 * Pas de initSession, pas de user_token : ces notions n'existent
 * que dans l'API Legacy (v1).
 */
export async function initSession() {
  const response = await api.post('/token', {
    grant_type: 'password',
    client_id: import.meta.env.VITE_GLPI_CLIENT_ID,
    client_secret: import.meta.env.VITE_GLPI_CLIENT_SECRET,
    scope: 'api',
    username: import.meta.env.VITE_GLPI_LOGIN,
    password: import.meta.env.VITE_GLPI_PASSWORD
  })

  // response.data = { token_type, expires_in, access_token, refresh_token }
  return response.data.access_token
}

export async function getTickets(accessToken) {
  // En v2, les tickets sont dans le namespace "Assistance"
  const response = await api.get('/v2.3/Assistance/Ticket', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  return response.data
}

export async function createTicket(accessToken, ticket) {
  // En v2 on envoie directement les champs (pas d'enveloppe "input")
  const response = await api.post('/v2.3/Assistance/Ticket', ticket, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  return response.data
}

// Récupérer les infos de la session courante en v2
export async function getFullSession(accessToken) {
  const response = await api.get('/v2.3/getActiveProfile', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  return response.data
}
