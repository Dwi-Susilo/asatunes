import { useState } from 'react'
import { describeError } from '../lib/errors.js'
import TextField from './TextField.jsx'

// Dipakai untuk membuat dan mengubah. `onSubmit({title, description})` harus
// mengembalikan promise; error dari server ditampilkan di bawah kolomnya.
export default function PlaylistForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState({ message: '', fields: {} })

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError({ message: '', fields: {} })
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
      })
    } catch (err) {
      setError(describeError(err))
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
    >
      {error.message && (
        <p role="alert" className="rounded-md bg-red-950 p-3 text-sm text-red-300">
          {error.message}
        </p>
      )}
      <TextField
        label="Judul"
        type="text"
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={error.fields.title}
        autoFocus
        required
      />
      <TextField
        label="Deskripsi (opsional)"
        type="text"
        maxLength={500}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={error.fields.description}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? 'Menyimpan…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-800 disabled:opacity-60"
        >
          Batal
        </button>
      </div>
    </form>
  )
}