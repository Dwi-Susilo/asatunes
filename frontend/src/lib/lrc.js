// Parser format LRC (02_API.md 6.5): "[mm:ss.xx] teks" per baris, dipisah "\n".
// Hasil: [{ time: detik (angka), text: string }] terurut menurut waktu.
// Baris dengan stempel tetapi tanpa teks dipertahankan (text: '') sebagai jeda.

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

export function parseLrc(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return []

  const lines = []
  for (const row of raw.split(/\r?\n/)) {
    const stamps = [...row.matchAll(TIMESTAMP)]
    if (stamps.length === 0) continue // metadata ([ar:...]) atau baris tanpa stempel

    const text = row.replace(TIMESTAMP, '').trim()
    for (const m of stamps) {
      const minutes = Number(m[1])
      const seconds = Number(m[2])
      // Pecahan: "5" = 0,5 detik; "56" = 0,56; "560" = 0,560.
      const fraction = m[3] ? Number(m[3]) / 10 ** m[3].length : 0
      lines.push({ time: minutes * 60 + seconds + fraction, text })
    }
  }

  // sort() di JavaScript stabil, jadi baris dengan waktu sama tetap berurutan.
  return lines.sort((a, b) => a.time - b.time)
}

// Indeks baris yang sedang aktif pada waktu `t` (detik): baris terakhir yang
// time-nya <= t. Mengembalikan -1 bila belum sampai baris pertama.
export function activeLineIndex(lines, t) {
  let lo = 0
  let hi = lines.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].time <= t) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}