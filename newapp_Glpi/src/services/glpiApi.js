import axios from 'axios'

/**
 * Connexion à l'API GLPI — flux NewApp.
 *   NewApp (Vue)  <->  API REST JSON  <->  GLPI (base de données)
 *
 * Stratégie hybride (imposée par le comportement de GLPI 11) :
 *   - API v2 (High-Level, OAuth2)  : création + lecture
 *   - API v1 (Legacy, session)     : liaison Item_Ticket + suppression (purge)
 *     car ces opérations ne marchent pas / n'existent pas en v2.
 *
 * Proxys Vite :
 *   /glpi-api     -> http://glpi.local/api.php     (v2)
 *   /glpi-legacy  -> http://glpi.local/apirest.php (v1)
 */

// ===== Client API v2 (High-Level) =====
const api = axios.create({
  baseURL: import.meta.env.VITE_GLPI_API_URL, // /glpi-api
  headers: { 'Content-Type': 'application/json' }
})
const V = '/v2.3'

// ===== Client API v1 (Legacy) =====
const legacy = axios.create({
  baseURL: import.meta.env.VITE_GLPI_LEGACY_URL || '/glpi-legacy',
  headers: { 'Content-Type': 'application/json' }
})

function basicAuth() {
  const login = import.meta.env.VITE_GLPI_LOGIN || 'glpi'
  const pass = import.meta.env.VITE_GLPI_PASSWORD || 'glpi'
  return 'Basic ' + btoa(`${login}:${pass}`)
}

let _sessionToken = null
async function getSessionToken() {
  if (_sessionToken) return _sessionToken
  const { data } = await legacy.get('/initSession', {
    headers: { Authorization: basicAuth() }
  })
  _sessionToken = data.session_token
  return _sessionToken
}

// ---------- Authentification (v2 OAuth2) ----------
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

// ---------- Lecture (Assets) v2 ----------
export async function getComputers(token, includeDeleted = false) {
  const { data } = await api.get(`${V}/Assets/Computer${includeDeleted ? '?is_deleted=1' : ''}`, auth(token))
  return normalizeList(data, includeDeleted)
}

export async function getMonitors(token, includeDeleted = false) {
  const { data } = await api.get(`${V}/Assets/Monitor${includeDeleted ? '?is_deleted=1' : ''}`, auth(token))
  return normalizeList(data, includeDeleted)
}

// ---------- Lecture (Tickets) v2 ----------
export async function getTickets(token, includeDeleted = false) {
  const { data } = await api.get(`${V}/Assistance/Ticket${includeDeleted ? '?is_deleted=1' : ''}`, auth(token))
  return normalizeList(data, includeDeleted)
}

export async function getTicket(token, id) {
  const { data } = await api.get(`${V}/Assistance/Ticket/${id}`, auth(token))
  return data
}

// ---------- Lecture (Documents = images) v2 ----------
export async function getDocuments(token, includeDeleted = false) {
  const { data } = await api.get(`${V}/Management/Document${includeDeleted ? '?is_deleted=1' : ''}`, auth(token))
  return normalizeList(data, includeDeleted)
}

// ---------- Écriture (création) v2 ----------
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
 * L'endpoint Item_Ticket n'existe PAS en v2 (404) -> API v1.
 * Format v1 : { input: { itemtype, items_id, tickets_id } }
 */
export async function linkItemToTicket(token, ticketId, itemtype, itemsId) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/Item_Ticket',
    { input: { itemtype, items_id: itemsId, tickets_id: ticketId } },
    { headers: { 'Session-Token': session } }
  )
  return data
}

// ---------- Dropdowns via API v1 : find-or-create ----------
// itemtype = "Location" | "Manufacturer" | "State"
// Renvoie l'id de l'intitulé (créé s'il n'existe pas), ou null.
const _ddCache = {} // { "Location:Administration": 3, ... }

export async function findOrCreateDropdown(itemtype, name) {
  if (!name || !name.trim()) return null
  const clean = name.trim()
  const cacheKey = `${itemtype}:${clean}`
  if (_ddCache[cacheKey] !== undefined) return _ddCache[cacheKey]

  const session = await getSessionToken()
  const headers = { 'Session-Token': session }

  // 1) Chercher dans la liste existante (range large)
  try {
    const { data } = await legacy.get(`/${itemtype}`, {
      headers: { ...headers, 'Range': '0-9999' }
    })
    const list = Array.isArray(data) ? data : (data?.data || [])
    const found = list.find((d) => d.name === clean || d.completename === clean)
    if (found?.id) {
      _ddCache[cacheKey] = found.id
      return found.id
    }
  } catch (e) { /* on tente la création */ }

  // 2) Créer
  try {
    const { data } = await legacy.post(`/${itemtype}`,
      { input: { name: clean } },
      { headers }
    )
    const id = extractId(data)
    _ddCache[cacheKey] = id
    return id
  } catch (e) {
    _ddCache[cacheKey] = null
    return null
  }
}

// ---------- Images : upload via API v1 (multipart fiable) + liaison ----------
/**
 * Envoie une image comme Document via l'API v1 (apirest.php/Document).
 * Format multipart documenté : uploadManifest (JSON) + filename[0] (binaire).
 * Renvoie l'id du document, ou null.
 */
export async function uploadDocument(token, file, name, itemtype = null, itemsId = null) {
  const session = await getSessionToken()
  const manifest = { input: { name: name || file.name, _filename: [file.name] } }

  const form = new FormData()
  form.append('uploadManifest', new Blob([JSON.stringify(manifest)], { type: 'application/json' }))
  form.append('filename[0]', file, file.name)

  const { data } = await legacy.post('/Document', form, {
    headers: { 'Session-Token': session },
    transformRequest: (d, headers) => {
      delete headers['Content-Type']
      delete headers['content-type']
      return d
    }
  })
  const docId = extractId(data)

  // Lier le document à l'élément (Computer/Monitor)
  if (docId && itemtype && itemsId) {
    try {
      await legacy.post('/Document_Item',
        { input: { documents_id: docId, itemtype, items_id: itemsId } },
        { headers: { 'Session-Token': session } }
      )
    } catch (e) { /* liaison non bloquante */ }
  }
  return docId
}

// ---------- Suppression DÉFINITIVE via API v1 (Legacy) ----------
// L'API v2 ignore force_purge (DELETE = corbeille). L'API v1 purge réellement.
async function purgeLegacy(itemtype, id) {
  const session = await getSessionToken()
  await legacy.delete(`/${itemtype}/${id}`, {
    headers: { 'Session-Token': session },
    params: { force_purge: true }
  })
}

export async function deleteComputer(token, id) {
  await purgeLegacy('Computer', id)
}
export async function deleteMonitor(token, id) {
  await purgeLegacy('Monitor', id)
}
export async function deleteTicket(token, id) {
  await purgeLegacy('Ticket', id)
}
export async function deleteDocument(token, id) {
  await purgeLegacy('Document', id)
}

// ---------- Helpers ----------
export function extractId(res) {
  if (res?.id) return res.id
  if (res?.href) {
    const m = String(res.href).match(/(\d+)\s*$/)
    if (m) return Number(m[1])
  }
  if (Array.isArray(res) && res[0]?.id) return res[0].id
  return res
}

function normalizeList(data, includeDeleted = false) {
  let list = []
  if (Array.isArray(data)) list = data
  else if (Array.isArray(data?.data)) list = data.data

  if (includeDeleted) return list
  return list.filter(item => item.is_deleted !== 1 && item.is_deleted !== true)
}
