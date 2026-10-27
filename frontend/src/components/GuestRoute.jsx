import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

// Halaman untuk tamu (login/daftar). Yang sudah punya token dialihkan keluar:
// ke halaman asal bila datang dari ProtectedRoute dan asalnya bukan beranda,
// selain itu ke beranda sesuai peran (admin -> /admin, lainnya -> /).
// "Asal = /" dianggap tidak ada tujuan khusus, karena logout dari beranda pun
// membawa from = "/" (ProtectedRoute mencatat halaman terakhir).
export default function GuestRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (token) {
    const from = location.state?.from?.pathname
    const home = user?.role === 'admin' ? '/admin' : '/'
    return <Navigate to={from && from !== '/' ? from : home} replace />
  }
  return <Outlet />
}