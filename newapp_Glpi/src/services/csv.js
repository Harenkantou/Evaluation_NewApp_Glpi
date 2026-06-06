/**
 * Parse CSV content
 * @param {string} text - CSV content
 * @returns {Array<Object>}
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const separator = lines[0].includes(';') ? ';' : ','
  
  const parseLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === separator && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''))
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      let val = values[j] || ''
      row[headers[j]] = val.trim().replace(/^"|"$/g, '')
    }
    data.push(row)
  }

  return data
}

/**
 * Parse CSV files and separate them into elements, tickets, and costs
 * @param {Array<File>} files - Array of CSV File objects
 * @returns {Promise<Object>}
 */
export async function parseCsvFiles(files) {
  const result = { elements: [], tickets: [], costs: [] }

  for (const file of files) {
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length === 0) continue

    // Detect type of file by looking at headers
    const headers = Object.keys(rows[0]).map(h => h.toLowerCase())
    
    // elements: Name, Item_Type, Inventory_Number, etc.
    if (headers.includes('item_type') || headers.includes('inventory_number') || headers.includes('manufacturer')) {
      result.elements.push(...rows)
    } 
    // tickets: Ref_Ticket, Titre, Description, Items
    else if (headers.includes('ref_ticket') || headers.includes('titre') || headers.includes('items')) {
      result.tickets.push(...rows)
    } 
    // costs: Num_Ticket, Time_Cost, Fixed_Cost, Duration_second
    else if (headers.includes('fixed_cost') || headers.includes('time_cost') || headers.includes('num_ticket')) {
      result.costs.push(...rows)
    } else {
      // Fallback: try to guess based on other fields
      if (headers.includes('name')) {
        result.elements.push(...rows)
      }
    }
  }

  return result
}
