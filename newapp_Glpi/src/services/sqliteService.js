// src/services/sqliteService.js
//
// Service SQLite (sql.js) — stockage des réglages du Kanban (Jour 2).
//
// sql.js = SQLite compilé en WebAssembly : la base vit EN MÉMOIRE dans le
// navigateur. On la PERSISTE dans localStorage (sérialisée en base64) pour
// qu'elle survive aux rechargements de page.
//
// Une seule table "kanban_config" : pour chaque statut (1, 2, 6), on stocke
// la couleur de fond + le nom en malgache + le nom en français.
//
// API publique :
//   - initDB()            -> initialise (à appeler une fois au démarrage, optionnel)
//   - getSettings()       -> [{ status_id, color, label_mg, label_fr }, ...]
//   - saveSettings(list)  -> met à jour les lignes + persiste
import initSqlJs from 'sql.js'
const STORAGE_KEY = 'newapp_kanban_db'
// Valeurs par défaut (statuts retenus : Nouveau=1, En cours/Attribué=2, Clos=6)
const DEFAULTS = [
  { status_id: 1, color: '#FFD700', label_mg: 'vaovao',    label_fr: 'Nouveau' },
  { status_id: 2, color: '#87CEEB', label_mg: 'efa manao', label_fr: 'En cours' },
  { status_id: 6, color: '#90EE90', label_mg: 'vita',      label_fr: 'Clos' }
]
let SQL = null   // moteur sql.js
let db = null    // instance de base
// ── Initialisation (charge le WASM + recharge ou crée la base) ───────────────
async function ensureDb() {
  if (db) return db
  if (!SQL) {
    SQL = await initSqlJs({
      // Utilisation d'un CDN stable pour récupérer le fichier sql-wasm.wasm
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    })
  }
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    // Recharger la base existante depuis localStorage
    const bytes = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0))
    db = new SQL.Database(bytes)
  } else {
    // Créer une base neuve + table + valeurs par défaut
    db = new SQL.Database()
    db.run(`
      CREATE TABLE IF NOT EXISTS kanban_config (
        status_id INTEGER PRIMARY KEY,
        color     TEXT,
        label_mg  TEXT,
        label_fr  TEXT
      )
    `)
    for (const d of DEFAULTS) {
      db.run('INSERT INTO kanban_config VALUES (?,?,?,?)',
        [d.status_id, d.color, d.label_mg, d.label_fr])
    }
    persist()
  }
  return db
}
// ── Sauvegarde de la base dans localStorage ──────────────────────────────────
function persist() {
  const data = db.export()                         // Uint8Array
  let binary = ''
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i])
  localStorage.setItem(STORAGE_KEY, btoa(binary))
}
// ── API publique ─────────────────────────────────────────────────────────────
/** Initialise la base (optionnel : appelé automatiquement par get/save). */
export async function initDB() {
  await ensureDb()
}
/** Renvoie les réglages des 3 statuts. */
export async function getSettings() {
  await ensureDb()
  const res = db.exec('SELECT status_id, color, label_mg, label_fr FROM kanban_config ORDER BY status_id')
  if (!res.length) return []
  return res[0].values.map((row) => ({
    status_id: row[0],
    color: row[1],
    label_mg: row[2],
    label_fr: row[3]
  }))
}
/** Met à jour les réglages puis persiste. list = [{status_id, color, label_mg, label_fr}] */
export async function saveSettings(list) {
  await ensureDb()
  for (const s of list) {
    db.run(
      'UPDATE kanban_config SET color=?, label_mg=?, label_fr=? WHERE status_id=?',
      [s.color, s.label_mg, s.label_fr ?? '', s.status_id]
    )
  }
  persist()
}
/** Réinitialise les réglages aux valeurs par défaut. */
export async function resetSettings() {
  await ensureDb()
  for (const d of DEFAULTS) {
    db.run(
      'UPDATE kanban_config SET color=?, label_mg=?, label_fr=? WHERE status_id=?',
      [d.color, d.label_mg, d.label_fr, d.status_id]
    )
  }
  persist()
}