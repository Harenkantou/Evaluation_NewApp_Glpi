import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  initSession,
  getComputers, getMonitors, getTickets, getDocuments,
  createComputer, createMonitor, createTicket, linkItemToTicket,
  uploadDocument, findOrCreateDropdown,
  deleteComputer, deleteMonitor, deleteTicket, deleteDocument
} from '@/services/glpiApi'

/**
 * Store GLPI : token OAuth2 + opérations métier
 * (import CSV + images -> GLPI, lecture dashboard/listes, purge/reset).
 *
 * Images : envoyées à GLPI comme Documents (namespace Management) et liées
 * à l'élément (Computer/Monitor) du même Name. Tout passe par l'API.
 */
export const useGlpiStore = defineStore('glpi', () => {
  const token = ref('')
  const importedIds = ref({ computers: [], monitors: [], tickets: [], documents: [] })

  async function ensureToken() {
    if (!token.value) token.value = await initSession()
    return token.value
  }

  // ---------- IMPORT CSV (+ images) -> GLPI ----------
  /**
   * @param {{elements, tickets, costs}} parsed   données issues des CSV
   * @param {Object<string, File>} images         map { baseNameSansExt: File } du ZIP
   * @returns récap { computers, monitors, tickets, links, images, warnings }
   */
  async function importToGlpi(parsed, images = {}) {
    const t = await ensureToken()
    const warnings = []
    const counts = { computers: 0, monitors: 0, tickets: 0, links: 0, images: 0 }
    const ids = { computers: [], monitors: [], tickets: [], documents: [] }
    const elementRef = {}

    try {
      // 1) Éléments -> Computer / Monitor (+ image éventuelle)
      for (const e of (parsed.elements || [])) {
        const name = e.Name
        if (!name) continue

        // Résoudre les dropdowns (créés dans GLPI si absents) — via API v1
        const locationsId = await findOrCreateDropdown('Location', e.Location)
        const manufacturersId = await findOrCreateDropdown('Manufacturer', e.Manufacturer)
        const statesId = await findOrCreateDropdown('State', e.Status)

        const payload = {
          name,
          serial: e.Inventory_Number || '',
          comment: `Importé NewApp — Modèle: ${e.Model || '-'} | Utilisateur: ${e.User || '-'}`
        }
        if (locationsId) payload.locations_id = locationsId
        if (manufacturersId) payload.manufacturers_id = manufacturersId
        if (statesId) payload.states_id = statesId

        let id, itemtype
        try {
          if (e.Item_Type === 'Monitor') {
            const res = await createMonitor(t, payload)
            id = extractId(res)
            if (!id || (Array.isArray(res) && res[0]?.includes?.('ERROR'))) throw new Error(JSON.stringify(res))
            itemtype = 'Monitor'
            ids.monitors.push(id)
            counts.monitors++
          } else {
            const res = await createComputer(t, payload)
            id = extractId(res)
            if (!id || (Array.isArray(res) && res[0]?.includes?.('ERROR'))) throw new Error(JSON.stringify(res))
            itemtype = 'Computer'
            ids.computers.push(id)
            counts.computers++
          }
          elementRef[name] = { itemtype, id }
        } catch (err) {
          throw new Error(`Erreur création élément '${name}' : ${errMsg(err)}`)
        }

        // 1b) Image associée (fichier du ZIP dont le nom = Name de l'élément)
        const file = images[name]
        if (file) {
          try {
            const docId = await uploadDocument(t, file, name, itemtype, id)
            if (docId) {
              ids.documents.push(docId)
              counts.images++
            }
          } catch (err) {
            // Image non bloquante : on signale sans annuler tout l'import
            warnings.push(`Image de '${name}' non importée : ${errMsg(err)}`)
          }
        }
      }

      // 2) Tickets (+ coûts dans le contenu) -> Ticket
      const costByRef = groupCosts(parsed.costs)
      for (const tk of (parsed.tickets || [])) {
        const ref = tk.Ref_Ticket
        const costText = formatCosts(costByRef[String(ref)])
        const payload = {
          name: tk.Titre || `Ticket ${ref}`,
          content: (tk.Description || '') + costText
        }
        try {
          const res = await createTicket(t, payload)
          const ticketId = extractId(res)
          if (!ticketId || (Array.isArray(res) && res[0]?.includes?.('ERROR'))) throw new Error(JSON.stringify(res))
          ids.tickets.push(ticketId)
          counts.tickets++

          // 3) Liaison éléments du ticket (colonne Items)
          for (const elName of parseItems(tk.Items)) {
            const elt = elementRef[elName]
            if (!elt) {
              warnings.push(`Ticket ${ref} : élément '${elName}' introuvable.`)
              continue
            }
            try {
              await linkItemToTicket(t, ticketId, elt.itemtype, elt.id)
              counts.links++
            } catch (err) {
              throw new Error(`Erreur liaison ticket ${ref} avec '${elName}' : ${errMsg(err)}`)
            }
          }
        } catch (err) {
          throw new Error(`Erreur création ticket ${ref} : ${errMsg(err)}`)
        }
      }

      importedIds.value = ids
      return { ...counts, warnings }

    } catch (err) {
      // ROLLBACK : supprimer définitivement tout ce qui a été créé
      console.error('Import error, rolling back:', err)
      for (const id of ids.documents) { await safeDel(() => deleteDocument(t, id)) }
      for (const id of ids.tickets) { await safeDel(() => deleteTicket(t, id)) }
      for (const id of ids.computers) { await safeDel(() => deleteComputer(t, id)) }
      for (const id of ids.monitors) { await safeDel(() => deleteMonitor(t, id)) }
      throw err
    }
  }

  // ---------- LECTURE (dashboard / listes) ----------
  async function fetchStats() {
    const t = await ensureToken()
    const [computers, monitors, tickets] = await Promise.all([
      getComputers(t), getMonitors(t), getTickets(t)
    ])
    return { computers, monitors, tickets }
  }

  // ---------- PURGE TOTALE (reset) ----------
  // Récupère les éléments ACTIFS *et* en CORBEILLE, puis purge définitivement.
  // Boucle jusqu'à 3 passes : certaines suppressions échouent au 1er tour
  // (dépendances entre objets) puis réussissent quand les liens sont partis.
  // Renvoie un récap { tickets, computers, monitors, documents, errors }.
  async function purgeAllData() {
    const t = await ensureToken()
    const errors = []

    async function purgeType(getFn, delFn, label) {
      for (let pass = 0; pass < 3; pass++) {
        const [act, del] = await Promise.all([getFn(t, false), getFn(t, true)])
        const ids = uniqIds([...act, ...del])
        if (ids.length === 0) return 0
        for (const id of ids) {
          try {
            await delFn(t, id)
          } catch (e) {
            // on garde la dernière erreur pour diagnostic
            errors.push(`${label} #${id} : ${errMsg(e)}`)
          }
        }
      }
      // Vérif finale : reste-t-il quelque chose ?
      const [act2, del2] = await Promise.all([getFn(t, false), getFn(t, true)])
      return uniqIds([...act2, ...del2]).length
    }

    // Ordre : tickets d'abord (libère les liens), puis assets, puis documents
    const remainTickets = await purgeType(getTickets, deleteTicket, 'Ticket')
    const remainComputers = await purgeType(getComputers, deleteComputer, 'Computer')
    const remainMonitors = await purgeType(getMonitors, deleteMonitor, 'Monitor')
    const remainDocuments = await purgeType(getDocuments, deleteDocument, 'Document')

    importedIds.value = { computers: [], monitors: [], tickets: [], documents: [] }

    return {
      remaining: {
        tickets: remainTickets,
        computers: remainComputers,
        monitors: remainMonitors,
        documents: remainDocuments
      },
      errors
    }
  }

  return { token, importedIds, ensureToken, importToGlpi, fetchStats, purgeAllData }
})

