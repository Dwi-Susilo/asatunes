import { useEffect, useRef } from 'react'
import { fetchRecommendations } from '../lib/music.js'
import { usePlayerStore } from '../store/playerStore.js'

// Autoplay (SRS 6.C, 02_API.md alur 5): saat lagu terakhir di antrean mulai diputar dan
// Autoplay menyala, ambil rekomendasi untuk lagu itu dan tambahkan ke ujung antrean, sehingga
// pemutaran berlanjut tanpa putus. Tidak aktif saat Ulangi: semua lagu (antrean berputar).
// Hanya berjalan setelah /music/stream berhasil (songId terisi), karena server menjawab 404
// untuk lagu yang belum dikenal.
export default function AutoQueue() {
  const autoplay = usePlayerStore((s) => s.autoplay)
  const repeat = usePlayerStore((s) => s.repeat)
  const isLast = usePlayerStore((s) => s.order.length > 0 && s.pos === s.order.length - 1)
  const youtubeId = usePlayerStore((s) => s.queue[s.order[s.pos]]?.youtube_id)
  const songId = usePlayerStore((s) => s.songId)
  const nonce = usePlayerStore((s) => s.nonce)
  const radioFill = usePlayerStore((s) => s.radioFill)
  const requested = useRef(null)

  useEffect(() => {
    // radioFill (lagu dipilih dari daftar): isi "Berikutnya" sekali, tanpa melihat Autoplay atau Ulangi.
    const wantFill = radioFill || (autoplay && repeat !== 'all')
    if (!wantFill || !isLast || songId == null || !youtubeId) return
    const key = `${nonce}:${youtubeId}`
    if (requested.current === key) return
    requested.current = key

    const controller = new AbortController()
    const player = usePlayerStore
    player.setState({ autoState: 'loading' })

    function finish(added) {
      player.setState({ autoState: 'done', radioFill: false })
      const { awaitingMore, next, setPlaying } = player.getState()
      if (!awaitingMore) return
      player.setState({ awaitingMore: false })
      if (added > 0) next()
      else setPlaying(false)
    }

    fetchRecommendations(youtubeId, controller.signal)
      .then((items) => finish(player.getState().appendToQueue(items)))
      .catch(() => {
        if (controller.signal.aborted) return
        if (player.getState().awaitingMore) {
          player.getState().notify('Lagu berikutnya tidak tersedia saat ini.')
        }
        finish(0)
      })

    return () => {
      // Dibatalkan sebelum selesai (lagu berganti, Autoplay dimatikan): boleh diminta lagi.
      if (!controller.signal.aborted && player.getState().autoState === 'loading') {
        controller.abort()
        requested.current = null
        player.setState({ autoState: 'idle' })
      }
    }
  }, [autoplay, repeat, isLast, youtubeId, songId, nonce, radioFill])

  return null
}
