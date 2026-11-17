import { create } from 'zustand'

const naturalOrder = (n) => Array.from({ length: n }, (_, i) => i)

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// `order` berisi indeks ke `queue` dalam urutan putar; `pos` menunjuk ke `order`.
// Saat shuffle, lagu yang sedang aktif selalu di depan.
function buildOrder(n, currentIdx, shuffle) {
  if (!shuffle) return { order: naturalOrder(n), pos: currentIdx }
  const rest = shuffled(naturalOrder(n).filter((i) => i !== currentIdx))
  return { order: [currentIdx, ...rest], pos: 0 }
}

// Autoplay (SRS 6.C): pilihan pengguna, diingat di peramban. Bawaan: mati.
const AUTOPLAY_KEY = 'asatunes_autoplay'
function readAutoplay() {
  try {
    return localStorage.getItem(AUTOPLAY_KEY) === '1'
  } catch {
    return false // penyimpanan tidak tersedia: pakai keadaan awal
  }
}

const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' }

// `nonce` naik setiap lagu aktif berganti atau perlu dimuat ulang; AudioPlayer
// memakainya sebagai pemicu. `status`: 'idle' | 'loading' | 'ready' | 'error'.
// `songId` diisi AudioPlayer dari GET /music/stream.
// `time` dan `duration` (detik) diisi AudioPlayer dari elemen audio.
const emptyState = {
  queue: [],
  order: [],
  pos: 0,
  isPlaying: false,
  nonce: 0,
  status: 'idle',
  songId: null,
  time: 0,
  duration: 0,
  notice: '',
  autoState: 'idle', // pengambilan rekomendasi untuk lagu aktif: 'idle' | 'loading' | 'done'
  awaitingMore: false, // lagu terakhir selesai selagi rekomendasi masih dimuat
}

const trackChange = (s) => ({
  isPlaying: true,
  nonce: s.nonce + 1,
  status: 'idle',
  songId: null,
  time: 0,
  duration: 0,
  autoState: 'idle',
  awaitingMore: false,
})

let noticeTimer

// Item antrean = Kandidat lagu (02_API.md bagian 2): youtube_id, title, artist,
// thumbnail, duration_sec. song_id sengaja tidak di sini; ia didapat dari
// GET /music/stream saat lagu diputar.
export const usePlayerStore = create((set, get) => ({
  ...emptyState,
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'
  autoplay: readAutoplay(),

  playQueue(items, startIndex = 0) {
    if (!items.length) return
    const idx = Math.min(Math.max(startIndex, 0), items.length - 1)
    set((s) => ({
      queue: items,
      ...buildOrder(items.length, idx, s.shuffle),
      ...trackChange(s),
    }))
  },

  // Mengembalikan true bila pindah lagu. Di ujung antrean dengan repeat 'off',
  // tidak pindah (false).
  next() {
    const { order, pos, repeat } = get()
    if (!order.length) return false
    if (pos < order.length - 1) {
      set((s) => ({ pos: pos + 1, ...trackChange(s) }))
      return true
    }
    if (repeat === 'all') {
      set((s) => ({ pos: 0, ...trackChange(s) }))
      return true
    }
    return false
  },

  prev() {
    const { order, pos, repeat } = get()
    if (!order.length) return false
    if (pos > 0) {
      set((s) => ({ pos: pos - 1, ...trackChange(s) }))
      return true
    }
    if (repeat === 'all') {
      set((s) => ({ pos: order.length - 1, ...trackChange(s) }))
      return true
    }
    return false
  },

  toggleShuffle() {
    const { shuffle, queue, order, pos } = get()
    const enabled = !shuffle
    if (!queue.length) {
      set({ shuffle: enabled })
      return
    }
    set({ shuffle: enabled, ...buildOrder(queue.length, order[pos], enabled) })
  },

  cycleRepeat() {
    set({ repeat: REPEAT_CYCLE[get().repeat] })
  },

  toggleAutoplay() {
    const autoplay = !get().autoplay
    try {
      localStorage.setItem(AUTOPLAY_KEY, autoplay ? '1' : '0')
    } catch {
      /* tidak diingat, tetap berlaku untuk sesi ini */
    }
    set({ autoplay, ...(autoplay ? {} : { awaitingMore: false }) })
  },

  // Menambah lagu ke ujung antrean tanpa mengganggu lagu aktif. Lagu yang sudah ada di
  // antrean dilewati. Saat shuffle, lagu baru ditaruh di belakang urutan yang ada.
  // Mengembalikan jumlah lagu yang benar-benar ditambahkan.
  appendToQueue(items) {
    const { queue, order } = get()
    const known = new Set(queue.map((q) => q.youtube_id))
    const fresh = []
    for (const item of items) {
      if (known.has(item.youtube_id)) continue
      known.add(item.youtube_id)
      fresh.push(item)
    }
    if (!fresh.length) return 0
    set({
      queue: [...queue, ...fresh],
      order: [...order, ...fresh.map((_, i) => queue.length + i)],
    })
    return fresh.length
  },

  setPlaying(isPlaying) {
    if (get().queue.length) set({ isPlaying })
  },

  togglePlaying() {
    const { queue, isPlaying } = get()
    if (queue.length) set({ isPlaying: !isPlaying })
  },

  // Pesan singkat (toast) yang hilang sendiri setelah 4 detik.
  notify(message) {
    clearTimeout(noticeTimer)
    set({ notice: message })
    noticeTimer = setTimeout(() => set({ notice: '' }), 4000)
  },

  clear() {
    set({ ...emptyState, shuffle: false, repeat: 'off' })
  },
}))