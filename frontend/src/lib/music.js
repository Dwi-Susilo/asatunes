import { ApiError, api } from './api.js'

// GET /music/stream (02_API.md 6.2). Mengembalikan { song_id, play_url, expires_at }.
// Panggilan pertama untuk lagu baru sekitar 6 detik; sesudahnya cepat (cache server 90 menit).
export async function fetchStream(youtubeId, signal) {
  const res = await api.get(`/music/stream?query=${encodeURIComponent(youtubeId)}`, { signal })
  return res.data
}

// GET /music/trending (02_API.md 6.4). Daftar Kandidat lagu (tanpa `id`), sampai 25.
// 503 "Data trending belum tersedia." dilempar sebagai ApiError.
export async function fetchTrending(signal) {
  const res = await api.get('/music/trending', { signal })
  return res.data
}

// GET /music/search?q= (02_API.md 6.1). Daftar Kandidat lagu yang sudah disaring
// server; bisa kurang dari 10 atau kosong. 503 = yt-dlp tidak tersedia.
export async function searchSongs(q, signal) {
  const res = await api.get(`/music/search?q=${encodeURIComponent(q)}`, { signal })
  return res.data
}

// GET /music/lyrics (02_API.md 6.5). Mengembalikan { synced, plain, instrumental },
// atau null bila lirik tidak ditemukan (404 itu hasil biasa, bukan error).
// 502 "Layanan lirik sedang tidak tersedia." dilempar sebagai ApiError.
export async function fetchLyrics({ title, artist, duration }, signal) {
  const params = new URLSearchParams({ title, artist })
  if (Number.isInteger(duration) && duration >= 1 && duration <= 3600) {
    params.set('duration', String(duration))
  }
  try {
    const res = await api.get(`/music/lyrics?${params}`, { signal })
    return res.data
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}