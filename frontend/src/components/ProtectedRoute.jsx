import { useEffect, useState } from 'react'
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
  const loadProfile = useAuthStore((s) => s.loadProfile)
  const clearSession = useAuthStore((s) => s.clearSession)
  const location = useLocation()

  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // Setelah refresh halaman: token ada di localStorage, user belum.
  useEffect(() => {
    if (!token || user) return
    let cancelled = false

    loadProfile().catch((err) => {
      if (cancelled) return
      // 401: modul api sudah membersihkan sesi. 403: akun diblokir, tokennya sudah dicabut.
      if (err.status === 401 || err.status === 403) {
        clearSession()
      } else {
        // Backend mati, 429, 5xx: JANGAN keluarkan pengguna, tawarkan coba lagi.
        setError(err)
      }
    })

    return () => {
      cancelled = true
    }
  }, [token, user, attempt, loadProfile, clearSession])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (error && !user) {
    return (
      <Screen>
        <p className="text-red-400">{error.message}</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }}
            className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Coba lagi
          </button>
          <button
            onClick={clearSession}
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