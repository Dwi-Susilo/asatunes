export function thumbnailOf(song) {
  if (song?.thumbnail) return song.thumbnail
  if (song?.youtube_id) return `https://i.ytimg.com/vi/${song.youtube_id}/hqdefault.jpg`
  return null
}

export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const total = Math.floor(sec)
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}