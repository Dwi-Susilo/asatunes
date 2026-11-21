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
