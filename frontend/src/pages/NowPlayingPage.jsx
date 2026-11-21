import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import ErrorNotice from '../components/ErrorNotice.jsx'
import LyricsPanel from '../components/LyricsPanel.jsx'
import { fetchRecommendations } from '../lib/music.js'
import { formatDuration } from '../lib/songs.js'
import { usePlayerStore } from '../store/playerStore.js'

const TABS = [
  { id: 'antrean', label: 'Antrean' },
  { id: 'lirik', label: 'Lirik' },
  { id: 'terkait', label: 'Terkait' },
]

function SongRow({ song, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-zinc-900 ${
        active ? 'bg-zinc-900' : ''
      }`}
    >
      <Cover song={song} className="h-10 w-10" />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-medium ${
            active ? 'text-accent-400' : 'text-zinc-100'
          }`}
        >
          {song.title}
        </span>
        <span className="block truncate text-xs text-zinc-400">{song.artist}</span>
      </span>
      <span className="text-xs tabular-nums text-zinc-500">
        {formatDuration(song.duration_sec)}
      </span>
    </button>
  )
}

// Daftar lagu menurut urutan putar (mengikuti Acak); klik untuk loncat ke lagu itu.
function QueueTab() {
  const queue = usePlayerStore((s) => s.queue)
  const order = usePlayerStore((s) => s.order)
  const pos = usePlayerStore((s) => s.pos)
  const playAt = usePlayerStore((s) => s.playAt)
  const boxRef = useRef(null)
  const rowRefs = useRef([])

  // Saat lagu berganti, bawa baris aktif ke tengah panel (tanpa menggulir halaman).
  useEffect(() => {
    const box = boxRef.current
    const row = rowRefs.current[pos]
    if (!box || !row) return
    box.scrollTo({ top: Math.max(0, row.offsetTop - box.clientHeight / 2 + row.clientHeight / 2) })
  }, [pos])

  return (
    <ul ref={boxRef} className="relative h-[28rem] space-y-1 overflow-y-auto">
      {order.map((queueIndex, p) => (
        <li key={`${queue[queueIndex].youtube_id}-${p}`} ref={(el) => (rowRefs.current[p] = el)}>
          <SongRow song={queue[queueIndex]} active={p === pos} onClick={() => playAt(p)} />
        </li>
      ))}
    </ul>
  )
}

// Rekomendasi untuk lagu yang sedang diputar (GET /music/{youtube_id}/recommendations).
// Baru diminta setelah /music/stream berhasil (songId terisi); sebelum itu server menjawab 404.
function RelatedTab({ current }) {
  const songId = usePlayerStore((s) => s.songId)
  const playQueue = usePlayerStore((s) => s.playQueue)

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['recommendations', current.youtube_id],
    queryFn: ({ signal }) => fetchRecommendations(current.youtube_id, signal),
    enabled: songId != null,
    staleTime: 30 * 60 * 1000,
    retry: false, // 429/503 tidak pulih dalam hitungan detik
  })

  if (songId == null) return <p className="text-zinc-400">Menyiapkan lagu…</p>
  if (error) return <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />
  if (!data) return <p className="text-zinc-400">Memuat lagu terkait…</p>
  const songs = data.filter((s) => s.youtube_id !== current.youtube_id)
  if (songs.length === 0) return <p className="text-zinc-400">Belum ada lagu terkait.</p>

  return (
    <ul className="h-[28rem] space-y-1 overflow-y-auto">
      {songs.map((song, i) => (
        <li key={song.youtube_id}>
          {/* Memutar lagu terkait menggantikan antrean dengan daftar ini, mulai dari lagu yang diklik. */}
          <SongRow song={song} active={false} onClick={() => playQueue(songs, i)} />
        </li>
      ))}
    </ul>
  )
}

export default function NowPlayingPage() {
  const current = usePlayerStore((s) => s.queue[s.order[s.pos]])
  const status = usePlayerStore((s) => s.status)
  const autoplay = usePlayerStore((s) => s.autoplay)
  const toggleAutoplay = usePlayerStore((s) => s.toggleAutoplay)
  const [tab, setTab] = useState('antrean')

  if (!current) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Sedang diputar</h1>
        <p className="text-zinc-400">
          Belum ada lagu yang diputar.{' '}
          <Link to="/" className="text-accent-400 hover:underline">
            Pilih lagu di Beranda
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <section className="flex flex-col items-center gap-4">
        <Cover song={current} className="aspect-square w-full max-w-md" />
        <div className="w-full max-w-md space-y-1 text-center">
          <h1 className="truncate text-2xl font-bold">{current.title}</h1>
          <p className="truncate text-zinc-400">
            {status === 'loading' ? 'Memuat…' : current.artist}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800">
          <div role="tablist" aria-label="Panel pemutar" className="flex gap-1">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  tab === id
                    ? 'border-accent-500 text-zinc-100'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoplay}
            onClick={toggleAutoplay}
            className="mb-1 flex items-center gap-2 text-sm text-zinc-300"
          >
            Autoplay
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 rounded-full transition-colors ${
                autoplay ? 'bg-accent-500' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  autoplay ? 'left-[1.1rem]' : 'left-0.5'
                }`}
              />
            </span>
          </button>
        </div>

        <div role="tabpanel">
          {tab === 'antrean' && <QueueTab />}
          {tab === 'lirik' && <LyricsPanel song={current} />}
          {tab === 'terkait' && <RelatedTab current={current} />}
        </div>
      </section>
    </div>
  )
}
