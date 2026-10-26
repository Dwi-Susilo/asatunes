import { formatDuration } from '../lib/songs.js'
import { usePlayerStore } from '../store/playerStore.js'
import Cover from './Cover.jsx'

// Daftar lagu (youtube_id, title, artist, thumbnail, duration_sec).
// onPlay(index) dipanggil saat sebuah baris diklik.
// renderAction(song) (opsional) menaruh kontrol tambahan di ujung kanan baris.
export default function SongList({ songs, onPlay, renderAction }) {
  const currentId = usePlayerStore((s) => s.queue[s.order[s.pos]]?.youtube_id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  return (
    <ul className="divide-y divide-zinc-900">
      {songs.map((song, i) => {
        const active = song.youtube_id === currentId
        return (
          <li
            key={`${song.youtube_id}-${i}`}
            className="flex items-center gap-2 rounded-md px-2 hover:bg-zinc-900"
          >
            <button
              type="button"
              onClick={() => onPlay(i)}
              className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
            >
              <span className="w-6 text-center text-sm text-zinc-500">
                {active && isPlaying ? '♪' : i + 1}
              </span>
              <Cover song={song} className="h-10 w-10" />
              <span className="min-w-0 flex-1 text-left">
                <span
                  className={`block truncate text-left text-sm font-medium ${
                    active ? 'text-emerald-400' : 'text-zinc-100'
                  }`}
                >
                  {song.title}
                </span>
                <span className="block truncate text-left text-xs text-zinc-400">
                  {song.artist}
                </span>
              </span>
              <span className="text-xs tabular-nums text-zinc-500">
                {formatDuration(song.duration_sec)}
              </span>
            </button>
            {renderAction && <div className="shrink-0">{renderAction(song)}</div>}
          </li>
        )
      })}
    </ul>
  )
}