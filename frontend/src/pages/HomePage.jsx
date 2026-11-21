import { useQuery } from '@tanstack/react-query'
import ErrorNotice from '../components/ErrorNotice.jsx'
import SongCard from '../components/SongCard.jsx'
import { fetchTrending } from '../lib/music.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayRadio } from '../hooks/usePlaySongs.js'

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const playRadio = usePlayRadio()

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['trending'],
    queryFn: ({ signal }) => fetchTrending(signal),
    staleTime: 10 * 60 * 1000,
    retry: false, // 503 berarti data belum pernah tersedia; mengulang tidak membantu
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {user ? (
            <>
              Halo, <span className="text-accent-400">{user.name}</span>
            </>
          ) : (
            <>
              Selamat datang di <span className="text-accent-400">ASATunes</span>
            </>
          )}
        </h1>
        <p className="text-sm text-zinc-400">Lagu musik terpopuler di Indonesia</p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Trending</h2>

        {isPending && <p className="text-zinc-400">Memuat…</p>}

        {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

        {data && data.length === 0 && <p className="text-zinc-400">Belum ada lagu trending.</p>}

        {data && data.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {data.map((song, index) => (
              <li key={`${song.youtube_id}-${index}`} className="min-w-0">
                <SongCard song={song} onPlay={() => playRadio(song)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}