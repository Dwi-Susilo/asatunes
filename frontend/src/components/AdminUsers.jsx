import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchAdminUsers } from '../lib/admin.js'
import { useAuthStore } from '../store/authStore.js'
import Avatar from './Avatar.jsx'
import ErrorNotice from './ErrorNotice.jsx'

const DEFAULT_PER_PAGE = 15 // bawaan server; dibaca dari ?per_page= bila ada (1 sampai 100)

function readInt(value, fallback, min, max) {
  const n = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function Badge({ tone, children }) {
  const tones = {
    admin: 'bg-emerald-950 text-emerald-300',
    user: 'bg-zinc-800 text-zinc-300',
    active: 'bg-zinc-800 text-zinc-300',
    blocked: 'bg-red-950 text-red-300',
  }
  return <span className={`rounded px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>
}

export default function AdminUsers() {
  const me = useAuthStore((s) => s.user)
  const [params, setParams] = useSearchParams()

  const page = readInt(params.get('page'), 1, 1, Number.MAX_SAFE_INTEGER)
  const perPage = readInt(params.get('per_page'), DEFAULT_PER_PAGE, 1, 100)

  const { data, isPending, error, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['admin', 'users', me.id, page, perPage],
    queryFn: ({ signal }) => fetchAdminUsers({ page, perPage, signal }),
    placeholderData: keepPreviousData,
    retry: false,
  })

  function goTo(target) {
    setParams((prev) => {
      const next = new URLSearchParams(prev) // per_page ikut terbawa
      if (target <= 1) next.delete('page')
      else next.set('page', String(target))
      return next
    })
  }

  if (isPending) return <p className="text-zinc-400">Memuat…</p>
  if (error && !data) return <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />

  const users = data.data
  const { current_page: current, last_page: last, total } = data.meta

  // Server menjawab 200 dengan daftar kosong untuk halaman di luar jangkauan.
  const outOfRange = users.length === 0 && !isPlaceholderData

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Pengguna</h2>
        <p className="text-sm text-zinc-400">{total} pengguna</p>
      </div>

      {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

      {outOfRange ? (
        <div className="space-y-2 rounded-md border border-zinc-800 p-4 text-sm text-zinc-400">
          <p>Halaman ini kosong.</p>
          <button
            type="button"
            onClick={() => goTo(Math.max(1, last))}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-800"
          >
            Ke halaman terakhir
          </button>
        </div>
      ) : (
        <ul
          className={`divide-y divide-zinc-800 rounded-lg border border-zinc-800 ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3">
              <Avatar name={u.name} url={u.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.name}
                  {u.id === me.id && <span className="ml-2 text-xs text-zinc-500">(Anda)</span>}
                </p>
                <p className="truncate text-xs text-zinc-400">{u.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                <Badge tone={u.role === 'admin' ? 'admin' : 'user'}>
                  {u.role === 'admin' ? 'Admin' : 'Pengguna'}
                </Badge>
                <Badge tone={u.status === 'blocked' ? 'blocked' : 'active'}>
                  {u.status === 'blocked' ? 'Diblokir' : 'Aktif'}
                </Badge>
              </div>
              <span className="hidden w-28 shrink-0 text-right text-xs text-zinc-500 md:block">
                {new Date(u.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {last > 1 && !outOfRange && (
        <nav aria-label="Halaman pengguna" className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current <= 1 || isPlaceholderData}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-zinc-400">
            Halaman {current} dari {last}
          </span>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current >= last || isPlaceholderData}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </nav>
      )}
    </section>
  )
}