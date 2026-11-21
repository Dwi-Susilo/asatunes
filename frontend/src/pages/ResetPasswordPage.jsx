import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import TextField from '../components/TextField.jsx'
import { describeError } from '../lib/errors.js'
import { resetPassword } from '../lib/passwordReset.js'
import { useAuthStore } from '../store/authStore.js'

// Tujuan tautan di email: /reset-password?token=...&email=... (dibuat backend dari FRONTEND_URL).
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const navigate = useNavigate()
  const clearSession = useAuthStore((s) => s.clearSession)

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState({ message: '', fields: {} })
  const [linkInvalid, setLinkInvalid] = useState(false)

  const linkComplete = Boolean(token && email)

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError({ message: '', fields: {} })
    try {
      await resetPassword({ token, email, password })
      // Server mencabut semua token login akun ini; buang token lokal supaya halaman
      // masuk tidak dialihkan kembali oleh GuestRoute.
      clearSession()
      navigate('/login', {
        replace: true,
        state: { notice: 'Kata sandi berhasil diatur ulang. Silakan masuk dengan kata sandi baru.' },
      })
    } catch (err) {
      const described = describeError(err)
      setError(described)
      // 422 tanpa pesan per field = token tidak valid atau kedaluwarsa.
      if (err.status === 422 && Object.keys(described.fields).length === 0) setLinkInvalid(true)
      setSubmitting(false)
    }
  }

  const requestNew = (
    <Link to="/lupa-password" className="text-accent-400 hover:underline">
      Minta tautan baru
    </Link>
  )

  return (
    <AuthLayout title="Buat kata sandi baru" footer={<Link to="/login" className="text-accent-400 hover:underline">Kembali ke halaman masuk</Link>}>
      {!linkComplete ? (
        <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
          Tautan tidak lengkap. {requestNew}.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-zinc-400">
            Akun: <span className="text-zinc-200">{email}</span>
          </p>
          {error.message && (
            <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
              {error.message} {linkInvalid && requestNew}
            </p>
          )}
          <TextField
            label="Kata sandi baru (minimal 6 karakter)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error.fields.password}
            required
          />
          {error.fields.email && <p className="text-sm text-red-400">{error.fields.email}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-500 py-2 font-medium text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : 'Simpan kata sandi'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
