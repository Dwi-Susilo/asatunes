import { Link } from 'react-router-dom'

export default function AuthLayout({ title, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <Link
        to="/"
        className="absolute left-4 top-4 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
        </svg>
        Kembali ke beranda
      </Link>
      <div className="w-full max-w-sm pt-12">
        <h1 className="mb-1 text-center text-3xl font-bold text-accent-400">
          <Link to="/">ASATunes</Link>
        </h1>
        <p className="mb-6 text-center text-zinc-400">{title}</p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">{children}</div>
        {footer && <p className="mt-4 text-center text-sm text-zinc-400">{footer}</p>}
      </div>
    </div>
  )
}
