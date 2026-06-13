// src/services/export.js
// Service d'export de données (CSV / JSON) — exemple d'amélioration.

/**
 * Construit un Blob CSV à partir de lignes et d'une liste de colonnes.
 * @param {Array<Object>} rows     les données (objets)
 * @param {Array<string>} columns  les clés à exporter (= colonnes du CSV)
 * @returns {Blob} blob CSV (text/csv)
 */
export function exportToCsv(rows, columns) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = columns.map(escape).join(',')
  const lines = (rows || []).map((r) => columns.map((c) => escape(r[c])).join(','))
  const content = [header, ...lines].join('\n')
  return new Blob([content], { type: 'text/csv;charset=utf-8' })
}

/**
 * Construit un Blob JSON.
 * @param {any} data
 * @returns {Blob} blob JSON (application/json)
 */
export function exportToJson(data) {
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 * @param {Blob} blob
 * @param {string} filename  nom du fichier téléchargé
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
