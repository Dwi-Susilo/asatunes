import { create } from 'zustand'
import { api, setUnauthorizedHandler } from '../lib/api.js'
import { tokenStorage } from '../lib/tokenStorage.js'
import { usePlayerStore } from './playerStore.js'

export const useAuthStore = create((set, get) => ({
  token: tokenStorage.get(),
  user: null, // objek User dari API; diisi saat login atau loadProfile()

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
      get().clearSession()
    }
  },

  clearSession() {
    tokenStorage.clear()
    usePlayerStore.getState().clear() // antrean tidak boleh diwarisi pengguna berikutnya
    set({ token: null, user: null })
  },
}))

// 401 pada endpoint terproteksi => buang sesi (lihat api.js).
setUnauthorizedHandler(() => useAuthStore.getState().clearSession())