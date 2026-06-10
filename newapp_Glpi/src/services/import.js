/**
 * Service d'import des données vers GLPI via API REST (v1 / apirest.php)
 *
 * Adapté à NewApp :
 *  - passe par le PROXY Vite /glpi-legacy (pas de CORS)
 *  - session token obtenu via Basic auth (login/password du .env)
 *  - App-Token optionnel (envoyé seulement s'il est défini)
 *
 * Règles :
 *  - Tout ou rien (CSV ET images) : si quoi que ce soit échoue -> rollback
 *    complet de tout ce qui a été créé (éléments, tickets, coûts, documents).
 *  - Doublons gérés (préchargement + recherche)
 *  - MIME images détecté par "magic bytes" (corrige les .png mal typés)
 */

// /glpi-legacy -> http://glpi.local/apirest.php (proxy Vite)
const API_BASE_URL = import.meta.env.VITE_GLPI_LEGACY_URL || '/glpi-legacy'
const APP_TOKEN = import.meta.env.VITE_GLPI_APP_TOKEN || '' // optionnel

// ─── Colonnes attendues (comparaison lowercase) ──────────────────────────────
const EXPECTED_COLUMNS = {
  feuille1: ['name', 'status', 'location', 'manufacturer', 'item_type', 'model', 'inventory_number', 'user'],
  feuille2: ['ref_ticket', 'date', 'heure', 'type', 'titre', 'description', 'status', 'priority', 'items'],
  feuille3: ['num_ticket', 'duration_second', 'time_cost', 'fixed_cost']
}

const STATUS_MAP = {
  'en production': 'En production',
  'maintenance': 'Maintenance',
  'en panne': 'En panne',
  'en stock': 'En stock',
  'hors service': 'Hors service'
}

const TICKET_TYPE_MAP = { incident: 1, demande: 2, request: 2 }
const TICKET_STATUS_MAP = { new: 1, assigned: 2, planned: 3, waiting: 4, solved: 5, closed: 6 }
const PRIORITY_MAP = { 'very low': 1, low: 2, medium: 3, high: 4, 'very high': 5, major: 6 }

// ─── Session token (Basic auth via proxy) ────────────────────────────────────
let _sessionToken = null
export async function initLegacySession() {
  if (_sessionToken) return _sessionToken
  const login = import.meta.env.VITE_GLPI_LOGIN || 'glpi'
  const pass = import.meta.env.VITE_GLPI_PASSWORD || 'glpi'
  const h = { Authorization: 'Basic ' + btoa(`${login}:${pass}`) }
  if (APP_TOKEN) h['App-Token'] = APP_TOKEN
  const res = await fetch(`${API_BASE_URL}/initSession`, { headers: h })
  if (!res.ok) throw new Error(`initSession échec (${res.status})`)
  const data = await res.json()
  _sessionToken = data.session_token
  return _sessionToken
}

// ─── Helpers HTTP ─────────────────────────────────────────────────────────────
function headers(sessionToken) {
  const h = {
    'Session-Token': sessionToken,
    'Content-Type': 'application/json'
  }
  if (APP_TOKEN) h['App-Token'] = APP_TOKEN
  return h
}

async function fetchWithRetry(url, options, retries = 3) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (err) {
      lastError = err
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw new Error(`Erreur réseau après ${retries} tentatives : ${lastError?.message || 'Failed to fetch'}`)
}

async function glpiGet(path, sessionToken) {
  const res = await fetchWithRetry(`${API_BASE_URL}/${path}`, {
    method: 'GET',
    headers: headers(sessionToken)
  })
  if (res.status === 200 || res.status === 206) return res.json()
  return null
}

async function glpiPost(itemtype, input, sessionToken) {
  const res = await fetchWithRetry(`${API_BASE_URL}/${itemtype}`, {
    method: 'POST',
    headers: headers(sessionToken),
    body: JSON.stringify({ input })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`POST ${itemtype} failed (${res.status}): ${err}`)
  }
  return res.json()
}

async function glpiDelete(itemtype, ids, sessionToken) {
  if (!ids.length) return
  await fetchWithRetry(`${API_BASE_URL}/${itemtype}`, {
    method: 'DELETE',
    headers: headers(sessionToken),
    body: JSON.stringify({ input: ids.map((id) => ({ id })), force_purge: true })
  })
}

