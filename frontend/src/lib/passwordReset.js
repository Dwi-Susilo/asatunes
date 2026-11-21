import { api } from './api.js'

// POST /auth/forgot-password (02_API.md bagian 4): jawaban 200 sama untuk email terdaftar
// maupun tidak. Mengembalikan pesan dari server.
export async function requestPasswordReset(email) {
  const res = await api.post('/auth/forgot-password', { email }, { auth: false })
  return res.message
}

// POST /auth/reset-password: 200 bila token valid (token berlaku 60 menit, sekali pakai),
// 422 bila token tidak valid/kedaluwarsa atau data salah, 403 bila akun diblokir.
export async function resetPassword({ token, email, password }) {
  const res = await api.post('/auth/reset-password', { token, email, password }, { auth: false })
  return res.message
}
