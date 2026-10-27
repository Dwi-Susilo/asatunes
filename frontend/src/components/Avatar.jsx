import { useState } from 'react'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  lg: 'h-20 w-20 text-2xl',
}

// Dua huruf pertama dari dua kata pertama nama; '?' bila nama kosong.
function initialsOf(name) {
  const letters = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase()
  return letters || '?'
}

export default function Avatar({ name, url, size = 'sm' }) {
  // Mengingat URL yang gagal dimuat (tanpa useEffect): bila URL berganti, foto dicoba lagi.
  const [failedUrl, setFailedUrl] = useState(null)
  const showImage = Boolean(url) && failedUrl !== url
  const box = `${SIZES[size] ?? SIZES.sm} shrink-0 overflow-hidden rounded-full`

  if (showImage) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailedUrl(url)}
        className={`${box} bg-zinc-800 object-cover`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} flex items-center justify-center bg-emerald-900 font-semibold text-emerald-200`}
    >
      {initialsOf(name)}
    </span>
  )
}