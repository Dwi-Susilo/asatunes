import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'

// SEMENTARA (dihapus di Langkah 39): data contoh untuk menguji pemutar.
// Lagu pertama dari contoh di 02_API.md; dua lainnya hanya data palsu.
const DEMO_QUEUE = [
  {
    youtube_id: '_N6vSc_mT6I',
    title: 'TULUS - Hati-Hati di Jalan (Official Lyric Video)',
    artist: 'Tulus',
    thumbnail: 'https://i.ytimg.com/vi/_N6vSc_mT6I/hqdefault.jpg',
    duration_sec: 242,
  },
  { youtube_id: 'AAAAAAAAAAA', title: 'Contoh Lagu Dua', artist: 'Artis Uji', thumbnail: null, duration_sec: 180 },
  { youtube_id: 'BBBBBBBBBBB', title: 'Contoh Lagu Tiga', artist: 'Artis Uji', thumbnail: null, duration_sec: 200 },
]

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const playQueue = usePlayerStore((s) => s.playQueue)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Halo, <span className="text-emerald-400">{user.name}</span>
        </h1>
        <p className="text-sm text-zinc-400">peran: {user.role}</p>
      </div>

      <section className="rounded-lg border border-dashed border-zinc-700 p-4">
        <h2 className="mb-1 font-medium">Uji pemutar (sementara)</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Memuat antrean berisi 3 lagu contoh. Belum ada suara; itu di Langkah 38b.
        </p>
        <button
          type="button"
          onClick={() => playQueue(DEMO_QUEUE, 0)}
          className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400"
        >
          Muat antrean contoh
        </button>
      </section>
    </div>
  )
}