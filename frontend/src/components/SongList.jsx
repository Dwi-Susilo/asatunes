import { formatDuration } from '../lib/songs.js'
import { usePlayerStore } from '../store/playerStore.js'
import Cover from './Cover.jsx'

// Daftar Kandidat lagu (youtube_id, title, artist, thumbnail, duration_sec).
// onPlay(index) dipanggil saat sebuah baris diklik.
export default function SongList({ songs, onPlay }) {
  const currentId = usePlayerStore((s) => s.queue[s.order[s.pos]]?.youtube_id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  return (
    <ul className="divide-y divide-zinc-900">
      {songs.map((song, i) => {
        const active = song.youtube_id === currentId
        return (
          <li key={`${song.youtube_id}-${i}`}>
            <button
              type="button"
              onClick={() => onPlay(i)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-zinc-900"
            >
              <span className="w-6 text-center text-sm text-zinc-500">
                {active && isPlaying ? '♪' : i + 1}
              </span>
              <Cover song={song} className="h-10 w-10" />
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-sm font-medium ${
                    active ? 'text-emerald-400' : 'text-zinc-100'
                  }`}
                >
                  {song.title}
                </span>
                <span className="block truncate text-xs text-zinc-400">{song.artist}</span>
              </span>
              <span className="text-xs tabular-nums text-zinc-500">
                {formatDuration(song.duration_sec)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}