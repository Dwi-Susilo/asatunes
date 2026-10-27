import { api } from './api.js'

// GET /playlists (02_API.md bagian 8): daftar Playlist milik saya, 50 per halaman,
// dengan `meta`. Mengembalikan { items, lastPage }.
export async function fetchPlaylists(signal) {
  const res = await api.get('/playlists', { signal })
  return { items: res.data, lastPage: res.meta?.last_page ?? 1 }
}

// GET /playlists/{id}: Playlist + `songs` (daftar Lagu berurutan) di dalam `data`.
// 403 = bukan pemilik, 404 = tidak ada (dilempar sebagai ApiError).
export async function fetchPlaylist(id, signal) {
  const res = await api.get(`/playlists/${id}`, { signal })
  return res.data
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

// DELETE /playlists/{id}/songs/{song_id} -> 200 (juga bila sudah tidak ada).
export function removeSongFromPlaylist(id, songId) {
  return api.delete(`/playlists/${id}/songs/${songId}`)
}

// POST /playlists/{id}/songs { song_id }: 201 ditambahkan, 200 sudah ada,
// 422 bila lagu tidak ada atau playlist penuh (maks 500).
// Mengembalikan { added: boolean }.
export async function addSongToPlaylist(id, songId) {
  const res = await api.post(`/playlists/${id}/songs`, { song_id: songId })
  return { added: res.message !== 'Lagu sudah ada di playlist.' }
}