import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // CORS backend hanya mengizinkan http://localhost:5173.
    // Tanpa strictPort, Vite diam-diam pindah ke 5174 bila 5173 terpakai,
    // dan semua permintaan API akan ditolak CORS dengan pesan yang membingungkan.
    strictPort: true,
  },
})
