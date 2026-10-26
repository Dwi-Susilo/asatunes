// Pegangan ke satu elemen <audio> milik AudioPlayer, supaya komponen lain
// (bilah geser, Media Session) bisa membaca dan menggeser posisinya.
let element = null

export function setAudioElement(el) {
  element = el
}

export function getAudioElement() {
  return element
}

// Sudah lewat 3 detik: ulang dari awal. Kalau belum: lagu sebelumnya.
export function previousOrRestart(goPrev) {
  if (element && element.currentTime > 3) {
    element.currentTime = 0
    return
  }
  goPrev()
}