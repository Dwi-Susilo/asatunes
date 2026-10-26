import { useQuery } from '@tanstack/react-query'
import ErrorNotice from '../components/ErrorNotice.jsx'
import SongList from '../components/SongList.jsx'
import { fetchTrending } from '../lib/music.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const playQueue = usePlayerStore((s) => s.playQueue)

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
          Halo, <span className="text-emerald-400">{user.name}</span>
        </h1>
        <p className="text-sm text-zinc-400">Lagu musik terpopuler di Indonesia</p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Trending</h2>

        {isPending && <p className="text-zinc-400">Memuat…</p>}

        {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

        {data && data.length === 0 && <p className="text-zinc-400">Belum ada lagu trending.</p>}

        {data && data.length > 0 && (
          <SongList songs={data} onPlay={(index) => playQueue(data, index)} />
        )}
      </section>
    </div>
  )
}