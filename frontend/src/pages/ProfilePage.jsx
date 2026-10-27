import { useState } from 'react'
import Avatar from '../components/Avatar.jsx'
import AvatarForm from '../components/AvatarForm.jsx'
import PasswordForm from '../components/PasswordForm.jsx'
import TextField from '../components/TextField.jsx'
import { api } from '../lib/api.js'
import { describeError } from '../lib/errors.js'
import { useAuthStore } from '../store/authStore.js'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  // null = belum diedit; nilai di kolom diturunkan saat render (tanpa useEffect).
  const [draft, setDraft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState({ message: '', fields: {} })

  const name = draft ?? user.name
  const trimmed = name.trim()
  const unchanged = trimmed === user.name

  function handleChange(e) {
    setDraft(e.target.value)
    setSaved(false)
    setError({ message: '', fields: {} })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting || unchanged) return
    if (!trimmed) {
      // Kemudahan di klien; server tetap penentu (422 errors.name).
      setError({ message: '', fields: { name: 'Nama wajib diisi.' } })
      return
    }
    setSubmitting(true)
    setSaved(false)
    setError({ message: '', fields: {} })
    try {
      const res = await api.patch('/profile', { name: trimmed })
      setUser(res.data) // data = User terbaru; sidebar ikut berubah
      setDraft(null)
      setSaved(true)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const joined = new Date(user.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-bold">Profil</h1>

      <section className="flex items-center gap-4">
        <Avatar name={user.name} url={user.avatar_url} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-medium">{user.name}</p>
          <p className="truncate text-sm text-zinc-400">{user.email}</p>
          <p className="text-xs text-zinc-500">Bergabung sejak {joined}</p>
        </div>
      </section>

      <AvatarForm />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Ubah nama</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {saved && (
            <p role="status" className="rounded-md bg-emerald-950 p-3 text-sm text-emerald-300">
              Nama berhasil disimpan.
            </p>
          )}
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
            onChange={handleChange}
            error={error.fields.name}
          />
          <button
            type="submit"
            disabled={submitting || unchanged}
            className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {submitting ? 'Menyimpan…' : 'Simpan'}
          </button>
        </form>
      </section>

      <PasswordForm />
    </div>
  )
}