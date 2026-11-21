import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'
import Avatar from './Avatar.jsx'
import { HomeIcon, LibraryIcon, ShieldIcon } from './Icons.jsx'

// Menu Dashboard Admin (SRS 7.D): Kelola User dan Statistik.
const ADMIN_NAV = [
  { to: '/admin/pengguna', label: 'Kelola User', Icon: LibraryIcon },
  { to: '/admin/statistik', label: 'Statistik', Icon: ShieldIcon },
]

// Tata letak terpisah dari antarmuka Pengguna. Dipasang di dalam ProtectedRoute dan
// AdminRoute. Pemutar (AudioPlayer, PlayerBar) ada di tingkat App, jadi lagu yang sedang
// diputar tetap berjalan dan dapat dikendalikan dari sini.
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hasQueue = usePlayerStore((s) => s.queue.length > 0)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout() // ProtectedRoute mengalihkan ke /login setelah token dibuang
    setLoggingOut(false)
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-4 rounded-md px-3 py-2.5 ${
      isActive ? 'bg-zinc-800 font-medium text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'
    }`

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
        <span className="text-xl font-bold text-accent-500">
          ASATunes <span className="text-sm font-medium text-zinc-400">Admin</span>
        </span>
        <div className="flex items-center gap-2">
          {user && <Avatar name={user.name} url={user.avatar_url} />}
          <span className="hidden text-sm text-zinc-300 sm:block">{user?.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-60"
          >
            {loggingOut ? 'Keluar…' : 'Keluar'}
          </button>
        </div>
      </header>

      {/* Layar sempit: menu mendatar */}
      <nav aria-label="Menu admin" className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-2 py-1 md:hidden">
        {ADMIN_NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} className={linkClass}>
            {label}
          </NavLink>
        ))}
        <NavLink to="/" className={linkClass}>
          Kembali ke pemutar
        </NavLink>
      </nav>

      <div className="md:flex">
        <aside className="hidden w-60 shrink-0 flex-col gap-4 border-r border-zinc-800 p-3 md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)]">
          <nav aria-label="Menu admin" className="space-y-1">
            {ADMIN_NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            ))}
          </nav>
          <hr className="border-zinc-800" />
          {/* Admin boleh memakai fitur Pengguna (pewarisan aktor): jalan kembali ke pemutar. */}
          <NavLink to="/" className={linkClass}>
            <HomeIcon className="h-6 w-6" />
            Kembali ke pemutar
          </NavLink>
        </aside>

        <main className={`min-w-0 flex-1 p-4 md:p-8 ${hasQueue ? 'pb-32' : 'pb-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
