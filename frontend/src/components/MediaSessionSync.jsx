import { useEffect } from 'react'
import { getAudioElement, previousOrRestart } from '../lib/audioRef.js'
import { thumbnailOf } from '../lib/songs.js'
import { usePlayerStore } from '../store/playerStore.js'

const ACTIONS = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']
const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator

function setHandler(action, handler) {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch {
    /* aksi ini tidak didukung browser */
  }
}

// Tidak menampilkan apa-apa. Menyambungkan pemutar ke tombol media
// (keyboard, headset, layar kunci, kontrol media Chrome).
export default function MediaSessionSync() {
  const current = usePlayerStore((s) => s.queue[s.order[s.pos]])
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  useEffect(() => {
    if (!supported) return
    if (!current) {
      navigator.mediaSession.metadata = null
      return
    }
    const art = thumbnailOf(current)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      artwork: art ? [{ src: art, sizes: '480x360', type: 'image/jpeg' }] : [],
    })
  }, [current])

  useEffect(() => {
    if (!supported) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  useEffect(() => {
    if (!supported) return
    const player = () => usePlayerStore.getState()
    setHandler('play', () => player().setPlaying(true))
    setHandler('pause', () => player().setPlaying(false))
    setHandler('previoustrack', () => previousOrRestart(() => player().prev()))
    setHandler('nexttrack', () => player().next())
    setHandler('seekto', (details) => {
      const audio = getAudioElement()
      if (audio && typeof details.seekTime === 'number') audio.currentTime = details.seekTime
    })
    return () => ACTIONS.forEach((a) => setHandler(a, null))
  }, [])

  return null
}