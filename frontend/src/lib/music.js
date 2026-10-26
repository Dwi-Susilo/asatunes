import { api } from './api.js'

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