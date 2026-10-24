import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

// Halaman untuk tamu (login/daftar). Yang sudah punya token dialihkan keluar,
// ke halaman asal bila datang dari ProtectedRoute, selain itu ke beranda.
export default function GuestRoute() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (token) {
    return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  }
  return <Outlet />
}