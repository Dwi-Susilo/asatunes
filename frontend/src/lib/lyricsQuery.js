// Membuat kandidat (title, artist) untuk pencarian lirik dari data YouTube.
// Judul YouTube bisa "Artis - Judul (Official ...) | ..." atau "Judul - Artis | ...",
// dan artis sering berupa nama channel ("UNGU Band", "Musik Populer"), padahal
// LRCLIB mencocokkan secara ketat.

const NOISE_WORDS =
  /\b(official|video|audio|music|lyrics?|lirik|mv|hd|live|clip|karaoke|remastered)\b/gi

export function cleanTitle(raw) {
  return String(raw ?? '')
    .split('|')[0] // buang "| Waktu Yang Dinanti 2.0"
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ') // buang (Official ...), [HD], dll
    .replace(NOISE_WORDS, ' ')
    .replace(/\s+-\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function cleanArtist(raw) {
  return String(raw ?? '')
    .replace(/\s*-\s*topic$/i, '')
    .replace(/\bvevo\b/gi, '')
    .replace(/\b(official|band|music|records?|channel)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const MAX_CANDIDATES = 4

// Urutan kandidat, tanpa duplikat.
export function lyricsCandidates(song) {
  const title = String(song?.title ?? '')
  const artist = String(song?.artist ?? '')
  const out = []
  const seen = new Set()
  const add = (t, a) => {
    t = t.trim()
    a = a.trim()
    if (!t || !a) return
    const key = `${t.toLowerCase()}|${a.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ title: t, artist: a })
  }

  const cleaned = cleanTitle(title)
  const parts = cleaned.split(/\s+-\s+/)

  if (parts.length >= 2) {
    const first = parts[0]
    const rest = parts.slice(1).join(' - ')
    // "Artis - Judul" lebih umum, dicoba dulu; lalu "Judul - Artis".
    add(rest, first)
    add(first, rest)
    // Judul sisi lain dengan artis dari channel yang dibersihkan.
    add(rest, cleanArtist(artist))
    add(first, cleanArtist(artist))
  } else {
    add(cleaned, cleanArtist(artist))
    add(cleaned, artist)
  }

  return out.slice(0, MAX_CANDIDATES)
}