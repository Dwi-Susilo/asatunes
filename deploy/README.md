# Deploy backend ASATunes

Dua skenario didukung oleh berkas di folder ini:
- **Server di rumah + Tailscale Funnel** (tanpa domain, gratis). Dijelaskan di bawah.
- **VPS sewaan + domain sendiri**: jalankan skrip yang sama, lalu `sudo certbot --nginx -d alamat-api`
  dan kosongkan `TRUSTED_PROXIES` di `.env` bila tidak ada tunnel.

Kode diambil dari GitHub. Frontend dideploy terpisah (Vercel/Netlify) dan hanya perlu alamat API.

## A. Cegah server tidur
```
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
systemctl status sleep.target        # harus tertulis "masked"
```
Bila server itu **laptop**, tambahkan juga di `/etc/systemd/logind.conf`:
```
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```
lalu `sudo reboot`. Pakai kabel LAN bila bisa. Di BIOS, aktifkan *Restore on AC Power Loss* bila ada.

## B. Siapkan Tailscale Funnel (mendapat alamat HTTPS publik)
1. Buat akun di tailscale.com. Di panel admin (login.tailscale.com), aktifkan **MagicDNS** dan **HTTPS Certificates**.
2. Di server:
   ```
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up            # buka tautan yang tampil, masuk dengan akunmu
   ```
3. Aktifkan Funnel ke port 80 (Nginx lokal):
   ```
   sudo tailscale funnel --bg 80
   tailscale funnel status      # menampilkan alamat publik: https://NAMA.NAMA-TAILNET.ts.net
   ```
   Bila sintaks ditolak (versi berbeda), lihat `tailscale funnel --help`.
4. Catat alamat itu tanpa `https://`. Contoh: `server-dwi.tailabc12.ts.net`. Itulah `ALAMAT-PUBLIK` di bawah.
   Funnel masih beta; batas bandwidth tidak dipublikasikan. Bila terasa terbatas, pindah ke Cloudflare Tunnel.

## C. Pasang backend
1. Pastikan folder `deploy/` sudah di-push ke GitHub.
2. Di server:
   ```
   curl -fsSL https://raw.githubusercontent.com/Dwi-Susilo/asatunes/main/deploy/setup-server.sh -o setup-server.sh
   sudo bash setup-server.sh ALAMAT-PUBLIK https://github.com/Dwi-Susilo/asatunes.git
   ```
   Skrip bertanya: alamat frontend (isi alamat Vercel/Netlify; boleh diganti nanti), email dan kata sandi admin,
   serta `YOUTUBE_API_KEY`. Skrip memasang paket, membuat database dan `.env`, migrasi, akun admin, cron, dan Nginx.
   Skrip ini mengisi `TRUSTED_PROXIES=127.0.0.1` supaya backend mengenali klien asli di belakang Funnel.
3. Uji dari laptopmu (bukan dari server):
   ```
   curl https://ALAMAT-PUBLIK/up
   curl "https://ALAMAT-PUBLIK/api/v1/music/trending"
   ```
4. **Periksa bahwa Funnel meneruskan alamat klien dengan benar.** Di server:
   ```
   curl -s https://ALAMAT-PUBLIK/up > /dev/null
   sudo tail -n 3 /var/log/nginx/asatunes.access.log
   ```
   Baris log memuat `xff=` dan `proto=`. Yang diharapkan: `xff=` berisi alamat IP publik klien dan `proto=https`.
   Bila keduanya kosong, Funnel tidak mengirim header itu; kabari saya sebelum frontend dihubungkan, karena
   pembatas laju, hash IP Pengunjung, dan tautan audio bertanda tangan bergantung padanya.
5. **Uji pemutaran satu lagu** dari frontend (lihat Masalah umum).

## D. Frontend
Di Vercel/Netlify, atur variabel `VITE_API_URL=https://ALAMAT-PUBLIK/api/v1`, lalu deploy. Setelah frontend punya alamat
tetap, pastikan `FRONTEND_URL` di `.env` server sama persis dengannya (tanpa `/` akhir), lalu `config:cache`.

## Memperbarui setelah ada perubahan kode
Di laptop: `git push` ke `main`. Lalu di server:
```
sudo -u www-data -H bash /var/www/asatunes/deploy/deploy.sh
```
`.env` dan database tidak tersentuh. Jangan mengubah kode langsung di server.

## Mengubah .env di server
Edit `/var/www/asatunes/backend/.env`, lalu: `cd /var/www/asatunes/backend && sudo -u www-data php artisan config:cache`.
Yang perlu diisi kemudian: `MAIL_*` (tanpa SMTP sungguhan, email reset kata sandi hanya ditulis ke log).

## Hal yang sengaja diatur
- **PHP-FPM `pm.max_children = 20`.** Audio dialirkan lewat backend; satu pendengar memakai satu worker selama lagu mengalir.
- **Kecepatan unggah internet rumah** menentukan berapa pendengar bersamaan (kira-kira 1 MB per menit per pendengar).
- **yt-dlp** di `/opt/yt-dlp/yt-dlp` milik `www-data`, diperbarui tiap Minggu 03:30 oleh scheduler.
- **Cron scheduler** di `/etc/cron.d/asatunes`. Tanpanya IP Pengunjung tidak dikosongkan (D9) dan Trending tidak diperbarui.
- **`TRUSTED_PROXIES=127.0.0.1`**: hanya agen tunnel di mesin yang sama yang dipercaya. Jangan isi `*` kecuali server hanya
  bisa dijangkau lewat proxy.

## Masalah umum
| Gejala | Penyebab dan jalan keluar |
| :--- | :--- |
| Pemutaran gagal, log berisi `Sign in to confirm you're not a bot` | YouTube memblokir IP. Dari IP rumah jarang terjadi; bila terjadi, coba cookies YouTube untuk yt-dlp. |
| Audio ditolak `403` | Tautan bertanda tangan tidak cocok: periksa `APP_URL` (harus `https://ALAMAT-PUBLIK`), `TRUSTED_PROXIES`, dan langkah C.4. |
| `502 Bad Gateway` di alamat publik | Nginx atau PHP-FPM mati: `sudo systemctl status nginx php*-fpm`. |
| `500` setelah deploy | Lihat `backend/storage/logs/laravel.log`. |
| Browser: "blocked by CORS" | `FRONTEND_URL` harus sama persis dengan alamat frontend. Lalu `config:cache`. |
| Trending kosong | `YOUTUBE_API_KEY` belum diisi, atau jalankan `php artisan trending:refresh`. |
| Server tidak bisa dibuka setelah listrik mati | Pastikan komputer menyala dan tersambung; Nginx, MariaDB, dan Tailscale hidup otomatis. |

## Belum diuji
Skrip belum pernah dijalankan di server sungguhan (hanya diperiksa sintaksnya), tidak diuji di Ubuntu 26.04, dan aplikasi
belum pernah dijalankan dengan MariaDB (tes otomatis memakai SQLite). Perilaku header Funnel belum terbukti.
Jalankan langkah demi langkah dan kirim pesan galat bila ada yang gagal.
