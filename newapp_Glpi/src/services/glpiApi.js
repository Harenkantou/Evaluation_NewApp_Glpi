import axios from 'axios'

/**
 * Connexion à l'API GLPI v2 (High-Level) en OAuth2 — flux NewApp.
 *
 *   NewApp (Vue)  <->  API REST JSON  <->  GLPI (base de données)
 *
 * baseURL = /glpi-api  (proxyfié par Vite vers http://glpi.local/api.php)
 *
 * NB : les endpoints d'écriture (assets) n'ont pas pu être testés ici.
 *      À valider contre votre instance GLPI ; ajuster si nécessaire.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_GLPI_API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Version d'API (peut être ajustée : "v2", "v2.3", ...)
const V = '/v2.3'

// ---------- Authentification ----------
export async function initSession() {
  const { data } = await api.post('/token', {
    grant_type: 'password',
    client_id: import.meta.env.VITE_GLPI_CLIENT_ID,
    client_secret: import.meta.env.VITE_GLPI_CLIENT_SECRET,
    scope: 'api',
    username: import.meta.env.VITE_GLPI_LOGIN,
    password: import.meta.env.VITE_GLPI_PASSWORD
  })
  return data.access_token
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } }
}

// ---------- Lecture (Assets) ----------
export async function getComputers(token) {
  const { data } = await api.get(`${V}/Assets/Computer`, auth(token))
  return normalizeList(data)
}

export async function getMonitors(token) {
  const { data } = await api.get(`${V}/Assets/Monitor`, auth(token))
  return normalizeList(data)
}

// ---------- Lecture (Tickets) ----------
export async function getTickets(token) {
  const { data } = await api.get(`${V}/Assistance/Ticket`, auth(token))
  return normalizeList(data)
}

export async function getTicket(token, id) {
  const { data } = await api.get(`${V}/Assistance/Ticket/${id}`, auth(token))
  return data
}

// ---------- Écriture (création) ----------
export async function createComputer(token, payload) {
  const { data } = await api.post(`${V}/Assets/Computer`, payload, auth(token))
  return data
}

export async function createMonitor(token, payload) {
  const { data } = await api.post(`${V}/Assets/Monitor`, payload, auth(token))
  return data
}

export async function createTicket(token, payload) {
  const { data } = await api.post(`${V}/Assistance/Ticket`, payload, auth(token))
  return data
}

/**
 * Associe un élément (Computer/Monitor) à un ticket.
 * En GLPI, cela passe par l'objet de liaison Item_Ticket.
 * itemtype = "Computer" | "Monitor", items_id = id de l'asset, tickets_id = id du ticket.
 */
export async function linkItemToTicket(token, ticketId, itemtype, itemsId) {
  const payload = { tickets_id: ticketId, itemtype, items_id: itemsId }
  const { data } = await api.post(`${V}/Assistance/Item_Ticket`, payload, auth(token))
  return data
}

// ---------- Suppression (reset) ----------
export async function deleteComputer(token, id) {
  await api.delete(`${V}/Assets/Computer/${id}`, auth(token))
}

export async function deleteMonitor(token, id) {
  await api.delete(`${V}/Assets/Monitor/${id}`, auth(token))
}

export async function deleteTicket(token, id) {
  await api.delete(`${V}/Assistance/Ticket/${id}`, auth(token))
}

// ---------- Helpers ----------
function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}
