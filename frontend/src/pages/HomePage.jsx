import { useState } from 'react'
import { useAuthStore } from '../store/authStore.js'

export default function HomePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await logout() // ProtectedRoute mengalihkan ke /login begitu token hilang.
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-100">
      <h1 className="text-3xl font-bold text-emerald-400">ASATunes</h1>
      <p>
        Halo, <strong>{user.name}</strong>
      </p>
      <p className="text-sm text-zinc-400">
        {user.email} · peran: {user.role}
      </p>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-2 rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-800 disabled:opacity-60"
      >
        {loggingOut ? 'Keluar…' : 'Keluar'}
      </button>
    </div>
  )
}