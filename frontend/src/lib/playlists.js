import { api } from './api.js'

// GET /playlists (02_API.md bagian 8): daftar Playlist milik saya, 50 per halaman,
// dengan `meta`. Mengembalikan { items, lastPage }.
export async function fetchPlaylists(signal) {
  const res = await api.get('/playlists', { signal })
  return { items: res.data, lastPage: res.meta?.last_page ?? 1 }
}

// POST /playlists -> 201, data: Playlist baru.
export async function createPlaylist({ title, description }) {
  const res = await api.post('/playlists', { title, description })
  return res.data
}

// PATCH /playlists/{id} -> 200, data: Playlist terbaru.
export async function updatePlaylist(id, { title, description }) {
  const res = await api.patch(`/playlists/${id}`, { title, description })
  return res.data
}

// DELETE /playlists/{id} -> 200. Lagunya sendiri tidak ikut terhapus.
export function deletePlaylist(id) {
  return api.delete(`/playlists/${id}`)
}