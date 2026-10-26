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

const REPEAT_CYCLE = { off: 'all', all: 'one', one: 'off' }

const emptyState = { queue: [], order: [], pos: 0, isPlaying: false }

// Item antrean = Kandidat lagu (02_API.md bagian 2): youtube_id, title, artist,
// thumbnail, duration_sec. song_id sengaja tidak di sini; ia didapat dari
// GET /music/stream saat lagu diputar (Langkah 38b).
export const usePlayerStore = create((set, get) => ({
  ...emptyState,
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'

  playQueue(items, startIndex = 0) {
    if (!items.length) return
    const idx = Math.min(Math.max(startIndex, 0), items.length - 1)
    set({
      queue: items,
      ...buildOrder(items.length, idx, get().shuffle),
      isPlaying: true,
    })
  },

  // Mengembalikan true bila pindah lagu. Di ujung antrean dengan repeat 'off',
  // tidak pindah (false).
  next() {
    const { order, pos, repeat } = get()
    if (!order.length) return false
    if (pos < order.length - 1) {
      set({ pos: pos + 1, isPlaying: true })
      return true
    }
    if (repeat === 'all') {
      set({ pos: 0, isPlaying: true })
      return true
    }
    return false
  },

  prev() {
    const { order, pos, repeat } = get()
    if (!order.length) return false
    if (pos > 0) {
      set({ pos: pos - 1, isPlaying: true })
      return true
    }
    if (repeat === 'all') {
      set({ pos: order.length - 1, isPlaying: true })
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

  setPlaying(isPlaying) {
    if (get().queue.length) set({ isPlaying })
  },

  togglePlaying() {
    const { queue, isPlaying } = get()
    if (queue.length) set({ isPlaying: !isPlaying })
  },

  clear() {
    set({ ...emptyState, shuffle: false, repeat: 'off' })
  },
}))