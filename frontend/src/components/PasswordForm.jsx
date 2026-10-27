import { useState } from 'react'
import { api } from '../lib/api.js'
import { describeError } from '../lib/errors.js'
import TextField from './TextField.jsx'

const EMPTY = { current: '', next: '', confirm: '' }

export default function PasswordForm() {
  const [values, setValues] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState({ message: '', fields: {} })

  function setField(key) {
    return (e) => {
      setValues((v) => ({ ...v, [key]: e.target.value }))
      setSaved(false)
      setError({ message: '', fields: {} })
    }
  }

  // Kemudahan di klien; server tetap penentu (422 errors.current_password / errors.password).
  function validate() {
    const fields = {}
    if (!values.current) fields.current = 'Kata sandi lama wajib diisi.'
    if (values.next.length < 6) fields.next = 'Kata sandi baru minimal 6 karakter.'
    else if (values.next === values.current) fields.next = 'Kata sandi baru harus berbeda dari yang lama.'
    if (values.confirm !== values.next) fields.confirm = 'Ulangi kata sandi baru dengan sama persis.'
    return fields
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return

    const clientFields = validate()
    if (Object.keys(clientFields).length > 0) {
      setSaved(false)
      setError({ message: '', fields: clientFields })
      return
    }

    setSubmitting(true)
    setSaved(false)
    setError({ message: '', fields: {} })
    try {
      await api.put('/profile/password', {
        current_password: values.current,
        password: values.next,
      })
      setValues(EMPTY) // jangan simpan kata sandi lebih lama dari perlu
      setSaved(true)
      // Tidak ada logout: token perangkat ini tetap berlaku (02_API.md bagian 5).
    } catch (err) {
      const { message, fields } = describeError(err)
      // Petakan kunci server ke kolom di form ini.
      setError({
        message,
        fields: { current: fields.current_password, next: fields.password },
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Ganti kata sandi</h2>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {saved && (
          <p role="status" className="rounded-md bg-emerald-950 p-3 text-sm text-emerald-300">
            Kata sandi berhasil diubah. Perangkat lain akan diminta masuk ulang.
          </p>
        )}
        {error.message && (
          <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
            {error.message}
          </p>
        )}
        <TextField
          label="Kata sandi lama"
          type="password"
          autoComplete="current-password"
          value={values.current}
          onChange={setField('current')}
          error={error.fields.current}
        />
        <TextField
          label="Kata sandi baru"
          type="password"
          autoComplete="new-password"
          value={values.next}
          onChange={setField('next')}
          error={error.fields.next}
        />
        <TextField
          label="Ulangi kata sandi baru"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={setField('confirm')}
          error={error.fields.confirm}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? 'Menyimpan…' : 'Ganti kata sandi'}
        </button>
      </form>
    </section>
  )
}