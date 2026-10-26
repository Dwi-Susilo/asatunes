import { useState } from 'react'
import { previousOrRestart } from '../lib/audioRef.js'
import { usePlayerStore } from '../store/playerStore.js'
import Cover from './Cover.jsx'
import HeartButton from './HeartButton.jsx'
import {
  LyricsIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  ShuffleIcon,
} from './Icons.jsx'
import LyricsPanel from './LyricsPanel.jsx'
import SeekBar from './SeekBar.jsx'

const REPEAT_LABEL = {
  off: 'Ulangi: mati',
  all: 'Ulangi: semua lagu',
  one: 'Ulangi: satu lagu',
}

export default function PlayerBar() {
  const current = usePlayerStore((s) => s.queue[s.order[s.pos]])
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const status = usePlayerStore((s) => s.status)
  const notice = usePlayerStore((s) => s.notice)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const togglePlaying = usePlayerStore((s) => s.togglePlaying)
  const next = usePlayerStore((s) => s.next)
  const prev = usePlayerStore((s) => s.prev)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const [showLyrics, setShowLyrics] = useState(false)

  if (!current) return null

  const btn = 'rounded-full p-2 hover:bg-zinc-800'

  return (
    <>
      {showLyrics && <LyricsPanel song={current} onClose={() => setShowLyrics(false)} />}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur">
        {notice && (
          <p role="status" className="bg-red-950 px-3 py-1 text-center text-sm text-red-300">
            {notice}
          </p>
        )}
        <div className="mx-auto max-w-5xl px-3 py-2">
          <div className="flex items-center gap-3">
            <Cover song={current} className="h-12 w-12" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{current.title}</p>
              <p className="truncate text-xs text-zinc-400">
                {status === 'loading' ? 'Memuat…' : current.artist}
              </p>
            </div>

            <div className="flex items-center gap-1 text-zinc-300">
              <HeartButton />
              <button
                type="button"
                onClick={() => setShowLyrics((v) => !v)}
                aria-label="Lirik"
                aria-pressed={showLyrics}
                className={`${btn} ${showLyrics ? 'text-emerald-400' : ''}`}
              >
                <LyricsIcon />
              </button>
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label="Acak"
                aria-pressed={shuffle}
                className={`${btn} ${shuffle ? 'text-emerald-400' : ''}`}
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
                className="rounded-full bg-emerald-500 p-2 text-zinc-950 hover:bg-emerald-400"
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
                className={`relative ${btn} ${repeat !== 'off' ? 'text-emerald-400' : ''}`}
              >
                <RepeatIcon />
                {repeat === 'one' && (
                  <span className="absolute right-0.5 top-0 text-[10px] font-bold">1</span>
                )}
              </button>
            </div>
          </div>

          <SeekBar fallbackDuration={current.duration_sec} />
        </div>
      </div>
    </>
  )
}