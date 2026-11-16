import { create } from 'zustand'
import { api, setUnauthorizedHandler } from '../lib/api.js'
import { tokenStorage } from '../lib/tokenStorage.js'
import { usePlayerStore } from './playerStore.js'

// Satu permintaan profil bersama: AppLayout dan ProtectedRoute sama-sama memanggil
// restoreSession(), tetapi GET /profile hanya dikirim sekali.
let restoring = null

export const useAuthStore = create((set, get) => ({
  token: tokenStorage.get(),
  user: null, // objek User dari API; diisi saat login atau loadProfile()
  restoreError: null, // kegagalan sementara saat memulihkan profil (backend mati, 429, 5xx)

  // POST /auth/register mengembalikan User TANPA token (02_API.md bagian 4).
  // Pemanggil harus memanggil login() sesudahnya.
  async register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password }, { auth: false })
    return res.data
  },

  // 200: data = { user, token }. Kegagalan (401/422/403/429) dilempar sebagai ApiError.
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password }, { auth: false })
    tokenStorage.set(res.data.token)
    set({ token: res.data.token, user: res.data.user })
    return res.data.user
  },

  // Dipakai setelah refresh halaman: token ada di storage, user belum.
  async loadProfile() {
    const res = await api.get('/profile')
    set({ user: res.data })
    return res.data
  },

  // Setelah refresh halaman: token ada di storage, user belum. 401/403 berarti token tidak
  // berlaku lagi (atau akun diblokir): sesi dibuang dan pemakai menjadi Pengunjung.
  // Kegagalan lain TIDAK mengeluarkan pengguna; disimpan di restoreError agar bisa dicoba lagi.
  restoreSession() {
    if (!get().token || get().user) return Promise.resolve()
    if (restoring) return restoring

    set({ restoreError: null })
    restoring = get()
      .loadProfile()
      .catch((err) => {
        if (err.status === 401 || err.status === 403) get().clearSession()
        else set({ restoreError: err })
      })
      .finally(() => {
        restoring = null
      })
    return restoring
  },

  // Dipakai setelah PATCH /profile: data = User terbaru, sidebar ikut berubah.
  setUser(user) {
    set({ user })
  },

  // Keluar bersih walau server gagal dihubungi.
  async logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      /* token tetap dibuang di sisi klien */
    } finally {
      get().clearSession({ clearPlayer: true })
    }
  },

  // Sesi berakhir karena 401/403 (token kedaluwarsa atau akun diblokir): pemutaran tetap
  // berjalan (keputusan K7), karena rute musik terbuka untuk Pengunjung. Hanya keluar yang
  // disengaja (logout) yang mengosongkan antrean, supaya tidak diwarisi pengguna berikutnya.
  clearSession({ clearPlayer = false } = {}) {
    tokenStorage.clear()
    if (clearPlayer) usePlayerStore.getState().clear()
    set({ token: null, user: null, restoreError: null })
  },
}))

// 401 pada endpoint terproteksi => buang sesi (lihat api.js).
setUnauthorizedHandler(() => useAuthStore.getState().clearSession())