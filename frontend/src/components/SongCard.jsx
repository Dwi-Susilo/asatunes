import { formatDuration } from '../lib/songs.js'
import { usePlayerStore } from '../store/playerStore.js'
import Cover from './Cover.jsx'
import { PlayIcon } from './Icons.jsx'

// Kartu lagu untuk kisi (Beranda). Sampul 16:9 (object-cover memotong bilah hitam hqdefault).
export default function SongCard({ song, onPlay }) {
  const active = usePlayerStore((s) => s.queue[s.order[s.pos]]?.youtube_id === song.youtube_id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  return (
    <button
      type="button"
      onClick={onPlay}
      className="group block w-full min-w-0 rounded-lg bg-zinc-900/60 p-2 text-left transition-colors hover:bg-zinc-900"
    >
      <div className="relative overflow-hidden rounded-md">
        <Cover song={song} className="aspect-video w-full" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="rounded-full bg-accent-500 p-2 text-zinc-950">
            <PlayIcon className="h-6 w-6" />
          </span>
        </span>
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs tabular-nums text-zinc-100">
          {formatDuration(song.duration_sec)}
        </span>
      </div>
      <p
        className={`mt-2 line-clamp-2 break-words text-sm font-medium leading-snug ${
          active ? 'text-accent-400' : 'text-zinc-100'
        }`}
      >
        {active && isPlaying ? '♪ ' : ''}
        {song.title}
      </p>
      <p className="mt-0.5 truncate text-xs text-zinc-400">{song.artist}</p>
    </button>
  )
}
