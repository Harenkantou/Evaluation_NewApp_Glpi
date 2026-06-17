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

// ---------- Lecture via API v1 (avec noms de dropdowns) ----------
// expand_dropdowns=true => l'API renvoie les NOMS (Administration, Dell...)
// au lieu des ids, pour un affichage direct dans le dashboard/les listes.
async function legacyGetList(itemtype, includeDeleted) {
  const session = await getSessionToken()
  const params = { range: '0-9999', expand_dropdowns: true }
  if (includeDeleted) params.is_deleted = 1
  const { data } = await legacy.get(`/${itemtype}`, {
    headers: { 'Session-Token': session },
    params
  })
  return Array.isArray(data) ? data : (data?.data || [])
}

export async function getComputers(token, includeDeleted = false) {
  return legacyGetList('Computer', includeDeleted)
}

export async function getMonitors(token, includeDeleted = false) {
  return legacyGetList('Monitor', includeDeleted)
}

export async function getPrinters(token, includeDeleted = false) {
  return legacyGetList('Printer', includeDeleted)
}

export async function getPhones(token, includeDeleted = false) {
  return legacyGetList('Phone', includeDeleted)
}

export async function getPeripherals(token, includeDeleted = false) {
  return legacyGetList('Peripheral', includeDeleted)
}

export async function getNetworkEquipments(token, includeDeleted = false) {
  return legacyGetList('NetworkEquipment', includeDeleted)
}

export async function getTickets(token, includeDeleted = false) {
  return legacyGetList('Ticket', includeDeleted)
}

export async function getTicket(token, id) {
  const session = await getSessionToken()
  const { data } = await legacy.get(`/Ticket/${id}`, {
    headers: { 'Session-Token': session },
    params: { expand_dropdowns: true }
  })
  return data
}

// ---------- Lecture (Documents = images) v1 ----------
export async function getDocuments(token, includeDeleted = false) {
  return legacyGetList('Document', includeDeleted)
}

// ---------- Écriture (création) ----------
// Computer/Monitor créés via API v1 : elle accepte les champs PLATS
// (locations_id, manufacturers_id, states_id, users_id), contrairement
// à la v2 qui attend des objets imbriqués {id:...} et ignore les *_id plats.
export async function createComputer(token, payload) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/Computer', { input: payload },
    { headers: { 'Session-Token': session } })
  return data
}

export async function createMonitor(token, payload) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/Monitor', { input: payload },
    { headers: { 'Session-Token': session } })
  return data
}

export async function createTicket(token, payload) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/Ticket', { input: payload },
    { headers: { 'Session-Token': session } })
  return data
}

export async function updateTicketStatus(token, id, status) {
  const session = await getSessionToken()
  const { data } = await legacy.put(`/Ticket/${id}`,
    { input: { id, status } },
    { headers: { 'Session-Token': session } }
  )
  return data
}

//Pour la boîte de dialogue lors du changement de statut

export async function addSolution(token, ticketId, content) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/ITILSolution',
    { input: { itemtype: 'Ticket', items_id: ticketId, content } },
    { headers: { 'Session-Token': session } }
  )
  return data
}

// Ajoute un suivi (followup) à un ticket — utilisé pour le motif de réouverture
export async function addFollowup(token, ticketId, content) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/ITILFollowup',
    { input: { itemtype: 'Ticket', items_id: ticketId, content } },
    { headers: { 'Session-Token': session } }
  )
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

