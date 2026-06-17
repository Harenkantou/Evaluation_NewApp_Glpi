<script setup>
import { ref } from 'vue'
import BoLayout from '@/components/backoffice/BoLayout.vue'
import { useGlpiStore } from '@/stores/glpi'
import { getTickets } from '@/services/glpiApi'
import { reopenTicket, closeTicket, cancelLastCost } from '@/services/ticketService'

const glpi = useGlpiStore()


const loading = ref(false)
const message = ref('')
const logs = ref([])
//Etat Import Fichier 
const file = ref(null)
const setFile = (e) => { file.value = e.target.files?.[0] || null }

// ─── Parsing CSV ─────────────────────────────────────────────
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
    current += ch
  }
  values.push(current.trim())
  return values
}

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (!lines.length) return []

  const first = parseCSVLine(lines[0]).map(c => c.toLowerCase())
  const hasHeader = first.some(c => ['ticket', 'mvt', 'valeur', 'mode'].includes(c))
  const data = hasHeader ? lines.slice(1) : lines

  return data.map(line => {
    const [ticket, mvt, value] = parseCSVLine(line)
    const num = value ? Number(value.replace(',', '.')) : null
    return {
      ticketRef: String(ticket || '').trim(),
      movement: String(mvt || '').trim().toLowerCase(),
      value: Number.isFinite(num) ? num : null,
      mode : mode ? Number(mode) : 1
    }
  }).filter(r => r.ticketRef && r.movement)
}

// ─── ✅ CORRECTION : Mapping Ref → ID GLPI sécurisé ─────────
async function buildRefToIdMap() {
  const map = new Map()
  
  try {
    const token = await glpi.ensureToken()
    const tickets = await getTickets(token)

    // ✅ Vérifier que tickets est bien un tableau
    if (!Array.isArray(tickets)) {
      console.warn('⚠️ getTickets n\'a pas retourné un tableau:', tickets)
      return map  // Map vide
    }

    tickets.forEach(ticket => {
      if (!ticket || !ticket.id) return
      
      const content = String(ticket.content || '')
      const match = content.match(/Ref_Ticket:\s*(\d+)/i)
      
      if (match && match[1]) {
        map.set(String(match[1]), ticket.id)
      } else {
        // ✅ Fallback : si pas de Ref_Ticket dans content, utiliser l'ID GLPI directement
        map.set(String(ticket.id), ticket.id)
      }
    })

    console.log('🗺️ Map Ref → ID GLPI:', Object.fromEntries(map))
  } catch (err) {
    console.error('❌ Erreur buildRefToIdMap:', err)
  }
  
  return map  // ✅ Toujours retourner une Map (jamais undefined)
}

// ─── Traitement scénario ─────────────────────────────────────
async function processScenario(rows) {
  // ✅ S'assurer que refToId est une Map valide
  const refToId = await buildRefToIdMap()
  
  if (!refToId || !(refToId instanceof Map)) {
    throw new Error('Impossible de construire la map des tickets')
  }

  const summary = { open: 0, close: 0, cancel: 0, ignored: 0 }

  for (const row of rows) {
    const { ticketRef, movement, value, mode } = row

    // ✅ Récupérer l'ID GLPI avec fallback
    let glpiId = refToId.get(ticketRef)
    
    // Si pas trouvé via Ref_Ticket, essayer comme ID direct
    if (!glpiId) {
      const directId = Number(ticketRef)
      if (Number.isInteger(directId) && directId > 0) {
        glpiId = directId
      }
    }

    if (!glpiId) {
      logs.value.push(`⚠️ Ticket ref ${ticketRef} introuvable dans GLPI`)
      summary.ignored++
      continue
    }

    const name = `Ticket #${glpiId} (ref ${ticketRef})`

    try {
      // 🟢 OPEN = Réouverture (% du dernier coût)
     if (movement === 'open') {
      const result = await reopenTicket({
        ticketId: glpiId,
        ticketName: name,
        percent: value || 0,
        mode: rows?. mode || 1,
        batchId: importBatchId
      })
      return {
        success: true,
        type: 'open',
        log: `🟢 ${name} OPEN ${value}% de ${result.baseCost.toFixed(2)}€ → +${result.cost.toFixed(2)}€`
      }
    }

      // 🔵 CLOSE = Clôture
      if (movement === 'close') {
        await closeTicket({
          ticketId: glpiId,
          ticketName: name,
          amount: value || 0
        })
        logs.value.push(`🔵 ${name} CLOSE ${value}€`)
        summary.close++
        continue
      }

      // ❌ CANCEL = Annulation
      if (movement === 'cancel') {
        const result = await cancelLastCost(glpiId)
        logs.value.push(`❌ ${name} CANCEL → ${result.removed.costValue}€ supprimé`)
        summary.cancel++
        continue
      }

      logs.value.push(`⚠️ Mouvement inconnu : ${movement}`)
      summary.ignored++
    } catch (err) {
      logs.value.push(`❌ ${name} ${movement} échoué : ${err.message}`)
      summary.ignored++
    }
  }

  return summary
}

// ─── Submit ──────────────────────────────────────────────────
async function submit() {
  message.value = ''
  logs.value = []

  if (!file.value) {
    message.value = '❌ Veuillez choisir un fichier'
    return
  }

  loading.value = true
  try {
    const text = await file.value.text()
    const rows = parseCSV(text)
    if (!rows.length) throw new Error('CSV vide ou invalide')

    console.log('📂 Lignes parsées :', rows)

    const summary = await processScenario(rows)
    message.value = `✅ Import : ${summary.open} open, ${summary.close} close, ${summary.cancel} cancel, ${summary.ignored} ignoré(s)`
  } catch (e) {
    message.value = '❌ ' + (e.message || 'Erreur')
    console.error('❌ Erreur submit:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BoLayout>
    <h1>📥 Import scénario CSV</h1>
    <p>Format : <code>ticket,mvt,valeur, mode </code> avec mvt = open / close / cancel</p>

    <input type="file" accept=".csv" @change="setFile" />
    <button @click="submit" :disabled="loading || !file">
      {{ loading ? 'Import...' : 'Importer' }}
    </button>

    <p v-if="message">{{ message }}</p>

    <ul v-if="logs.length">
      <li v-for="(log, i) in logs" :key="i">{{ log }}</li>
    </ul>
  </BoLayout>
</template>

<style scoped>
h1 { margin-bottom: 1rem; }
button { margin-left: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; }
button:disabled { opacity: 0.5; }
ul { margin-top: 1rem; }
li { padding: 0.2rem 0; font-family: monospace; }
code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 3px; }
</style>