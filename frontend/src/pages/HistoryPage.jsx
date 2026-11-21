import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import ErrorNotice from '../components/ErrorNotice.jsx'
import SongList from '../components/SongList.jsx'
import { usePlaySongs } from '../hooks/usePlaySongs.js'
import { fetchHistoryPage } from '../lib/history.js'
import { useAuthStore } from '../store/authStore.js'

function formatPlayedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function HistoryPage() {
  const userId = useAuthStore((s) => s.user?.id)
  const playSongs = usePlaySongs()

  const { data, error, isPending, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['history', userId],
      queryFn: ({ pageParam, signal }) => fetchHistoryPage(pageParam, signal),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.page < last.lastPage ? last.page + 1 : undefined),
      enabled: userId != null,
      retry: false,
    })

  const songs = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])
  const total = data?.pages[0]?.total ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Riwayat</h1>
        <p className="text-sm text-zinc-400">
          Lagu yang pernah kamu putar, terbaru di atas. Lagu baru tercatat setelah didengar
          sekurang-kurangnya 30 detik.
        </p>
      </div>

      {(isPending || userId == null) && <p className="text-zinc-400">Memuat…</p>}

      {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

      {!isPending && !error && songs.length === 0 && (
        <p className="text-zinc-400">Belum ada riwayat. Putar sebuah lagu, lalu dengarkan sebentar.</p>
      )}

      {songs.length > 0 && (
        <>
          <SongList
            songs={songs}
            onPlay={(index) => playSongs(songs, index)}
            renderAction={(song) => (
              <time dateTime={song.played_at} className="hidden pr-2 text-xs text-zinc-500 sm:block">
                {formatPlayedAt(song.played_at)}
              </time>
            )}
          />
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>
              {songs.length} dari {total} putaran
            </span>
            {hasNextPage && (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
              >
                {isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
