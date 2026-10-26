import { api } from './api.js'

// GET /music/stream (02_API.md 6.2). Mengembalikan { song_id, play_url, expires_at }.
// Panggilan pertama untuk lagu baru sekitar 6 detik; sesudahnya cepat (cache server 90 menit).
export async function fetchStream(youtubeId, signal) {
  const res = await api.get(`/music/stream?query=${encodeURIComponent(youtubeId)}`, { signal })
  return res.data
}