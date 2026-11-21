import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { usePlaylists } from '../hooks/usePlaylists.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'
import Avatar from './Avatar.jsx'
import BottomNav from './BottomNav.jsx'
import {
  HeartFilledIcon,
  HistoryIcon,
  HomeIcon,
  LibraryIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  UserIcon,
} from './Icons.jsx'
import PlaylistCover from './PlaylistCover.jsx'

const MIN_CHARS = 2 // sama dengan batas server untuk pencarian

// Terbuka untuk Pengunjung (SRS 3.1)
const PUBLIC_NAV_ITEMS = [{ to: '/', label: 'Beranda', Icon: HomeIcon }]

// Pengunjung di ponsel: jalan ke halaman masuk lewat menu bawah
const GUEST_LOGIN_ITEM = { to: '/login', label: 'Masuk', Icon: UserIcon }

// Fitur akun: hanya tampil bila sudah login
const ACCOUNT_NAV_ITEMS = [
  { to: '/favorit', label: 'Favorit', Icon: HeartFilledIcon },
  { to: '/riwayat', label: 'Riwayat', Icon: HistoryIcon },
  { to: '/playlist', label: 'Playlist', Icon: LibraryIcon },
  { to: '/profil', label: 'Profil', Icon: UserIcon },
]

// Hanya untuk admin (Langkah 44). Penentu akses tetap server.
const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin', Icon: ShieldIcon }

// Kolom cari di bilah atas. Pencarian dijalankan saat Enter (bukan saat mengetik),
// supaya tidak menghabiskan jatah yt-dlp.
function SearchBox({ initial }) {
  const [text, setText] = useState(initial)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    const value = text.trim()
    if (value.length >= MIN_CHARS) navigate(`/cari?q=${encodeURIComponent(value)}`)
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="relative min-w-0 flex-1 md:max-w-xl">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={100}
        placeholder="Cari lagu atau artis"
        aria-label="Kata kunci pencarian"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-accent-500"
      />
    </form>
  )
}

function SidebarPlaylists({ user }) {
  const { playlists, isPending, error, refetch } = usePlaylists()

  if (!user) return null
  if (isPending) return <p className="px-3 text-xs text-zinc-400">Memuat playlist…</p>
  if (error) {
    return (
      <p className="px-3 text-xs text-zinc-400">
        Playlist gagal dimuat.{' '}
        <button type="button" onClick={() => refetch()} className="text-accent-400 hover:underline">
          Coba lagi
        </button>
      </p>
    )
  }
  if (playlists.length === 0) {
    return <p className="px-3 text-xs text-zinc-400">Belum ada playlist.</p>
  }

  return (
    <ul className="space-y-1">
      {playlists.map((p) => (
        <li key={p.id}>
          <NavLink
            to={`/playlist/${p.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 ${
                isActive ? 'bg-zinc-800' : 'hover:bg-zinc-900'
              }`
            }
          >
            <PlaylistCover thumbnails={p.cover_thumbnails} className="h-9 w-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{p.title}</span>
              <span className="block truncate text-xs text-zinc-400">{p.songs_count} lagu</span>
            </span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export default function AppLayout() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const restoreError = useAuthStore((s) => s.restoreError)
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const logout = useAuthStore((s) => s.logout)
  const hasQueue = usePlayerStore((s) => s.queue.length > 0)
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const [params] = useSearchParams()

  const isGuest = !token
  // Kata kunci di kolom cari mengikuti alamat saat di halaman pencarian; di halaman lain kosong.
  const currentQuery = location.pathname === '/cari' ? (params.get('q') ?? '') : ''

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
    <div className="flex shrink-0 items-center gap-2">
      <Link
        to="/register"
        state={{ from: location }}
        className="hidden rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 sm:block"
      >
        Daftar
      </Link>
      <Link
        to="/login"
        state={{ from: location }}
        className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-accent-400"
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
      className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-60"
    >
      {loggingOut ? 'Keluar…' : 'Keluar'}
    </button>
  )

  const accountActions = isGuest ? (
    guestActions
  ) : (
    <div className="flex shrink-0 items-center gap-2">
      {user ? (
        <Link to="/profil" aria-label="Profil" title={user.name}>
          <Avatar name={user.name} url={user.avatar_url} />
        </Link>
      ) : restoreError ? (
        <button
          type="button"
          onClick={restoreSession}
          className="text-xs text-accent-400 hover:underline"
        >
          Profil gagal dimuat. Coba lagi
        </button>
      ) : null}
      {logoutButton}
    </div>
  )

  const linkClass = ({ isActive }) =>
    `flex items-center gap-4 rounded-md px-3 py-2.5 ${
      isActive ? 'bg-zinc-800 font-medium text-zinc-100' : 'text-zinc-300 hover:bg-zinc-900'
    }`

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Bilah atas: logo, kolom cari, aksi akun */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
        <Link to="/" className="shrink-0 text-xl font-bold text-accent-500 md:w-44">
          ASATunes
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <SearchBox key={currentQuery} initial={currentQuery} />
        </div>
        {accountActions}
      </header>

      <div className="md:flex">
        {/* Layar lebar: sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-800 p-3 md:sticky md:top-14 md:flex md:h-[calc(100vh-3.5rem)]">
          <nav className="space-y-1">
            {navItems.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end className={linkClass}>
                <Icon className="h-6 w-6" />
                {label}
              </NavLink>
            ))}
          </nav>

          <hr className="border-zinc-800" />

          {isGuest ? (
            <div className="space-y-3 px-1">
              <Link
                to="/login"
                state={{ from: location }}
                className="flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800"
              >
                <PlusIcon className="h-5 w-5" />
                Playlist baru
              </Link>
              <p className="text-xs text-zinc-400">
                <Link to="/login" state={{ from: location }} className="text-accent-400 hover:underline">
                  Masuk
                </Link>{' '}
                untuk membuat playlist dan menyimpan lagu favorit.
              </p>
            </div>
          ) : (
            <>
              <Link
                to="/playlist?baru=1"
                className="mx-1 flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800"
              >
                <PlusIcon className="h-5 w-5" />
                Playlist baru
              </Link>
              <SidebarPlaylists user={user} />
            </>
          )}
        </aside>

        {/* Ruang bawah di ponsel: menu bawah (3.5rem) dan, bila ada lagu, bilah pemutar di atasnya. */}
        <main
          className={`min-w-0 flex-1 p-4 md:p-8 ${hasQueue ? 'pb-52 md:pb-32' : 'pb-20 md:pb-8'}`}
        >
          <Outlet />
        </main>
      </div>

      {/* Ponsel: Pengunjung hanya punya Beranda dan Masuk; Pengguna dan Admin memakai menu penuh. */}
      <BottomNav items={isGuest ? [...PUBLIC_NAV_ITEMS, GUEST_LOGIN_ITEM] : navItems} />

    </div>
  )
}
