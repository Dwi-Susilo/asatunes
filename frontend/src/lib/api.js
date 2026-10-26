import { tokenStorage } from './tokenStorage.js'

const BASE_URL = import.meta.env.VITE_API_URL

// Error yang dilempar untuk semua respons non-2xx dan kegagalan jaringan.
// status 0 = tidak ada respons (backend mati, CORS ditolak, offline).
export class ApiError extends Error {
  constructor(message, { status = 0, errors = null, retryAfter = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors // { field: [pesan] } pada 422, selain itu null
    this.retryAfter = retryAfter // detik (angka) atau null bila tidak terbaca
  }
}

// Store login mendaftarkan fungsi ini. Dibuat begini supaya api.js tidak
// mengimpor store (menghindari impor melingkar).
let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

function parseRetryAfter(res) {
  const raw = res.headers.get('Retry-After')
  const sec = Number(raw)
  return raw !== null && Number.isFinite(sec) ? sec : null
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' }

  if (auth) {
    const token = tokenStorage.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let payload
  if (body instanceof FormData) {
    payload = body // browser mengisi Content-Type + boundary sendiri
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err // dibatalkan sengaja, bukan kegagalan
    throw new ApiError('Tidak dapat terhubung ke server.', { status: 0 })
  }

  // Tubuh respons bisa kosong atau bukan JSON (misalnya halaman error mentah).
  let json = null
  try {
    json = JSON.parse(await res.text())
  } catch {
    json = null
  }

  if (res.ok) {
    // Semua endpoint di 02_API.md menjawab JSON. 2xx tanpa JSON berarti yang
    // menjawab bukan backend kita (atau backend salah konfigurasi): jangan
    // diteruskan sebagai "sukses" karena pemanggil akan membaca res.data dan meledak.
    if (json === null && res.status !== 204) {
      console.error(`Respons ${res.status} dari ${method} ${path} bukan JSON.`)
      throw new ApiError('Respons server tidak valid.', { status: res.status })
    }
    return json
  }

  // 401 pada endpoint terproteksi = token tidak berlaku: bersihkan sesi.
  // Endpoint login/register memakai auth:false, jadi 401 di sana hanya
  // kesalahan form dan TIDAK memicu ini (kalau memicu, login bisa berulang-ulang).
  if (res.status === 401 && auth) onUnauthorized()

  throw new ApiError(json?.message ?? `Permintaan gagal (HTTP ${res.status}).`, {
    status: res.status,
    errors: json?.errors ?? null,
    retryAfter: res.status === 429 ? parseRetryAfter(res) : null,
  })
}

// Semua metode mengembalikan seluruh isi JSON ({status, data, message, meta}),
// jadi pemanggil bisa membaca `meta` untuk daftar berhalaman.
export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}