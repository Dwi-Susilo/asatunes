import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '../store/playerStore.js'

// Memutar `songs` mulai dari `index`, lalu membuka halaman pemutar /putar (keputusan K6).
export function usePlaySongs() {
  const playQueue = usePlayerStore((s) => s.playQueue)
  const navigate = useNavigate()
  return (songs, index = 0) => {
    playQueue(songs, index)
    navigate('/putar')
  }
}

// Memutar satu lagu dengan "Berikutnya" berisi rekomendasi, lalu membuka /putar (K6).
export function usePlayRadio() {
  const playRadio = usePlayerStore((s) => s.playRadio)
  const navigate = useNavigate()
  return (song) => {
    playRadio(song)
    navigate('/putar')
  }
}
