import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute.jsx'
import AppLayout from './components/AppLayout.jsx'
import AudioPlayer from './components/AudioPlayer.jsx'
import AutoQueue from './components/AutoQueue.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import GuestRoute from './components/GuestRoute.jsx'
import PlayerBar from './components/PlayerBar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminPage from './pages/AdminPage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PlaylistDetailPage from './pages/PlaylistDetailPage.jsx'
import PlaylistsPage from './pages/PlaylistsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import NowPlayingPage from './pages/NowPlayingPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import SearchPage from './pages/SearchPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Tidak di balik GuestRoute: tautan email harus bisa dibuka walau di peramban ini masih login. */}
        <Route path="/lupa-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<AppLayout />}>
          {/* Terbuka untuk Pengunjung (SRS 3.1) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/cari" element={<SearchPage />} />
          <Route path="/putar" element={<NowPlayingPage />} />

          {/* Fitur akun: memerlukan login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/favorit" element={<FavoritesPage />} />
            <Route path="/riwayat" element={<HistoryPage />} />
            <Route path="/playlist" element={<PlaylistsPage />} />
            <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
            <Route path="/profil" element={<ProfilePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Di luar tata letak halaman: pemutaran tidak putus saat pindah ke /login (sesi habis, K7). */}
      <AudioPlayer />
      <AutoQueue />
      <PlayerBar />
    </BrowserRouter>
  )
}