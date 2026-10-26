import { useState } from 'react'
import { getAudioElement } from '../lib/audioRef.js'
import { formatDuration } from '../lib/songs.js'
import { usePlayerStore } from '../store/playerStore.js'

// `fallbackDuration` = duration_sec dari data lagu, dipakai bila elemen audio
// belum (atau tidak bisa) melaporkan durasi.
export default function SeekBar({ fallbackDuration }) {
  const time = usePlayerStore((s) => s.time)
  const duration = usePlayerStore((s) => s.duration)
  const status = usePlayerStore((s) => s.status)
  const [drag, setDrag] = useState(null) // nilai sementara selama slider digeser

  const max = duration > 0 ? duration : fallbackDuration > 0 ? fallbackDuration : 0
  const shown = Math.min(drag ?? time, max)

  // Posisi baru baru diterapkan saat slider dilepas, supaya tidak
  // mengirim puluhan permintaan Range selama digeser.
  function commit() {
    if (drag === null) return
    const audio = getAudioElement()
    if (audio) audio.currentTime = drag
    usePlayerStore.setState({ time: drag })
    setDrag(null)
  }

  return (
    <div className="flex items-center gap-2 pt-1 text-xs text-zinc-400">
      <span className="w-10 text-right tabular-nums">{formatDuration(shown)}</span>
      <input
        type="range"
        min={0}
        max={max || 1}
        step={1}
        value={shown}
        disabled={status !== 'ready' || max <= 0}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        aria-label="Posisi lagu"
        className="h-1 flex-1 cursor-pointer accent-emerald-500 disabled:cursor-default disabled:opacity-40"
      />
      <span className="w-10 tabular-nums">{formatDuration(max)}</span>
    </div>
  )
}