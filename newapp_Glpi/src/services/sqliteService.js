import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_SQLITE_API_URL || '/api/kanban'
})

export async function getSettings() {
  const { data } = await api.get('/settings')
  return data
}

export async function saveSettings(list) {
  const { data } = await api.put('/settings', list)
  return data
}

export async function resetSettings() {
  const { data } = await api.post('/reset')
  return data
}
