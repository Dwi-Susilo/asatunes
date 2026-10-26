// Kolase sampul (SRS 3.4). `thumbnails` = cover_thumbnails (paling banyak 4 URL).
function Img({ src, className = '' }) {
  return <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
}

export default function PlaylistCover({ thumbnails = [], className = 'h-32 w-32' }) {
  const t = thumbnails.slice(0, 4)
  const box = `${className} shrink-0 overflow-hidden rounded-md bg-zinc-800`

  if (t.length === 0) return <div className={box} aria-hidden="true" />
  if (t.length === 1) {
    return (
      <div className={box}>
        <Img src={t[0]} />
      </div>
    )
  }
  if (t.length === 2) {
    return (
      <div className={`${box} grid grid-cols-2`}>
        <Img src={t[0]} />
        <Img src={t[1]} />
      </div>
    )
  }
  if (t.length === 3) {
    return (
      <div className={`${box} grid grid-cols-2 grid-rows-2`}>
        <div className="row-span-2">
          <Img src={t[0]} />
        </div>
        <Img src={t[1]} />
        <Img src={t[2]} />
      </div>
    )
  }
  return (
    <div className={`${box} grid grid-cols-2 grid-rows-2`}>
      {t.map((src) => (
        <Img key={src} src={src} />
      ))}
    </div>
  )
}