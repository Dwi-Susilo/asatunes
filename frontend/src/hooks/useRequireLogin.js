import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

// Untuk tombol fitur akun (favorit, tambah ke playlist). SRS 10.C: Pengunjung yang
// menekannya diarahkan ke login; setelah masuk, kembali ke halaman asal.
export function useRequireLogin() {
  const isGuest = useAuthStore((s) => !s.token)
  const navigate = useNavigate()
  const location = useLocation()

  return {
    isGuest,
    goToLogin: () => navigate('/login', { state: { from: location } }),
  }
}
