// Halaman yang memakai menu bawah di ponsel (SRS bagian 10): semua halaman di dalam AppLayout.
// Halaman masuk/daftar/reset dan Dashboard Admin punya tata letak sendiri tanpa menu bawah.
const NO_BOTTOM_NAV = /^\/(login|register|lupa-password|reset-password|admin)(\/|$)/

export function hasBottomNav(pathname) {
  return !NO_BOTTOM_NAV.test(pathname)
}
