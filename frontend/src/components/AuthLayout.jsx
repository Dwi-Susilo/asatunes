export default function AuthLayout({ title, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-3xl font-bold text-emerald-400">ASATunes</h1>
        <p className="mb-6 text-center text-zinc-400">{title}</p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">{children}</div>
        {footer && <p className="mt-4 text-center text-sm text-zinc-400">{footer}</p>}
      </div>
    </div>
  )
}