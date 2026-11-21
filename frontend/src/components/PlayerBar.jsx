import { Link, useLocation } from 'react-router-dom'
import { hasBottomNav } from '../lib/layout.js'
import { previousOrRestart } from '../lib/audioRef.js'
import { usePlayerStore } from '../store/playerStore.js'
import Cover from './Cover.jsx'
import {
  ChevronUpIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
  VolumeIcon,
} from './Icons.jsx'
import SeekBar from './SeekBar.jsx'

const REPEAT_LABEL = {
  off: 'Ulangi: mati',
  all: 'Ulangi: semua lagu',
  one: 'Ulangi: satu lagu',
}

// Bilah pemutar bawah. Tombol Favorit dan tambah-ke-playlist, lirik, dan Autoplay ada di
// halaman /putar (keputusan pemilik, 17 Nov 2026).
export default function PlayerBar() {
  const current = usePlayerStore((s) => s.queue[s.order[s.pos]])
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const status = usePlayerStore((s) => s.status)
  const notice = usePlayerStore((s) => s.notice)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const volume = usePlayerStore((s) => s.volume)
  const togglePlaying = usePlayerStore((s) => s.togglePlaying)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const setVolume = usePlayerStore((s) => s.setVolume)

  const withBottomNav = hasBottomNav(useLocation().pathname)

  if (!current) return null

  const btn = 'rounded-full p-2 hover:bg-zinc-800'

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur ${
        withBottomNav ? 'max-md:bottom-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''
      }`}
    >
      {notice && (
        <p role="status" className="bg-red-950 px-3 py-1 text-center text-sm text-red-300">
          {notice}
        </p>
      )}
      <div className="mx-auto max-w-7xl px-3 py-2">
        <div className="flex items-center gap-3">
          <Link to="/putar" className="flex min-w-0 flex-1 items-center gap-3" title="Buka pemutar">
            <Cover song={current} className="h-12 w-12" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-zinc-100">
                {current.title}
              </span>
              <span className="block truncate text-xs text-zinc-400">
                {status === 'loading' ? 'Memuat…' : current.artist}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1 text-zinc-300">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Acak"
              aria-pressed={shuffle}
              className={`${btn} ${shuffle ? 'text-accent-400' : ''}`}
            >
              <ShuffleIcon />
            </button>
            <button
              type="button"
              onClick={() => previousOrRestart(prev)}
              aria-label="Lagu sebelumnya"
              className={btn}
            >
              <PrevIcon />
            </button>
            <button
              type="button"
              onClick={togglePlaying}
              aria-label={isPlaying ? 'Jeda' : 'Putar'}
              className="rounded-full bg-accent-500 p-2 text-zinc-950 hover:bg-accent-400"
            >
              {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>
            <button type="button" onClick={next} aria-label="Lagu berikutnya" className={btn}>
              <NextIcon />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={REPEAT_LABEL[repeat]}
              className={`relative ${btn} ${repeat !== 'off' ? 'text-accent-400' : ''}`}
            >
              <RepeatIcon />
              {repeat === 'one' && (
                <span className="absolute right-0.5 top-0 text-[10px] font-bold">1</span>
              )}
            </button>
          </div>

          <div className="hidden flex-1 items-center justify-end gap-2 text-zinc-300 md:flex">
            <VolumeIcon className="h-5 w-5" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-24 cursor-pointer accent-accent-500"
            />
            <Link to="/putar" aria-label="Buka pemutar" className={btn}>
              <ChevronUpIcon className="h-6 w-6" />
            </Link>
          </div>
        </div>

        <SeekBar fallbackDuration={current.duration_sec} />
      </div>
    </div>
  )
}