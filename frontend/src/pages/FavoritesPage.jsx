import ErrorNotice from '../components/ErrorNotice.jsx'
import SongList from '../components/SongList.jsx'
import { useFavorites } from '../hooks/useFavorites.js'
import { usePlaySongs } from '../hooks/usePlaySongs.js'

export default function FavoritesPage() {
  const { favorites, isPending, error, isFetching, refetch, isToggling, toggle } = useFavorites()
  const playSongs = usePlaySongs()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Favorit</h1>

      {isPending && <p className="text-zinc-400">Memuat…</p>}

      {error && <ErrorNotice error={error} onRetry={refetch} retrying={isFetching} />}

      {!isPending && !error && favorites.length === 0 && (
        <p className="text-zinc-400">
          Belum ada lagu favorit. Putar sebuah lagu, lalu tekan ikon hati di halaman pemutar.
        </p>
      )}

      {favorites.length > 0 && (
        <SongList
          songs={favorites}
          onPlay={(index) => playSongs(favorites, index)}
          renderAction={(song) => (
            <button
              type="button"
              disabled={isToggling}
              onClick={(e) => {
                e.stopPropagation()
                toggle(song.id, false)
              }}
              aria-label={`Hapus ${song.title} dari favorit`}
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Hapus
            </button>
          )}
        />
      )}
    </div>
  )
}