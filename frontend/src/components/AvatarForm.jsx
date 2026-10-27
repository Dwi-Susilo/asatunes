import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { describeError } from '../lib/errors.js'
import { useAuthStore } from '../store/authStore.js'
import Avatar from './Avatar.jsx'

// Kemudahan di klien; server tetap penentu (02_API.md bagian 5: jpg/jpeg/png/webp, maks 2048 KB).
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2048 * 1024

function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function AvatarForm() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const inputRef = useRef(null)
  const [picked, setPicked] = useState(null) // { file, previewUrl } atau null
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Lepas URL pratinjau saat diganti, dibatalkan, atau komponen dilepas.
  const previewUrl = picked?.previewUrl ?? null
  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function handlePick(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // supaya berkas yang sama bisa dipilih ulang
    if (!file) return

    setSaved(false)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setPicked(null)
      setError('Format foto harus JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setPicked(null)
      setError(`Ukuran foto ${formatSize(file.size)}. Maksimal 2 MB.`)
      return
    }
    setError('')
    setPicked({ file, previewUrl: URL.createObjectURL(file) })
  }

  function handleCancel() {
    setPicked(null)
    setError('')
  }

  async function handleUpload() {
    if (!picked || submitting) return
    setSubmitting(true)
    setSaved(false)
    setError('')
    try {
      // PHP tidak membaca multipart pada PATCH: kirim POST + _method=PATCH.
      const form = new FormData()
      form.append('avatar', picked.file)
      form.append('_method', 'PATCH')
      const res = await api.post('/profile', form)
      setUser(res.data) // data = User terbaru; avatar di sidebar ikut berubah
      setPicked(null)
      setSaved(true)
    } catch (err) {
      const { message, fields } = describeError(err)
      setError(fields.avatar || message || 'Gagal mengunggah foto.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Foto profil</h2>
      <div className="space-y-4">
        {saved && (
          <p role="status" className="rounded-md bg-emerald-950 p-3 text-sm text-emerald-300">
            Foto profil berhasil disimpan.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Avatar name={user.name} url={previewUrl ?? user.avatar_url} size="lg" />
          <div className="min-w-0 space-y-2">
            {picked && (
              <p className="truncate text-sm text-zinc-300">
                {picked.file.name} ({formatSize(picked.file.size)})
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePick}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={submitting}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-60"
              >
                Pilih foto
              </button>
              {picked && (
                <>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={submitting}
                    className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {submitting ? 'Mengunggah…' : 'Unggah'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-60"
                  >
                    Batal
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-zinc-500">JPG, PNG, atau WebP, maksimal 2 MB.</p>
          </div>
        </div>
      </div>
    </section>
  )
}