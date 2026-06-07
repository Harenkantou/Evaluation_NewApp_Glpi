import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  initSession,
  getComputers, getMonitors, getTickets,
  createComputer, createMonitor, createTicket, linkItemToTicket,
  deleteComputer, deleteMonitor, deleteTicket
} from '@/services/glpiApi'

/**
 * Store GLPI : gère le token OAuth2 et expose les opérations métier
 * (import CSV -> GLPI, lecture pour dashboard/listes, reset).
 *
 * On mémorise les IDs créés par l'import (importedIds) pour pouvoir
 * faire un reset ciblé (supprimer uniquement ce que NewApp a importé).
 * Ces IDs sont persistés (localStorage) pour survivre au refresh.
 */
export const useGlpiStore = defineStore('glpi', () => {
  const token = ref('')
  const importedIds = ref({ computers: [], monitors: [], tickets: [] })

  /** S'assure d'avoir un token valide (en obtient un si besoin). */
  async function ensureToken() {
    if (!token.value) {
      token.value = await initSession()
    }
    return token.value
  }

  // ---------- IMPORT CSV -> GLPI ----------
  /**
   * @param {{elements, tickets, costs}} parsed  données issues des CSV
   * @returns récapitulatif { computers, monitors, tickets, links, warnings }
   */
  async function importToGlpi(parsed) {
    const t = await ensureToken()
    const warnings = []
    const counts = { computers: 0, monitors: 0, tickets: 0, links: 0 }
    const ids = { computers: [], monitors: [], tickets: [] }

    // Map name CSV -> { itemtype, id } pour la liaison aux tickets
    const elementRef = {}

    // 1) Éléments -> Computer / Monitor
    for (const e of (parsed.elements || [])) {
      const name = e.Name
      if (!name) continue
      const payload = {
        name,
        serial: e.Inventory_Number || '',
        comment: `Importé NewApp — ${e.Manufacturer || ''} ${e.Model || ''} | `
               + `Lieu: ${e.Location || ''} | Statut: ${e.Status || ''} | `
               + `Utilisateur: ${e.User || '-'}`
      }
      try {
        if (e.Item_Type === 'Monitor') {
          const res = await createMonitor(t, payload)
          const id = extractId(res)
          ids.monitors.push(id)
          elementRef[name] = { itemtype: 'Monitor', id }
          counts.monitors++
        } else {
          // Computer par défaut
          const res = await createComputer(t, payload)
          const id = extractId(res)
          ids.computers.push(id)
          elementRef[name] = { itemtype: 'Computer', id }
          counts.computers++
        }
      } catch (err) {
        warnings.push(`Élément '${name}' non créé : ${errMsg(err)}`)
      }
    }

    // 2) Tickets (+ coûts intégrés au contenu) -> Ticket
    const costByRef = groupCosts(parsed.costs)
    for (const tk of (parsed.tickets || [])) {
      const ref = tk.Ref_Ticket
      const costText = formatCosts(costByRef[String(ref)])
      const payload = {
        name: tk.Titre || `Ticket ${ref}`,
        content: (tk.Description || '') + costText,
        // status/priority/urgency : GLPI attend des entiers ; on laisse les défauts
      }
      try {
        const res = await createTicket(t, payload)
        const ticketId = extractId(res)
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
            warnings.push(`Ticket ${ref} : lien '${elName}' échoué : ${errMsg(err)}`)
          }
        }
      } catch (err) {
        warnings.push(`Ticket ${ref} non créé : ${errMsg(err)}`)
      }
    }

    importedIds.value = ids
    return { ...counts, warnings }
  }

  // ---------- LECTURE (dashboard / listes) ----------
  async function fetchStats() {
    const t = await ensureToken()
    const [computers, monitors, tickets] = await Promise.all([
      getComputers(t), getMonitors(t), getTickets(t)
    ])
    return { computers, monitors, tickets }
  }

  // ---------- RESET (supprime ce qui a été importé) ----------
  async function resetImported() {
    const t = await ensureToken()
    const ids = importedIds.value
    for (const id of ids.tickets) { await safeDel(() => deleteTicket(t, id)) }
    for (const id of ids.computers) { await safeDel(() => deleteComputer(t, id)) }
    for (const id of ids.monitors) { await safeDel(() => deleteMonitor(t, id)) }
    importedIds.value = { computers: [], monitors: [], tickets: [] }
  }

  return { token, importedIds, ensureToken, importToGlpi, fetchStats, resetImported }
})

// ---------- Helpers ----------
function extractId(res) {
  // GLPI peut renvoyer {id} ou {href:"/Assets/Computer/15"} selon la version
  if (res?.id) return res.id
  if (res?.href) {
    const m = String(res.href).match(/(\d+)\s*$/)
    if (m) return Number(m[1])
  }
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
  try { await fn() } catch (e) { /* on ignore les échecs de suppression */ }
}
