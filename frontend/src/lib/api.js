import axios from 'axios'

// Satu instance axios untuk seluruh aplikasi. Alamat dasarnya dari .env (VITE_API_URL).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
})

// Sebelum setiap request: sisipkan token login (Laravel Sanctum, Bearer) bila ada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Pesan dari EnsureUserIsNotBlocked.php (status 403, token user dihapus oleh server).
const BLOCKED_MSG = 'Akun Anda telah diblokir.'

// Setelah setiap respons error: bila sesi tidak berlaku lagi, kembalikan ke halaman login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const message = err.response?.data?.message
    const isLogin = err.config?.url?.includes('/auth/login')

    // Login yang gagal (401 salah sandi / 403 diblokir) cukup ditampilkan di form login.
    // Selain itu, 401 atau 403 "diblokir" berarti sesi habis -> bersihkan token dan ke /login.
    const sessionEnded = !isLogin && (status === 401 || (status === 403 && message === BLOCKED_MSG))
    if (sessionEnded) {
      localStorage.removeItem('token')
      sessionStorage.setItem('flash', message || 'Silakan login kembali.')
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// Bentuk respons backend:
//   sukses : { status: 'success', data }
//   daftar : { status: 'success', data: [...], meta: { current_page, last_page, per_page, total } }
//   error  : { status: 'error', message, errors? }   (errors = { field: [pesan] } pada 422)
export const unwrap = (res) => res.data.data
export const unwrapPage = (res) => ({ items: res.data.data, meta: res.data.meta })
export const errMsg = (e) => e.response?.data?.message || 'Tidak dapat menghubungi server.'
export const fieldErrors = (e) => e.response?.data?.errors || {}

export default api