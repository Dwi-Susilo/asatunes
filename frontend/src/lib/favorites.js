import { api } from './api.js'

const MAX_PAGES = 25 // 25 x 20 = 500 lagu; lebih dari ini diabaikan

// GET /favorites (02_API.md bagian 7): daftar Lagu + favorited_at, terbaru di atas,
// 20 per halaman, dengan `meta.last_page`. Semua halaman digabung.
export async function fetchAllFavorites(signal) {
  const all = []
  let page = 1
  let last = 1
  do {
    const res = await api.get(`/favorites?page=${page}`, { signal })
    all.push(...res.data)
    last = res.meta?.last_page ?? 1
    page += 1
  } while (page <= last && page <= MAX_PAGES)
  return all
}

// POST /favorites/{song_id}: 201 ditambahkan, 200 sudah ada. Keduanya sukses.
export function addFavorite(songId) {
  return api.post(`/favorites/${songId}`)
}

// DELETE /favorites/{song_id}: 200 walau sudah tidak ada. Idempoten.
export function removeFavorite(songId) {
  return api.delete(`/favorites/${songId}`)
}