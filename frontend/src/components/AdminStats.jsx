import { useQuery } from '@tanstack/react-query'
import { fetchAdminStats } from '../lib/admin.js'
import { useAuthStore } from '../store/authStore.js'
import Cover from './Cover.jsx'
import ErrorNotice from './ErrorNotice.jsx'

const number = new Intl.NumberFormat('id-ID')

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-emerald-400">{number.format(value)}</p>
    </div>
  )
}

export default function AdminStats() {
  const userId = useAuthStore((s) => s.user.id)
  const { data, isPending, error, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'stats', userId],
    queryFn: ({ signal }) => fetchAdminStats(signal),
    retry: false,
  })

  if (isPending) return <p className="text-zinc-400">Memuat…</p>
  if (error && !data) return <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4">
        <StatCard label="Total pengguna" value={data.total_users} />
        <StatCard label="Total playlist" value={data.total_playlists} />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Lagu terpopuler</h2>
        <p className="mb-3 text-xs text-zinc-500">Angka diperbarui server setiap 10 menit.</p>

        {data.top_songs.length === 0 ? (
          <p className="text-zinc-400">Belum ada lagu yang pernah diputar.</p>
        ) : (
          <ol className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {data.top_songs.map((song, index) => (
              <li key={song.id} className="flex items-center gap-3 p-3">
                <span className="w-6 text-center text-sm text-zinc-500">{index + 1}</span>
                <Cover song={song} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{song.title}</p>
                  <p className="truncate text-xs text-zinc-400">{song.artist}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">
                  {number.format(song.plays_count)}× diputar
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}