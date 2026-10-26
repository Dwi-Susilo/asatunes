import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ErrorNotice from '../components/ErrorNotice.jsx'
import SongList from '../components/SongList.jsx'
import { searchSongs } from '../lib/music.js'
import { usePlayerStore } from '../store/playerStore.js'

const DEBOUNCE_MS = 700 // pembatas yt-dlp: 20 per menit
const MIN_CHARS = 2

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const playQueue = usePlayerStore((s) => s.playQueue)

  const [text, setText] = useState(q)

  // Ketik -> tunggu berhenti -> perbarui alamat (replace: tidak menumpuk riwayat).
  useEffect(() => {
    const value = text.trim()
    if (value === q) return
    const timer = setTimeout(() => {
      setParams(value.length >= MIN_CHARS ? { q: value } : {}, { replace: true })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, q, setParams])

  const enabled = q.length >= MIN_CHARS
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) => searchSongs(q, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false, // 429/503 tidak pulih dalam hitungan detik
  })

  function handleSubmit(e) {
    e.preventDefault()
    const value = text.trim()
    if (value.length >= MIN_CHARS) setParams({ q: value }, { replace: true })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cari lagu</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
          placeholder="Judul lagu atau nama artis"
          aria-label="Kata kunci pencarian"
          autoFocus
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </form>

      {!enabled && (
        <p className="text-zinc-400">Ketik minimal {MIN_CHARS} karakter untuk mencari.</p>
      )}

      {enabled && isFetching && !data && <p className="text-zinc-400">Mencari…</p>}

      {enabled && error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

      {enabled && data && data.length === 0 && (
        <p className="text-zinc-400">
          Tidak ada hasil untuk &ldquo;{q}&rdquo;. Hasil disaring di server (durasi 1 sampai 10
          menit, tanpa karaoke atau kompilasi), jadi coba kata kunci lain.
        </p>
      )}

      {enabled && data && data.length > 0 && (
        <SongList songs={data} onPlay={(index) => playQueue(data, index)} />
      )}
    </div>
  )
}