// ---------- Helpers ----------
function uniqIds(list) {
  const set = new Set()
  for (const item of list) {
    const id = item?.id ?? item
    if (id != null) set.add(id)
  }
  return [...set]
}

function extractId(res) {
  if (res?.id) return res.id
  if (res?.href) {
    const m = String(res.href).match(/(\d+)\s*$/)
    if (m) return Number(m[1])
  }
  if (Array.isArray(res) && res[0]?.id) return res[0].id
  return res
}

function parseItems(raw) {
  if (!raw) return []
  try {
    const a = JSON.parse(raw)
    if (Array.isArray(a)) return a.map((x) => String(x).trim())
  } catch (e) {
    return raw.replace(/[[\]"']/g, '').split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function groupCosts(costRows) {
  const map = {}
  for (const r of (costRows || [])) {
    const k = String(r.Num_Ticket)
    if (!map[k]) map[k] = []
    map[k].push(r)
  }
  return map
}

function formatCosts(rows) {
  if (!rows || !rows.length) return ''
  let total = 0
  const lines = rows.map((r) => {
    const fixed = parseFloat(String(r.Fixed_Cost || '0').replace(',', '.')) || 0
    const time = parseFloat(String(r.Time_Cost || '0').replace(',', '.')) || 0
    total += fixed + time
    return `- durée ${r.Duration_second || 0}s, coût temps ${time}, coût fixe ${fixed}`
  })
  return `\n\n--- Coûts (importés NewApp) ---\n${lines.join('\n')}\nTotal: ${total}`
}

function errMsg(err) {
  return err.response?.data?.detail || err.response?.data?.title || err.message || 'erreur'
}

async function safeDel(fn) {
  try { await fn() } catch (e) { console.error('Delete failed:', e) }
}
