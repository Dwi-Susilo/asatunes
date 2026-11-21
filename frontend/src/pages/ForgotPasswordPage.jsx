import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import TextField from '../components/TextField.jsx'
import { describeError } from '../lib/errors.js'
import { requestPasswordReset } from '../lib/passwordReset.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState({ message: '', fields: {} })
  const [sentMessage, setSentMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError({ message: '', fields: {} })
    try {
      // Jawaban server sama untuk email terdaftar maupun tidak, jadi pesan ini
      // tidak boleh dibaca sebagai "email pasti terdaftar".
      setSentMessage(await requestPasswordReset(email.trim()))
    } catch (err) {
      setError(describeError(err)) // 422 (email tidak valid), 429, atau gagal jaringan
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Atur ulang kata sandi"
      footer={
        <Link to="/login" className="text-accent-400 hover:underline">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {sentMessage ? (
        <div className="space-y-3 text-sm">
          <p role="status" className="rounded-md bg-accent-950 p-3 text-accent-300">
            {sentMessage}
          </p>
          <p className="text-zinc-400">
            Periksa kotak masuk Anda (dan folder spam). Tautan berlaku 60 menit.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-zinc-400">
            Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.
          </p>
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
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-500 py-2 font-medium text-zinc-950 hover:bg-accent-400 disabled:opacity-60"
          >
            {submitting ? 'Mengirim…' : 'Kirim tautan'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