// ─── Cache get-or-create pour les tables de référence ────────────────────────
function makeRefCache() {
  const cache = {}
  const preloaded = new Set()
  const pending = {}

  async function preload(itemtype, sessionToken) {
    if (preloaded.has(itemtype)) return
    preloaded.add(itemtype)
    try {
      const items = await glpiGet(`${itemtype}?range=0-9999`, sessionToken)
      if (Array.isArray(items)) {
        for (const item of items) {
          const n = item.name || item.completename
          if (item.id && n) cache[`${itemtype}:${n.toLowerCase().trim()}`] = item.id
        }
      }
    } catch (_) { /* pas critique */ }
  }

  async function searchInGlpi(itemtype, name, sessionToken) {
    const key = name.toLowerCase().trim()
    try {
      const r = await glpiGet(
        `${itemtype}?searchText[name]=${encodeURIComponent(name)}&range=0-50`,
        sessionToken
      )
      if (Array.isArray(r)) {
        const found = r.find((x) => (x.name || x.completename || '').toLowerCase().trim() === key)
        if (found) return found.id
      }
    } catch (_) {}
    preloaded.delete(itemtype)
    await preload(itemtype, sessionToken)
    return cache[`${itemtype}:${key}`] ?? null
  }

  async function getOrCreate(itemtype, name, sessionToken, extraInput = {}) {
    if (!name || name.trim() === '') return 0
    const key = name.toLowerCase().trim()
    const cacheKey = `${itemtype}:${key}`
    if (cache[cacheKey] !== undefined) return cache[cacheKey]
    if (pending[cacheKey]) return pending[cacheKey]

    pending[cacheKey] = (async () => {
      try {
        await preload(itemtype, sessionToken)
        if (cache[cacheKey] !== undefined) return cache[cacheKey]

        const res = await fetch(`${API_BASE_URL}/${itemtype}`, {
          method: 'POST',
          headers: headers(sessionToken),
          body: JSON.stringify({ input: { name, ...extraInput } })
        })
        const bodyText = await res.text()
        if (res.ok) {
          try {
            const result = JSON.parse(bodyText)
            if (result?.id) {
              cache[cacheKey] = result.id
              return result.id
            }
          } catch (_) {}
        }
        if (res.status === 400) {
          const existingId = await searchInGlpi(itemtype, name, sessionToken)
          if (existingId) {
            cache[cacheKey] = existingId
            return existingId
          }
        }
        throw new Error(`POST ${itemtype} failed (${res.status}): ${bodyText}`)
      } finally {
        delete pending[cacheKey]
      }
    })()

    return pending[cacheKey]
  }

  return { getOrCreate }
}

// ─── Parsing CSV ──────────────────────────────────────────────────────────────
function parseLineCSV(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (!lines.length) return []
  const normalizedHeaders = parseLineCSV(lines[0]).map((h) => h.toLowerCase().trim())
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = parseLineCSV(line)
    const row = {}
    normalizedHeaders.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
}

function validateColumns(csvText, expectedKey) {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
  if (!lines.length) return 'Fichier vide'
  const actual = parseLineCSV(lines[0]).map((h) => h.toLowerCase().trim())
  const expected = EXPECTED_COLUMNS[expectedKey]
  const missing = expected.filter((e) => !actual.includes(e))
  if (missing.length) return `Colonnes manquantes : ${missing.join(', ')}`
  return null
}

// ─── Utilisateurs : get-or-create (avec champs requis) ───────────────────────
async function getOrCreateUser(username, sessionToken) {
  if (!username || username.trim() === '') return 0
  const userName = username.trim()
  try {
    const existing = await glpiGet(`User?searchText[name]=${encodeURIComponent(userName)}`, sessionToken)
    if (Array.isArray(existing)) {
      const u = existing.find((x) => x.name === userName)
      if (u?.id) return u.id
    }
    const input = {
      name: userName,
      password: 'Password123!',
      password2: 'Password123!',
      firstname: userName,
      realname: userName,
      entities_id: 0,
      profiles_id: 1,
      is_active: 1,
      _entities_id: 0
    }
    const res = await fetch(`${API_BASE_URL}/User`, {
      method: 'POST',
      headers: headers(sessionToken),
      body: JSON.stringify({ input })
    })
    if (!res.ok) {
      // doublon ou autre -> retenter une recherche
      const again = await glpiGet(`User?searchText[name]=${encodeURIComponent(userName)}`, sessionToken)
      if (Array.isArray(again)) {
        const f = again.find((x) => x.name === userName)
        if (f?.id) return f.id
      }
      return 0
    }
    const result = await res.json()
    return result.id || 0
  } catch (e) {
    return 0
  }
}

