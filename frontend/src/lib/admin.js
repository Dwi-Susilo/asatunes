import { api } from './api.js'

// GET /admin/stats (02_API.md bagian 9): data = { total_users, total_playlists, top_songs }.
// top_songs: sampai 10 Lagu, masing-masing dengan plays_count. Di-cache server 10 menit.
export async function fetchAdminStats(signal) {
  const res = await api.get('/admin/stats', { signal })
  return res.data
}

// GET /admin/users (02_API.md bagian 9): terbaru dulu. Mengembalikan seluruh JSON:
// { data: [User], meta: { current_page, last_page, per_page, total } }.
// per_page 1 sampai 100 (bawaan server 15).
export function fetchAdminUsers({ page, perPage, signal }) {
  return api.get(`/admin/users?page=${page}&per_page=${perPage}`, { signal })
}