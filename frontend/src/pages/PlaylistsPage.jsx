import { useState } from 'react'
import ErrorNotice from '../components/ErrorNotice.jsx'
import PlaylistCover from '../components/PlaylistCover.jsx'
import PlaylistForm from '../components/PlaylistForm.jsx'
import { usePlaylists } from '../hooks/usePlaylists.js'
import { describeError } from '../lib/errors.js'

export default function PlaylistsPage() {
  const { playlists, hasMorePages, isPending, error, isFetching, refetch, create, update, remove } =
    usePlaylists()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [actionError, setActionError] = useState('')

  async function handleDelete(playlist) {
    if (!window.confirm(`Hapus playlist "${playlist.title}"? Lagunya sendiri tidak ikut terhapus.`)) {
      return
    }
    setActionError('')
    try {
      await remove.mutateAsync(playlist.id)
    } catch (err) {
      setActionError(describeError(err).message || 'Gagal menghapus playlist.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Playlist</h1>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Buat playlist
          </button>
        )}
      </div>

      {creating && (
        <PlaylistForm
          submitLabel="Buat"
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            await create.mutateAsync(body)
            setCreating(false)
          }}
        />
      )}

      {actionError && (
        <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
          {actionError}
        </p>
      )}

      {isPending && <p className="text-zinc-400">Memuat…</p>}
      {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

      {!isPending && !error && playlists.length === 0 && !creating && (
        <p className="text-zinc-400">Belum ada playlist. Klik &ldquo;Buat playlist&rdquo; untuk memulai.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((p) => (
          <li key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            {editingId === p.id ? (
              <PlaylistForm
                initial={p}
                submitLabel="Simpan"
                onCancel={() => setEditingId(null)}
                onSubmit={async (body) => {
                  await update.mutateAsync({ id: p.id, ...body })
                  setEditingId(null)
                }}
              />
            ) : (
              <div className="flex gap-3">
                <PlaylistCover thumbnails={p.cover_thumbnails} className="h-24 w-24" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs text-zinc-400">{p.songs_count} lagu</p>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{p.description}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(p.id)}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={remove.isPending}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-red-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {hasMorePages && (
        <p className="text-sm text-zinc-500">
          Hanya 50 playlist pertama yang ditampilkan.
        </p>
      )}
    </div>
  )
}