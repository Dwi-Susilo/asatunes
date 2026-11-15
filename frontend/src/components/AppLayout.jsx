import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'
import Avatar from './Avatar.jsx'
import AudioPlayer from './AudioPlayer.jsx'
import PlayerBar from './PlayerBar.jsx'

// Terbuka untuk Pengunjung (SRS 3.1)
const PUBLIC_NAV_ITEMS = [
  { to: '/', label: 'Beranda' },
  { to: '/cari', label: 'Cari' },
]

// Fitur akun: hanya tampil bila sudah login
const ACCOUNT_NAV_ITEMS = [
  { to: '/favorit', label: 'Favorit' },
  { to: '/playlist', label: 'Playlist' },
  { to: '/profil', label: 'Profil' },
]

// Hanya untuk admin (Langkah 44). Penentu akses tetap server.
const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin' }

export default function AppLayout() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const restoreError = useAuthStore((s) => s.restoreError)
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const logout = useAuthStore((s) => s.logout)
  const hasQueue = usePlayerStore((s) => s.queue.length > 0)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()

  const isGuest = !token

  // Setelah refresh halaman: token ada, user belum. Halaman publik tetap tampil selama profil dimuat.
  useEffect(() => {
    restoreSession()
  }, [token, user, restoreSession])

  let navItems = isGuest ? PUBLIC_NAV_ITEMS : [...PUBLIC_NAV_ITEMS, ...ACCOUNT_NAV_ITEMS]
  if (user?.role === 'admin') navItems = [...navItems, ADMIN_NAV_ITEM]

  async function handleLogout() {
    setLoggingOut(true)
    // Di halaman akun, ProtectedRoute mengalihkan ke /login; di halaman publik pengguna tetap di tempat.
    await logout()
    setLoggingOut(false)
  }

  const guestActions = (
    <div className="flex items-center gap-2">
      <Link
        to="/register"
        state={{ from: location }}
        className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
      >
        Daftar
      </Link>
      <Link
        to="/login"
        state={{ from: location }}
        className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
      >
        Masuk
      </Link>
    </div>
  )

  const logoutButton = (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-60"
    >
      {loggingOut ? 'Keluar…' : 'Keluar'}
    </button>
  )

  const accountActions = isGuest ? guestActions : logoutButton

  const linkClass = ({ isActive }) =>
    `block rounded-md px-3 py-2 ${
      isActive ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-900'
    }`

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 md:flex">
      {/* Layar sempit: bilah atas */}
      <header className="border-b border-zinc-800 px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-emerald-400">ASATunes</span>
          {accountActions}
        </div>
        <nav className="mt-2 flex flex-wrap gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Layar lebar: sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-zinc-800 p-4 md:sticky md:top-0 md:flex md:h-screen">
        <div>
          <p className="mb-6 text-2xl font-bold text-emerald-400">ASATunes</p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="space-y-3">
          {isGuest ? (
            guestActions
          ) : (
            <>
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} url={user.avatar_url} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-zinc-400">{user.email}</p>
                  </div>
                </div>
              ) : restoreError ? (
                <div className="space-y-1 text-xs text-zinc-400">
                  <p>Profil gagal dimuat.</p>
                  <button
                    type="button"
                    onClick={restoreSession}
                    className="text-emerald-400 hover:underline"
                  >
                    Coba lagi
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Memuat profil…</p>
              )}
              {logoutButton}
            </>
          )}
        </div>
      </aside>

      <main className={`min-w-0 flex-1 p-4 md:p-8 ${hasQueue ? 'pb-32' : 'pb-8'}`}>
        <Outlet />
      </main>

      <AudioPlayer />
      <PlayerBar />
    </div>
  )
}