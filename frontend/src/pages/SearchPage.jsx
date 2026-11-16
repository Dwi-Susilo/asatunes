import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import ErrorNotice from '../components/ErrorNotice.jsx'
import SongList from '../components/SongList.jsx'
import { searchSongs } from '../lib/music.js'
import { usePlayerStore } from '../store/playerStore.js'

const MIN_CHARS = 2

// Kata kunci diisi di kolom cari pada bilah atas (AppLayout) dan dijalankan saat Enter.
export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const playQueue = usePlayerStore((s) => s.playQueue)

  const enabled = q.length >= MIN_CHARS
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['search', q],
    queryFn: ({ signal }) => searchSongs(q, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false, // 429/503 tidak pulih dalam hitungan detik
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{enabled ? `Hasil untuk “${q}”` : 'Cari lagu'}</h1>

      {!enabled && (
        <p className="text-zinc-400">
          Ketik minimal {MIN_CHARS} karakter di kolom cari di atas, lalu tekan Enter.
        </p>
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
