import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists.js'
import { describeError } from '../lib/errors.js'
import { addSongToPlaylist } from '../lib/playlists.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'

export default function AddToPlaylistButton() {
  const songId = usePlayerStore((s) => s.songId) // diisi dari GET /music/stream
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const { playlists, isPending, error } = usePlaylists()
  // Menyimpan song_id tempat menu dibuka. Menu dianggap terbuka hanya bila
  // lagu aktif masih sama, jadi berganti lagu otomatis menutupnya (tanpa efek).
  const [openFor, setOpenFor] = useState(null)
  const open = openFor !== null && openFor === songId
  const wrapRef = useRef(null)

  const add = useMutation({
    mutationFn: ({ playlistId }) => addSongToPlaylist(playlistId, songId),
    onSuccess: (result, { title }) => {
      const notify = usePlayerStore.getState().notify
      notify(result.added ? `Ditambahkan ke "${title}".` : `Sudah ada di "${title}".`)
      queryClient.invalidateQueries({ queryKey: ['playlists', userId] })
      queryClient.invalidateQueries({ queryKey: ['playlist', userId] })
    },
    onError: (err) =>
      usePlayerStore.getState().notify(describeError(err).message || 'Gagal menambah lagu.'),
  })

  // Tutup dengan Escape atau klik di luar menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpenFor(null)
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenFor(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const ready = songId != null
  const label = ready ? 'Tambah ke playlist' : 'Playlist belum siap'

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpenFor(open ? null : songId)}
        disabled={!ready}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className={`rounded-full p-2 hover:bg-zinc-800 disabled:opacity-40 ${
          open ? 'text-emerald-400' : ''
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M3 6h12v2H3zM3 10h12v2H3zM3 14h8v2H3zM17 10v4h-4v2h4v4h2v-4h4v-2h-4v-4z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-2 max-h-64 w-56 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-lg"
        >
          {isPending && <p className="px-3 py-2 text-sm text-zinc-400">Memuat…</p>}
          {error && <p className="px-3 py-2 text-sm text-red-300">Gagal memuat playlist.</p>}
          {!isPending && !error && playlists.length === 0 && (
            <p className="px-3 py-2 text-sm text-zinc-400">
              Belum ada playlist. Buat dulu di menu Playlist.
            </p>
          )}
          {playlists.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              disabled={add.isPending}
              onClick={() => {
                add.mutate({ playlistId: p.id, title: p.title })
                setOpenFor(null)
              }}
              className="block w-full truncate rounded px-3 py-2 text-left text-sm hover:bg-zinc-800 disabled:opacity-50"
            >
              {p.title}
              <span className="ml-2 text-xs text-zinc-500">{p.songs_count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}