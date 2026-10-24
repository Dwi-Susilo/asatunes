export default function TextField({ label, error, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      <input
        {...inputProps}
        aria-invalid={error ? 'true' : 'false'}
        className={`w-full rounded-md border bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500 ${
          error ? 'border-red-500' : 'border-zinc-700'
        }`}
      />
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  )
}