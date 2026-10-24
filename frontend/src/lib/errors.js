import { ApiError } from './api.js'

// Mengubah error API menjadi { message, fields } untuk ditampilkan di form.
// Klien bergantung pada kode status dan kunci `errors`, bukan teks pesan (02_API.md 1.2),
// kecuali untuk menampilkan pesan server apa adanya kepada pengguna.
export function describeError(err) {
  if (!(err instanceof ApiError)) {
    return { message: 'Terjadi kesalahan tak terduga.', fields: {} }
  }

  if (err.status === 429) {
    // Retry-After sering tidak terbaca browser (lihat catatan CORS di Langkah 37b).
    const wait = err.retryAfter ? `${err.retryAfter} detik` : 'sekitar satu menit'
    return { message: `Terlalu banyak percobaan. Tunggu ${wait} lalu coba lagi.`, fields: {} }
  }

  const fields = {}
  if (err.status === 422 && err.errors) {
    for (const [key, value] of Object.entries(err.errors)) {
      fields[key] = Array.isArray(value) ? value[0] : String(value)
    }
  }

  // Bila ada pesan per field, pesan umum "Data tidak valid" tidak perlu diulang.
  const message = Object.keys(fields).length > 0 ? '' : err.message
  return { message, fields }
}