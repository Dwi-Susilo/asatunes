import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUserActions } from '../hooks/useUserActions.js'
import { fetchAdminUsers } from '../lib/admin.js'
import { useAuthStore } from '../store/authStore.js'
import Avatar from './Avatar.jsx'
import ErrorNotice from './ErrorNotice.jsx'

const DEFAULT_PER_PAGE = 15 // bawaan server; dibaca dari ?per_page= bila ada (1 sampai 100)

// Aksi yang meminta konfirmasi. 'unblock' langsung berjalan (tidak merusak apa pun).
const ASK = {
  block: {
    ask: (name) => `Blokir ${name}? Semua sesinya akan keluar seketika.`,
    yes: 'Ya, blokir',
    danger: true,
  },
  promote: {
    ask: (name) => `Jadikan ${name} admin? Ia akan bisa mengelola semua pengguna.`,
    yes: 'Ya, jadikan admin',
    danger: false,
  },
  demote: {
    ask: (name) => `Turunkan ${name} menjadi pengguna biasa?`,
    yes: 'Ya, turunkan',
    danger: false,
  },
  remove: {
    ask: (name) => `Hapus ${name}? Akun, sesi, dan foto profilnya dihapus permanen.`,
    yes: 'Ya, hapus',
    danger: true,
  },
}

const BTN = 'rounded-md border px-2.5 py-1 text-xs disabled:opacity-50'
const BTN_NORMAL = `${BTN} border-zinc-700 text-zinc-200 hover:bg-zinc-800`
const BTN_DANGER = `${BTN} border-red-800 text-red-300 hover:bg-red-950`

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

function UserActions({ user, confirmAction, disabled, onStart, onConfirm, onCancel }) {
  if (confirmAction) {
    const text = ASK[confirmAction]
    return (
      <div className="flex flex-wrap items-center gap-2 pl-11">
        <p className="text-sm text-zinc-300">{text.ask(user.name)}</p>
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className={text.danger ? BTN_DANGER : BTN_NORMAL}
        >
          {text.yes}
        </button>
        <button type="button" disabled={disabled} onClick={onCancel} className={BTN_NORMAL}>
          Batal
        </button>
      </div>
    )
  }

  const blocked = user.status === 'blocked'
  const isAdmin = user.role === 'admin'

  return (
    <div className="flex flex-wrap gap-2 pl-11">
      {blocked ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onStart('unblock')}
          aria-label={`Buka blokir ${user.name}`}
          className={BTN_NORMAL}
        >
          Buka blokir
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onStart('block')}
          aria-label={`Blokir ${user.name}`}
          className={BTN_DANGER}
        >
          Blokir
        </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStart(isAdmin ? 'demote' : 'promote')}
        aria-label={`${isAdmin ? 'Jadikan pengguna biasa' : 'Jadikan admin'}: ${user.name}`}
        className={BTN_NORMAL}
      >
        {isAdmin ? 'Jadikan pengguna biasa' : 'Jadikan admin'}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStart('remove')}
        aria-label={`Hapus akun ${user.name}`}
        className={BTN_DANGER}
      >
        Hapus
      </button>
    </div>
  )
}

export default function AdminUsers() {
  const me = useAuthStore((s) => s.user)
  const [params, setParams] = useSearchParams()
  const [confirming, setConfirming] = useState(null) // { userId, action } atau null
  const { run, isPending: acting, feedback, clearFeedback } = useUserActions()

  const page = readInt(params.get('page'), 1, 1, Number.MAX_SAFE_INTEGER)
  const perPage = readInt(params.get('per_page'), DEFAULT_PER_PAGE, 1, 100)

  const { data, isPending, error, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ['admin', 'users', me.id, page, perPage],
    queryFn: ({ signal }) => fetchAdminUsers({ page, perPage, signal }),
    placeholderData: keepPreviousData,
    retry: false,
  })

  function goTo(target) {
    clearFeedback()
    setConfirming(null)
    setParams((prev) => {
      const next = new URLSearchParams(prev) // per_page ikut terbawa
      if (target <= 1) next.delete('page')
      else next.set('page', String(target))
      return next
    })
  }

  function startAction(user, action) {
    if (action === 'unblock') {
      setConfirming(null)
      run({ user, action })
    } else {
      setConfirming({ userId: user.id, action })
    }
  }

  function confirmAction(user) {
    const action = confirming?.action
    setConfirming(null)
    if (action) run({ user, action })
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

      {feedback && (
        <p
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-md p-3 text-sm ${
            feedback.type === 'error'
              ? 'bg-red-950 text-red-300'
              : 'bg-emerald-950 text-emerald-300'
          }`}
        >
          {feedback.text}
        </p>
      )}

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
            <li key={u.id} className="space-y-2 p-3">
              <div className="flex items-center gap-3">
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
              </div>

              {/* Akun sendiri tanpa tombol (kemudahan; server tetap menolak dengan 422). */}
              {u.id !== me.id && (
                <UserActions
                  user={u}
                  confirmAction={confirming?.userId === u.id ? confirming.action : null}
                  disabled={acting}
                  onStart={(action) => startAction(u, action)}
                  onConfirm={() => confirmAction(u)}
                  onCancel={() => setConfirming(null)}
                />
              )}
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