import { api } from './api.js'

// GET /history (02_API.md bagian 7), khusus Pengguna login: satu baris per putaran yang
// tercatat (30 detik atau lebih, bukan duplikat), terbaru di atas, 20 per halaman.
// Tiap butir = Lagu + played_at. Mengembalikan { items, page, lastPage, total }.
export async function fetchHistoryPage(page, signal) {
  const res = await api.get(`/history?page=${page}`, { signal })
  return {
    items: res.data,
    page: res.meta?.current_page ?? page,
    lastPage: res.meta?.last_page ?? 1,
    total: res.meta?.total ?? res.data.length,
  }
}
