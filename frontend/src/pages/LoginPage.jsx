import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import TextField from '../components/TextField.jsx'
import { describeError } from '../lib/errors.js'
import { useAuthStore } from '../store/authStore.js'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const notice = useLocation().state?.notice

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState({ message: '', fields: {} })

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError({ message: '', fields: {} })
    try {
      await login(email.trim(), password)
      // Tidak ada navigate(): GuestRoute mengalihkan otomatis setelah token tersimpan.
    } catch (err) {
      // Cakup 401 (D7), 422, 403 (diblokir), 429, dan gagal jaringan.
      setError(describeError(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Masuk ke akun Anda"
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/register" className="text-emerald-400 hover:underline">
            Daftar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {notice && <p className="rounded-md bg-emerald-950 p-3 text-sm text-emerald-300">{notice}</p>}
        {error.message && (
          <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
            {error.message}
          </p>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error.fields.email}
          required
        />
        <TextField
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error.fields.password}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-emerald-500 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </AuthLayout>
  )
}