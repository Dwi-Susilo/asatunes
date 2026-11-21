import { useEffect, useRef } from 'react'
import { useLyrics } from '../hooks/useLyrics.js'
import { getAudioElement } from '../lib/audioRef.js'
import { activeLineIndex } from '../lib/lrc.js'
import { usePlayerStore } from '../store/playerStore.js'
import ErrorNotice from './ErrorNotice.jsx'

const MANUAL_SCROLL_PAUSE_MS = 4000

// Lirik lagu yang sedang diputar; ditampilkan di tab Lirik pada halaman /putar.
export default function LyricsPanel({ song }) {
  const { lines, plain, instrumental, notFound, isPending, error, isFetching, refetch } =
    useLyrics(song)
  const time = usePlayerStore((s) => s.time)

  const active = activeLineIndex(lines, time)
  const containerRef = useRef(null)
  const lineRefs = useRef([])
  const pausedUntil = useRef(0)

  // Gulir otomatis ke baris aktif di dalam panel (bukan halaman), kecuali pengguna baru
  // saja menggulir sendiri.
  useEffect(() => {
    const box = containerRef.current
    const line = lineRefs.current[active]
    if (!box || !line || active < 0 || Date.now() < pausedUntil.current) return
    const top = line.offsetTop - box.clientHeight / 2 + line.clientHeight / 2
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [active])

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
                    ? 'font-semibold text-accent-400'
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
    <div
      ref={containerRef}
      onWheel={() => (pausedUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS)}
      onTouchMove={() => (pausedUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS)}
      className="relative h-[28rem] overflow-y-auto px-2 py-6"
    >
      {body}
    </div>
  )
}
