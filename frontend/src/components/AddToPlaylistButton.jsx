import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists.js'
import { useRequireLogin } from '../hooks/useRequireLogin.js'
import { describeError } from '../lib/errors.js'
import { addSongToPlaylist, createPlaylist } from '../lib/playlists.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'

// `labeled`: tombol berlabel teks "Playlist" (dipakai di halaman /putar); tanpa itu hanya ikon.
export default function AddToPlaylistButton({ labeled = false }) {
  const songId = usePlayerStore((s) => s.songId) // diisi dari GET /music/stream
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const { playlists, isPending, error } = usePlaylists()
  const { isGuest, goToLogin } = useRequireLogin()
  // Menyimpan song_id tempat menu dibuka. Menu dianggap terbuka hanya bila
  // lagu aktif masih sama, jadi berganti lagu otomatis menutupnya (tanpa efek).
  const [openFor, setOpenFor] = useState(null)
  const open = openFor !== null && openFor === songId
  const wrapRef = useRef(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

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

  // Buat playlist baru lalu langsung memasukkan lagu yang sedang diputar.
  const createAndAdd = useMutation({
    mutationFn: async (title) => {
      const playlist = await createPlaylist({ title })
      const result = await addSongToPlaylist(playlist.id, songId)
      return { result, title: playlist.title ?? title }
    },
    onSuccess: ({ title }) => {
      usePlayerStore.getState().notify(`Playlist "${title}" dibuat, lagu ditambahkan.`)
      queryClient.invalidateQueries({ queryKey: ['playlists', userId] })
      queryClient.invalidateQueries({ queryKey: ['playlist', userId] })
      setNewTitle('')
      setCreating(false)
      setOpenFor(null)
    },
    onError: (err) =>
      usePlayerStore.getState().notify(describeError(err).message || 'Gagal membuat playlist.'),
  })

  function submitNew(e) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || createAndAdd.isPending) return
    createAndAdd.mutate(title)
  }

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
  let label = ready ? 'Tambah ke playlist' : 'Playlist belum siap'
  if (isGuest) label = 'Masuk untuk menambah ke playlist'

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => (isGuest ? goToLogin() : setOpenFor(open ? null : songId))}
        disabled={!ready}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className={
          labeled
            ? `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60 ${
                open ? 'border-accent-500 text-accent-400' : 'border-zinc-600 text-zinc-100'
              }`
            : `rounded-full p-2 hover:bg-zinc-800 disabled:opacity-40 ${
                open ? 'text-accent-400' : ''
              }`
        }
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M3 6h12v2H3zM3 10h12v2H3zM3 14h8v2H3zM17 10v4h-4v2h4v4h2v-4h4v-2h-4v-4z" />
        </svg>
        {labeled && 'Playlist'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-2 max-h-64 w-56 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-lg"
        >
          {isPending && <p className="px-3 py-2 text-sm text-zinc-400">Memuat…</p>}
          {error && <p className="px-3 py-2 text-sm text-red-300">Gagal memuat playlist.</p>}
          {!isPending && !error && playlists.length === 0 && (
            <p className="px-3 py-2 text-sm text-zinc-400">Belum ada playlist.</p>
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
          {!isPending && !error && (
            <div className="mt-1 border-t border-zinc-800 pt-1">
              {creating ? (
                <form onSubmit={submitNew} className="flex items-center gap-1 p-1">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Nama playlist"
                    aria-label="Nama playlist baru"
                    className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-accent-500"
                  />
                  <button
                    type="submit"
                    disabled={!newTitle.trim() || createAndAdd.isPending}
                    className="rounded bg-accent-500 px-2 py-1 text-sm font-medium text-white hover:bg-accent-400 disabled:opacity-50"
                  >
                    {createAndAdd.isPending ? '…' : 'Buat'}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setCreating(true)}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-accent-400 hover:bg-zinc-800"
                >
                  + Playlist baru
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}