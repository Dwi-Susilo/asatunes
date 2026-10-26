import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import ErrorNotice from '../components/ErrorNotice.jsx'
import PlaylistCover from '../components/PlaylistCover.jsx'
import SongList from '../components/SongList.jsx'
import { describeError } from '../lib/errors.js'
import { fetchPlaylist, removeSongFromPlaylist } from '../lib/playlists.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'

function Gone({ status }) {
  const message =
    status === 403
      ? 'Playlist ini bukan milik Anda.'
      : 'Playlist tidak ditemukan. Mungkin sudah dihapus.'
  return (
    <div className="space-y-3">
      <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
        {message}
      </p>
      <Link to="/playlist" className="text-emerald-400 hover:underline">
        Kembali ke daftar playlist
      </Link>
    </div>
  )
}

export default function PlaylistDetailPage() {
  const { id } = useParams()
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const playQueue = usePlayerStore((s) => s.playQueue)
  const key = ['playlist', userId, id]

  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchPlaylist(id, signal),
    enabled: userId != null,
    retry: false,
  })

  const removeSong = useMutation({
    mutationFn: (songId) => removeSongFromPlaylist(id, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['playlists', userId] })
    },
    onError: (err) =>
      usePlayerStore.getState().notify(describeError(err).message || 'Gagal menghapus lagu.'),
  })

  if (error && (error.status === 403 || error.status === 404)) return <Gone status={error.status} />

  const songs = data?.songs ?? []

  return (
    <div className="space-y-4">
      <Link to="/playlist" className="text-sm text-zinc-400 hover:text-zinc-200">
        &larr; Playlist
      </Link>

      {isPending && <p className="text-zinc-400">Memuat…</p>}
      {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

      {data && (
        <>
          <div className="flex gap-4">
            <PlaylistCover thumbnails={data.cover_thumbnails} className="h-32 w-32" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold">{data.title}</h1>
              {data.description && <p className="mt-1 text-sm text-zinc-400">{data.description}</p>}
              <p className="mt-1 text-xs text-zinc-500">{data.songs_count} lagu</p>
              <button
                type="button"
                disabled={songs.length === 0}
                onClick={() => playQueue(songs, 0)}
                className="mt-3 rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                Putar semua
              </button>
            </div>
          </div>

          {songs.length === 0 ? (
            <p className="text-zinc-400">
              Playlist ini masih kosong. Menambah lagu dari bilah pemutar tersedia di langkah
              berikutnya.
            </p>
          ) : (
            <SongList
              songs={songs}
              onPlay={(index) => playQueue(songs, index)}
              renderAction={(song) => (
                <button
                  type="button"
                  disabled={removeSong.isPending}
                  onClick={() => removeSong.mutate(song.id)}
                  aria-label={`Hapus ${song.title} dari playlist`}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Hapus
                </button>
              )}
            />
          )}
        </>
      )}
    </div>
  )
}