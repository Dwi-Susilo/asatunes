import { useState } from 'react'
import { thumbnailOf } from '../lib/songs.js'

// Sampul lagu. Bila gambar gagal dimuat, tampil kotak abu-abu.
export default function Cover({ song, className = 'h-12 w-12' }) {
  const src = thumbnailOf(song)
  const [failedSrc, setFailedSrc] = useState(null)

  if (!src || failedSrc === src) {
    return <div className={`${className} shrink-0 rounded bg-zinc-800`} aria-hidden="true" />
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailedSrc(src)}
      className={`${className} shrink-0 rounded object-cover`}
    />
  )
}