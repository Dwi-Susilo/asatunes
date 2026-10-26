import { describeError } from '../lib/errors.js'

export default function ErrorNotice({ error, onRetry, retrying = false }) {
  const message = describeError(error).message || 'Terjadi kesalahan.'
  return (
    <div role="alert" className="space-y-2 rounded-md bg-red-950 p-3 text-sm text-red-300">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          disabled={retrying}
          className="rounded-md border border-red-800 px-3 py-1 hover:bg-red-900 disabled:opacity-60"
        >
          {retrying ? 'Memuat…' : 'Coba lagi'}
        </button>
      )}
    </div>
  )
}