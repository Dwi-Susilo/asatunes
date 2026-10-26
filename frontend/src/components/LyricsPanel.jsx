import { useEffect, useRef } from 'react'
import { useLyrics } from '../hooks/useLyrics.js'
import { getAudioElement } from '../lib/audioRef.js'
import { activeLineIndex } from '../lib/lrc.js'
import { usePlayerStore } from '../store/playerStore.js'
import ErrorNotice from './ErrorNotice.jsx'

const MANUAL_SCROLL_PAUSE_MS = 4000

export default function LyricsPanel({ song, onClose }) {
  const { lines, plain, instrumental, notFound, isPending, error, isFetching, refetch } =
    useLyrics(song)
  const time = usePlayerStore((s) => s.time)

  const active = activeLineIndex(lines, time)
  const containerRef = useRef(null)
  const lineRefs = useRef([])
  const pausedUntil = useRef(0)

  // Gulir otomatis ke baris aktif, kecuali pengguna baru saja menggulir sendiri.
  useEffect(() => {
    if (active < 0 || Date.now() < pausedUntil.current) return
    lineRefs.current[active]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [active])

  // Tutup dengan tombol Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function seekTo(t) {
    const audio = getAudioElement()
    if (audio) audio.currentTime = t
    usePlayerStore.setState({ time: t })
  }

  const hasSynced = lines.length > 0
  const hasPlain = typeof plain === 'string' && plain.trim() !== ''

  let body
  if (isPending) {
    body = <p className="text-zinc-400">Memuat lirik…</p>
  } else if (error) {
    body = (
      <ErrorNotice
        error={error}
        onRetry={refetch}
        retrying={isFetching}
      />
    )
  } else if (notFound) {
    body = <p className="text-zinc-400">Lirik tidak tersedia untuk lagu ini.</p>
  } else if (instrumental) {
    body = <p className="text-zinc-400">Lagu ini instrumental.</p>
  } else if (hasSynced) {
    body = (
      <ul className="space-y-3 text-center">
        {lines.map((line, i) => (
          <li key={`${line.time}-${i}`} ref={(el) => (lineRefs.current[i] = el)}>
            {line.text === '' ? (
              <span className="block h-4" aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={() => seekTo(line.time)}
                className={`text-xl transition-colors ${
                  i === active
                    ? 'font-semibold text-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {line.text}
              </button>
            )}
          </li>
        ))}
      </ul>
    )
  } else if (hasPlain) {
    body = <p className="whitespace-pre-line text-center text-lg text-zinc-200">{plain}</p>
  } else {
    body = <p className="text-zinc-400">Lirik tidak tersedia untuk lagu ini.</p>
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-24 z-20 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{song.title}</p>
          <p className="truncate text-xs text-zinc-400">{song.artist}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          Tutup
        </button>
      </div>
      <div
        ref={containerRef}
        onWheel={() => (pausedUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS)}
        onTouchMove={() => (pausedUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS)}
        className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 py-10"
      >
        {body}
      </div>
    </div>
  )
}