import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import TextField from '../components/TextField.jsx'
import { describeError } from '../lib/errors.js'
import { useAuthStore } from '../store/authStore.js'

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const [name, setName] = useState('')
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
      await register(name.trim(), email.trim(), password)
    } catch (err) {
      setError(describeError(err))
      setSubmitting(false)
      return
    }

    // register tidak mengembalikan token (02_API.md bagian 4), jadi login sesudahnya.
    try {
      await login(email.trim(), password)
      // GuestRoute mengalihkan otomatis.
    } catch {
      navigate('/login', {
        replace: true,
        state: { notice: 'Akun berhasil dibuat. Silakan masuk.' },
      })
    }
  }

  return (
    <AuthLayout
      title="Buat akun baru"
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error.message && (
          <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
            {error.message}
          </p>
        )}
        <TextField
          label="Nama"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error.fields.name}
          required
        />
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
          label="Kata sandi (minimal 6 karakter)"
          type="password"
          autoComplete="new-password"
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
          {submitting ? 'Memproses…' : 'Daftar'}
        </button>
      </form>
    </AuthLayout>
  )
}