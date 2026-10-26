import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'
import AudioPlayer from './AudioPlayer.jsx'
import PlayerBar from './PlayerBar.jsx'

// Menu bertambah seiring langkah: Playlist (42), dst.
const NAV_ITEMS = [
  { to: '/', label: 'Beranda' },
  { to: '/cari', label: 'Cari' },
  { to: '/favorit', label: 'Favorit' },
]

export default function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hasQueue = usePlayerStore((s) => s.queue.length > 0)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout() // ProtectedRoute mengalihkan ke /login begitu token hilang.
  }

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
          {logoutButton}
        </div>
        <nav className="mt-2 flex gap-1">
          {NAV_ITEMS.map((item) => (
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
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="space-y-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-zinc-400">{user.email}</p>
          </div>
          {logoutButton}
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