import { useEffect, useRef } from 'react'
import { fetchStream } from '../lib/music.js'
import { usePlayerStore } from '../store/playerStore.js'

const DEBOUNCE_MS = 250 // meredam klik "berikutnya" beruntun (pembatas yt-dlp: 20 per menit)
const MAX_RELOADS = 1 // 02_API.md 6.3: gagal -> panggil stream lagi, sekali saja

function playAudio(audio) {
  audio.play().catch((err) => {
    // AbortError: src diganti saat memuat. NotSupportedError: ditangani oleh event 'error'.
    if (err.name === 'AbortError' || err.name === 'NotSupportedError') return
    // NotAllowedError dan sejenisnya: browser menolak putar otomatis.
    usePlayerStore.getState().setPlaying(false)
  })
}

// Satu-satunya pemilik elemen <audio>. Store pemutar tetap sumber kebenaran
// untuk lagu aktif dan status putar/jeda; komponen ini menyelaraskan audio dengannya.
export default function AudioPlayer() {
  const audioRef = useRef(null)
  const youtubeId = usePlayerStore((s) => s.queue[s.order[s.pos]]?.youtube_id)
  const nonce = usePlayerStore((s) => s.nonce)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const session = useRef({
    ready: false, // play_url sudah terpasang di elemen audio
    expiresAt: 0,
    reloads: 0,
    failStreak: 0,
    queueRef: null,
  })

  // Efek 1: setiap lagu aktif berganti (atau dimuat ulang lewat nonce), ambil play_url baru.
  useEffect(() => {
    const audio = audioRef.current
    const st = session.current
    const player = usePlayerStore

    st.ready = false
    st.expiresAt = 0
    audio.pause() // hentikan lagu sebelumnya selagi lagu baru dimuat

    if (!youtubeId) {
      audio.removeAttribute('src')
      audio.load()
      return
    }

    const { queue } = player.getState()
    if (st.queueRef !== queue) {
      st.queueRef = queue // antrean baru: hitungan gagal beruntun mulai dari nol
      st.failStreak = 0
    }
    st.reloads = 0
    player.setState({ status: 'loading', songId: null })

    const controller = new AbortController()

    function attach(data) {
      if (controller.signal.aborted) return
      st.expiresAt = Date.parse(data.expires_at)
      st.ready = true
      audio.src = data.play_url // apa adanya: jangan ubah host, jalur, atau parameter
      player.setState({ songId: data.song_id })
      if (player.getState().isPlaying) playAudio(audio)
    }

    function fail(err) {
      if (controller.signal.aborted) return // dibatalkan sengaja (lagu berganti)
      st.ready = false
      const status = err?.status
      player.setState({ status: 'error', songId: null })

      if (status === 401) return // sesi sudah dibersihkan oleh modul api

      const stopWith = (message) => {
        player.getState().notify(message)
        player.getState().setPlaying(false)
      }
      if (status === 429) return stopWith('Terlalu banyak permintaan. Tunggu sekitar satu menit.')
      if (status === 503) return stopWith('Layanan musik sedang tidak tersedia.')
      if (status === 0) return stopWith('Tidak dapat terhubung ke server.')

      // 502, audio gagal, dan lainnya: lewati lagu ini (SRS 2.C).
      player.getState().notify('Lagu tidak dapat diputar saat ini.')
      st.failStreak += 1
      if (st.failStreak < player.getState().queue.length && player.getState().next()) return
      player.getState().setPlaying(false) // ujung antrean, atau semua lagu gagal
    }

    const onError = () => {
      if (!st.ready) return
      st.ready = false
      if (st.reloads < MAX_RELOADS) {
        st.reloads += 1
        player.setState({ status: 'loading' })
        fetchStream(youtubeId, controller.signal).then(attach).catch(fail)
        return
      }
      fail({ status: 502 })
    }
    const onCanPlay = () => player.setState({ status: 'ready' })
    const onWaiting = () => player.setState({ status: 'loading' })
    const onPlaying = () => {
      st.failStreak = 0
      player.setState({ status: 'ready' })
    }

    audio.addEventListener('error', onError)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)

    const timer = setTimeout(() => {
      fetchStream(youtubeId, controller.signal).then(attach).catch(fail)
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
      audio.removeEventListener('error', onError)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
    }
    // nonce hanya pemicu muat ulang (lagu sama dipilih lagi, kedaluwarsa, coba lagi).
  }, [youtubeId, nonce])

  // Efek 2: selaraskan putar/jeda dari store ke elemen audio.
  useEffect(() => {
    const audio = audioRef.current
    const st = session.current

    if (!isPlaying) {
      if (st.ready) audio.pause()
      return
    }
    if (st.ready) {
      if (Date.now() >= st.expiresAt) {
        // URL bertanda tangan sudah kedaluwarsa: muat ulang (posisi kembali ke awal).
        usePlayerStore.setState((s) => ({ nonce: s.nonce + 1 }))
      } else {
        playAudio(audio)
      }
      return
    }
    // Belum siap. Bila sebelumnya gagal dan pengguna menekan putar, coba lagi.
    if (usePlayerStore.getState().status === 'error') {
      usePlayerStore.setState((s) => ({ nonce: s.nonce + 1 }))
    }
  }, [isPlaying])

  return (
    <audio
      ref={audioRef}
      preload="auto"
      // 38b: lagu selesai -> kembali ke ikon putar. Auto-next dibuat di 38c.
      onEnded={() => usePlayerStore.getState().setPlaying(false)}
    />
  )
}