// ─── Import Feuille 1 : Éléments ─────────────────────────────────────────────
async function importElements(csvText, sessionToken, refCache, onProgress) {
  const rows = parseCSV(csvText)
  const created = []

  const ITEM_TYPE_CONFIG = {
    Computer: { endpoint: 'Computer', modelField: 'computermodels_id', modelType: 'ComputerModel' },
    Monitor: { endpoint: 'Monitor', modelField: 'monitormodels_id', modelType: 'MonitorModel' },
    Printer: { endpoint: 'Printer', modelField: 'printermodels_id', modelType: 'PrinterModel' },
    Phone: { endpoint: 'Phone', modelField: 'phonemodels_id', modelType: 'PhoneModel' },
    Peripheral: { endpoint: 'Peripheral', modelField: 'peripheralmodels_id', modelType: 'PeripheralModel' },
    NetworkEquipment: { endpoint: 'NetworkEquipment', modelField: 'networkequipmentmodels_id', modelType: 'NetworkEquipmentModel' }
  }

  const existingElements = {}
  const allEndpoints = [...new Set(Object.values(ITEM_TYPE_CONFIG).map((c) => c.endpoint))]
  await Promise.all(allEndpoints.map(async (endpoint) => {
    existingElements[endpoint] = {}
    try {
      const items = await glpiGet(`${endpoint}?range=0-9999`, sessionToken)
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.id && item.name) {
            existingElements[endpoint][item.name.toLowerCase().trim()] = { id: item.id, itemtype: endpoint }
          }
        }
      }
    } catch (_) {}
  }))

  const BATCH = 5
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (row) => {
      const itemType = (row['item_type'] || '').trim()
      const config = ITEM_TYPE_CONFIG[itemType] || ITEM_TYPE_CONFIG.Computer
      const itemName = row['name']?.trim() || ''
      if (!itemName) return null

      const nameKey = itemName.toLowerCase().trim()
      if (existingElements[config.endpoint]?.[nameKey]) {
        const existing = existingElements[config.endpoint][nameKey]
        return { itemtype: config.endpoint, id: existing.id, name: itemName, existing: true }
      }

      const userId = await getOrCreateUser(row['user']?.trim() || '', sessionToken)

      const [locationsId, manufacturersId, statesId, modelId] = await Promise.all([
        row['location'] ? refCache.getOrCreate('Location', row['location'].trim(), sessionToken) : Promise.resolve(0),
        row['manufacturer'] ? refCache.getOrCreate('Manufacturer', row['manufacturer'].trim(), sessionToken) : Promise.resolve(0),
        row['status'] ? refCache.getOrCreate('State', STATUS_MAP[row['status'].toLowerCase().trim()] || row['status'].trim(), sessionToken) : Promise.resolve(0),
        (row['model'] && config.modelType) ? refCache.getOrCreate(config.modelType, row['model'].trim(), sessionToken) : Promise.resolve(0)
      ])

      const input = {
        name: itemName,
        otherserial: row['inventory_number']?.trim() || '',
        users_id: userId,
        locations_id: locationsId,
        manufacturers_id: manufacturersId,
        states_id: statesId,
        entities_id: 0
      }
      if (config.modelField && modelId) input[config.modelField] = modelId

      const res = await glpiPost(config.endpoint, input, sessionToken)
      existingElements[config.endpoint][nameKey] = { id: res.id, itemtype: config.endpoint }
      return { itemtype: config.endpoint, id: res.id, name: itemName, existing: false }
    }))

    const validResults = results.filter((r) => r !== null)
    const newItems = validResults.filter((r) => !r.existing)
    created.push(...newItems)

    onProgress?.({
      phase: 'elements',
      done: Math.min(i + BATCH, rows.length),
      total: rows.length,
      batch: newItems
    })
  }
  return created
}

