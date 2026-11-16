import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

function Screen({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-4 text-center text-zinc-100">
      {children}
    </div>
  )
}

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const restoreError = useAuthStore((s) => s.restoreError)
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const clearSession = useAuthStore((s) => s.clearSession)
  const location = useLocation()

  // Setelah refresh halaman: token ada di localStorage, user belum.
  useEffect(() => {
    restoreSession()
  }, [token, user, restoreSession])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (restoreError && !user) {
    return (
      <Screen>
        <p className="text-red-400">{restoreError.message}</p>
        <div className="flex gap-2">
          <button
            onClick={restoreSession}
            className="rounded-md bg-accent-500 px-4 py-2 font-medium text-zinc-950 hover:bg-accent-400"
          >
            Coba lagi
          </button>
          <button
            onClick={() => clearSession({ clearPlayer: true })}
            className="rounded-md border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
          >
            Keluar
          </button>
        </div>
      </Screen>
    )
  }

  if (!user) {
    return (
      <Screen>
        <p className="text-zinc-400">Memuat…</p>
      </Screen>
    )
  }

  return <Outlet />
}
