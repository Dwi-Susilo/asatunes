import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

// Hanya untuk admin. Dipasang DI DALAM ProtectedRoute, jadi `user` sudah termuat.
// Ini kemudahan tampilan; yang menentukan tetap server (403 untuk pengguna biasa).
export default function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}