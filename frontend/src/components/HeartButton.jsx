import { useFavorites } from '../hooks/useFavorites.js'
import { useRequireLogin } from '../hooks/useRequireLogin.js'
import { usePlayerStore } from '../store/playerStore.js'

// `labeled`: tombol berlabel teks "Favorit" (dipakai di halaman /putar); tanpa itu hanya ikon.
export default function HeartButton({ labeled = false }) {
  const songId = usePlayerStore((s) => s.songId) // diisi dari GET /music/stream
  const { ids, isPending, isToggling, toggle } = useFavorites()
  const { isGuest, goToLogin } = useRequireLogin()

  // Pengunjung tidak memuat favorit; tombol hanya mengarahkan ke login.
  const ready = songId != null && (isGuest || !isPending)
  const active = !isGuest && ready && ids.has(songId)

  let label = 'Tambah ke favorit'
  if (isGuest) label = 'Masuk untuk menambah ke favorit'
  else if (!ready) label = 'Favorit belum siap'
  else if (active) label = 'Hapus dari favorit'

  return (
    <button
      type="button"
      onClick={() => (isGuest ? goToLogin() : toggle(songId, !active))}
      disabled={!ready || isToggling}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={
        labeled
          ? `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60 ${
              active
                ? 'border-accent-500 text-accent-400'
                : 'border-zinc-600 text-zinc-100'
            }`
          : `rounded-full p-2 hover:bg-zinc-800 disabled:opacity-40 ${
              active ? 'text-accent-400' : ''
            }`
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 21s-7-4.4-9.3-8.6C1 9.2 2.6 5.5 6.1 5.1c2-.2 3.7.8 4.6 2.2l1.3 1.9 1.3-1.9c.9-1.4 2.6-2.4 4.6-2.2 3.5.4 5.1 4.1 3.4 7.3C19 16.6 12 21 12 21z" />
      </svg>
      {labeled && 'Favorit'}
    </button>
  )
}