export async function getTicketItems(token, ticketId) {
  try {
    const session = await getSessionToken()
    const { data } = await legacy.get(`/Ticket/${ticketId}/Item_Ticket`, {
      headers: { 'Session-Token': session },
      params: { range: '0-9999', expand_dropdowns: true }
    })
    const list = Array.isArray(data) ? data : (data?.data || [])
    return list
      .map((item) => ({
        ...item,
        itemtype: item.itemtype || item.item_type || null
      }))
      .filter((item) => ['Computer', 'Monitor', 'Phone'].includes(item.itemtype))
      .map((item) => ({
        id: Number(item.items_id),
        name: item.name || item.item_name || `${item.itemtype || 'Item'} #${item.items_id}`,
        itemtype: item.itemtype
      }))
  } catch (error) {
    console.warn('getTicketItems fallback for ticket', ticketId, error?.response?.status || error?.message || error)
    return []
  }
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

// ---------- Utilisateurs via API v1 : find-or-create ----------
// La colonne "User" du CSV contient un nom (ex. "Rakoto Jean", "ITU Labs").
// GLPI identifie un user par son login (champ name). On cherche d'abord par
// nom, sinon on crée un user dont le login = le nom du CSV.
// Renvoie l'id du user, ou null si la valeur est vide.
const _userCache = {} // { "Rakoto Jean": 12, ... }

export async function findOrCreateUser(name) {
  if (!name || !name.trim()) return null
  const clean = name.trim()
  if (_userCache[clean] !== undefined) return _userCache[clean]

  const session = await getSessionToken()
  const headers = { 'Session-Token': session }

  // 1) Chercher un user existant dont le login (name) correspond
  try {
    const { data } = await legacy.get('/User', {
      headers: { ...headers, 'Range': '0-9999' }
    })
    const list = Array.isArray(data) ? data : (data?.data || [])
    const found = list.find((u) => u.name === clean)
    if (found?.id) {
      _userCache[clean] = found.id
      return found.id
    }
  } catch (e) { /* on tente la création */ }

  // 2) Créer le user (login = nom du CSV ; realname rempli aussi)
  try {
    const { data } = await legacy.post('/User',
      { input: { name: clean, realname: clean } },
      { headers }
    )
    const id = extractId(data)
    _userCache[clean] = id
    return id
  } catch (e) {
    _userCache[clean] = null
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
  form.append('uploadManifest', JSON.stringify(manifest))
  form.append('filename[0]', file, file.name)

  // On reste sur le PROXY Vite (URL relative /glpi-legacy) => pas de CORS.
  // On utilise fetch (et NON le client axios "legacy") car axios impose un
  // Content-Type: application/json par défaut, ce qui écrase le multipart et
  // fait planter GLPI (json_decode null -> 500).
  // Avec fetch + FormData, le navigateur pose automatiquement
  // "multipart/form-data; boundary=..." correct.
  const legacyBase = import.meta.env.VITE_GLPI_LEGACY_URL || '/glpi-legacy'

  const res = await fetch(`${legacyBase}/Document/`, {
    method: 'POST',
    headers: { 'Session-Token': session }, // surtout PAS de Content-Type ici
    body: form
  })
  if (!res.ok) {
    throw new Error(`Upload Document HTTP ${res.status}`)
  }
  const data = await res.json()
  const docId = extractId(data)

  // Lier le document à l'élément (Computer/Monitor) — JSON simple via proxy
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
export async function deletePrinter(token, id) {
  await purgeLegacy('Printer', id)
}
export async function deletePhone(token, id) {
  await purgeLegacy('Phone', id)
}
export async function deletePeripheral(token, id) {
  await purgeLegacy('Peripheral', id)
}
export async function deleteNetworkEquipment(token, id) {
  await purgeLegacy('NetworkEquipment', id)
}
export async function deleteTicket(token, id) {
  await purgeLegacy('Ticket', id)
}
export async function deleteDocument(token, id) {
  await purgeLegacy('Document', id)
}

// ---------- Dropdowns : lecture + suppression définitive ----------
// itemtype = "Location" | "Manufacturer" | "State" | "ComputerModel" | ...
// Utilisés par le reset pour purger aussi les dropdowns créés à l'import.
export async function getDropdownList(itemtype) {
  return legacyGetList(itemtype, false)
}

export async function deleteDropdown(itemtype, id) {
  await purgeLegacy(itemtype, id)
}

export async function getUsers(token) {
  return legacyGetList('User')
}

export async function linkUserToTicket(token, ticketId, userId, type = 2) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/Ticket_User',
    { input: { tickets_id: ticketId, users_id: userId, type } },
    { headers: { 'Session-Token': session } }
  )
  return data
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

// Récupérer TOUS les TicketCosts depuis GLPI
export async function getAllTicketCosts(token) {
  const session = await getSessionToken()
  const { data } = await legacy.get('/TicketCost',
    {
      headers: { 'Session-Token' : session},
      params: { range: '0-9999' }
    })
  const list = Array.isArray(data) ? data : (data?.data || [])
  return list.map((c) => ({
    id: c.id,
    ticketId: Number(c.tickets_id),
    actiontime: Number(c.actiontime) || 0,
    costTime: Number(c.cost_time) || 0,
    costFixed: Number(c.cost_fixed) || 0,
    costMaterial: Number(c.cost_material) || 0
  }))
}

// Créer un TicketCost dans GLPI
export async function createTicketCost(token, ticketId, costAmount) {
  const session = await getSessionToken()
  const { data } = await legacy.post('/TicketCost',
    {
      input: {
        tickets_id: ticketId,
        actiontime: 0,
        cost_time: 0,
        cost_fixed: Number(costAmount) || 0,
        cost_material: 0,
        entities_id: 0
      }
    },
    { headers: { 'Session-Token': session } }
  )
  return data
}

//Lecture cout
export async function getTicketCosts(token, ticketId) {
  const session = await getSessionToken()
  let list = []
  try {
    const { data } = await legacy.get(`/Ticket/${ticketId}/TicketCost`,
      {
        headers: { 'Session-Token' : session},
        params: { range: '0-9999'}
      })
    list = Array.isArray(data) ? data : (data?.data || [])
  } catch (_) {
    const { data } = await legacy.get('/TicketCost',
      {
        headers: { 'Session-Token' : session},
        params: { range: '0-9999', tickets_id: ticketId }
      })
    list = Array.isArray(data) ? data : (data?.data || [])
  }

  return list.map((c) => ({
    id: c.id,
    durationSecond: Number(c.actiontime) || 0,
    timeCost: Number(c.cost_time) || 0,
    fixedCost: Number(c.cost_fixed) || 0,
    materialCost: Number(c.cost_material) || 0
  }))
}