// ─── Import Feuille 2 : Tickets ───────────────────────────────────────────────
async function importTickets(csvText, sessionToken, createdElements, onProgress) {
  const rows = parseCSV(csvText)
  const created = []
  const elementIndex = {}
  for (const el of createdElements) elementIndex[el.name.toLowerCase()] = el

  const BATCH = 5
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (row) => {
      let dateStr = null
      try {
        const [d, m, y] = (row['date'] || '').split('/')
        const time = row['heure'] || '00:00'
        dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${time}:00`
      } catch (_) {}

      const ticketInput = {
        name: row['titre']?.trim() || '',
        content: row['description']?.trim() || '',
        type: TICKET_TYPE_MAP[(row['type'] || '').toLowerCase().trim()] ?? 1,
        status: TICKET_STATUS_MAP[(row['status'] || '').toLowerCase().trim()] ?? 1,
        priority: PRIORITY_MAP[(row['priority'] || '').toLowerCase().trim()] ?? 3,
        date: dateStr,
        entities_id: 0
      }
      const ticketRes = await glpiPost('Ticket', ticketInput, sessionToken)
      const ticketId = ticketRes.id

      let itemNames = []
      try {
        const raw = (row['items'] || '').trim()
        if (raw.startsWith('[')) itemNames = JSON.parse(raw)
        else if (raw) itemNames = [raw]
      } catch (_) {}

      await Promise.all(itemNames.map(async (name) => {
        const el = elementIndex[String(name).toLowerCase()]
        if (!el) return
        await glpiPost('Item_Ticket', {
          itemtype: el.itemtype,
          items_id: el.id,
          tickets_id: ticketId
        }, sessionToken).catch(() => {})
      }))

      return { id: ticketId, ref: row['ref_ticket'] }
    }))
    created.push(...results)
    onProgress?.({ phase: 'tickets', done: Math.min(i + BATCH, rows.length), total: rows.length })
  }
  return created
}

// ─── Import Feuille 3 : Coûts ─────────────────────────────────────────────────
async function importCosts(csvText, sessionToken, createdTickets, onProgress) {
  const rows = parseCSV(csvText)
  const created = []
  const ticketIndex = {}
  for (const t of createdTickets) ticketIndex[String(t.ref)] = t.id

  const BATCH = 10
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (row) => {
      const ticketId = ticketIndex[String(row['num_ticket'])]
      if (!ticketId) return null
      const parseNum = (v) => parseFloat((v || '0').replace(',', '.')) || 0
      const input = {
        tickets_id: ticketId,
        actiontime: parseInt(row['duration_second'] || '0', 10),
        cost_time: parseNum(row['time_cost']),
        cost_fixed: parseNum(row['fixed_cost']),
        cost_material: 0,
        entities_id: 0
      }
      const res = await glpiPost('TicketCost', input, sessionToken)
      return { id: res.id }
    }))
    created.push(...results.filter(Boolean))
    onProgress?.({ phase: 'costs', done: Math.min(i + BATCH, rows.length), total: rows.length })
  }
  return created
}

// ─── Import Images (via JSZip + magic bytes) ─────────────────────────────────
function detectMime(data) {
  if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return { mime: 'image/jpeg', ext: 'jpeg' }
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return { mime: 'image/gif', ext: 'gif' }
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
      data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return { mime: 'image/webp', ext: 'webp' }
  return null
}

async function importImages(images, sessionToken, createdElements, onProgress, trackCreated) {
  // images : [{ filename, data: Uint8Array }]
  const elementIndex = {}
  for (const el of createdElements) elementIndex[el.name.toLowerCase()] = el

  const success = []
  let done = 0

  for (const { filename, data } of images) {
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '').toLowerCase()
    const el = elementIndex[nameWithoutExt]

    const detected = detectMime(data)
    const realMime = detected?.mime || 'image/jpeg'
    const realExt = detected?.ext || filename.split('.').pop().toLowerCase()
    const realFilename = filename.replace(/\.[^.]+$/, '') + '.' + realExt

    const fileObj = new File([data], realFilename, { type: realMime })
    const formData = new FormData()
    formData.append('uploadManifest', JSON.stringify({
      input: { name: realFilename, _filename: [realFilename], entities_id: 0 }
    }))
    formData.append('filename[0]', fileObj, realFilename)

    const uploadRes = await fetch(`${API_BASE_URL}/Document`, {
      method: 'POST',
      headers: APP_TOKEN
        ? { 'Session-Token': sessionToken, 'App-Token': APP_TOKEN }
        : { 'Session-Token': sessionToken },
      body: formData
    })
    if (!uploadRes.ok) {
      throw new Error(`Image '${filename}' : upload échoué (${uploadRes.status})`)
    }
    const uploadData = await uploadRes.json()
    const docId = uploadData?.id || uploadData?.[0]?.id
    if (!docId) {
      throw new Error(`Image '${filename}' : document non créé`)
    }
    // Tracer le document pour le rollback (tout ou rien)
    trackCreated?.([{ itemtype: 'Document', id: docId }])

    // Lier le document à l'élément
    if (el) {
      const linkRes = await glpiPost('Document_Item', {
        documents_id: docId,
        items_id: el.id,
        itemtype: el.itemtype,
        entities_id: 0
      }, sessionToken)
      const linkId = linkRes?.id || linkRes?.[0]?.id
      if (linkId) trackCreated?.([{ itemtype: 'Document_Item', id: linkId }])
    }

    success.push(filename)
    done++
    onProgress?.({ phase: 'images', done, total: images.length })
  }
  return { success, errors: [] }
}

// ─── Rollback ─────────────────────────────────────────────────────────────────
async function rollback(created, sessionToken) {
  if (!created || created.length === 0) return
  const byType = {}
  for (const item of created) {
    if (!item?.id || !item.itemtype) continue
    if (!byType[item.itemtype]) byType[item.itemtype] = []
    byType[item.itemtype].push(item.id)
  }
  const ORDER = [
    'Document_Item', 'Item_Ticket', 'TicketCost',
    'Document',
    'Ticket',
    'Computer', 'Monitor', 'Printer', 'Phone', 'Peripheral', 'NetworkEquipment'
  ]
  for (const type of ORDER) {
    if (byType[type]?.length) {
      try { await glpiDelete(type, byType[type], sessionToken) } catch (e) { console.error(`Rollback ${type}`, e) }
      delete byType[type]
    }
  }
  for (const [type, ids] of Object.entries(byType)) {
    if (ids?.length) {
      try { await glpiDelete(type, ids, sessionToken) } catch (e) { console.error(`Rollback ${type}`, e) }
    }
  }
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────
/**
 * @param {File} feuille1 / feuille2 / feuille3  fichiers CSV
 * @param {Array<{filename,data}>|null} images   images déjà extraites du ZIP (Uint8Array)
 * @param {function} onProgress
 */
export async function importAll({ feuille1, feuille2, feuille3, images = null, onProgress }) {
  let sessionToken
  try {
    sessionToken = await initLegacySession()
  } catch (e) {
    return { success: false, message: 'Erreur de session GLPI : ' + e.message, details: null }
  }

  const allCreated = []
  function trackCreated(items) {
    for (const item of items) {
      if (item?.id && item?.itemtype && !item.existing) {
        allCreated.push({ itemtype: item.itemtype, id: item.id })
      }
    }
  }

  try {
    const [text1, text2, text3] = await Promise.all([feuille1.text(), feuille2.text(), feuille3.text()])

    onProgress?.({ phase: 'validation', message: 'Validation des colonnes...' })
    const err1 = validateColumns(text1, 'feuille1')
    const err2 = validateColumns(text2, 'feuille2')
    const err3 = validateColumns(text3, 'feuille3')
    if (err1) throw new Error(`Feuille 1 (Éléments) — ${err1}`)
    if (err2) throw new Error(`Feuille 2 (Tickets) — ${err2}`)
    if (err3) throw new Error(`Feuille 3 (Coûts) — ${err3}`)

    const refCache = makeRefCache()

    onProgress?.({ phase: 'elements', message: 'Import des éléments...', done: 0, total: 100 })
    const createdElements = await importElements(text1, sessionToken, refCache, (p) => {
      if (p.batch) trackCreated(p.batch)
      onProgress?.(p)
    })
    trackCreated(createdElements)

    onProgress?.({ phase: 'tickets', message: 'Import des tickets...', done: 0, total: 100 })
    const createdTickets = await importTickets(text2, sessionToken, createdElements, onProgress)
    for (const t of createdTickets) if (t?.id) allCreated.push({ itemtype: 'Ticket', id: t.id })

    onProgress?.({ phase: 'costs', message: 'Import des coûts...', done: 0, total: 100 })
    const createdCosts = await importCosts(text3, sessionToken, createdTickets, onProgress)
    for (const c of createdCosts) if (c?.id) allCreated.push({ itemtype: 'TicketCost', id: c.id })

    let imageResult = null
    if (images && images.length) {
      onProgress?.({ phase: 'images', message: 'Import des images...', done: 0, total: 100 })
      // trackCreated est passé pour que les Documents/Document_Item créés
      // soient inclus dans le rollback (tout ou rien étendu aux images).
      imageResult = await importImages(images, sessionToken, createdElements, onProgress, trackCreated)
    }

    return {
      success: true,
      message: 'Import terminé avec succès',
      details: {
        elements: createdElements.filter((e) => !e.existing).length,
        elementsDuplicates: createdElements.filter((e) => e.existing).length,
        tickets: createdTickets.length,
        costs: createdCosts.length,
        images: imageResult
          ? `${imageResult.success?.length ?? 0} importées, ${imageResult.errors?.length ?? 0} erreurs`
          : 'Non importées'
      }
    }
  } catch (error) {
    onProgress?.({ phase: 'rollback', message: `Erreur — annulation de ${allCreated.length} élément(s)...` })
    try { await rollback(allCreated, sessionToken) } catch (rb) { console.error('Rollback partiel', rb) }
    return { success: false, message: error.message, details: null }
  }
}

export { EXPECTED_COLUMNS }
