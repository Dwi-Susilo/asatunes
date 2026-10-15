# Software Requirements Specification (SRS) - ASATunes v1.0

## 1. Pendahuluan
**ASATunes** adalah aplikasi *music streaming* lintas platform (*decoupled monorepo*) yang mengombinasikan metadata tekstual/visual dari **Spotify Web API** dan mekanisme pemutaran audio/video resmi dari **YouTube Data API & Player SDK**.

### Stack Teknologi:
* **Backend**: Laravel 12 (RESTful API, Auth Sanctum/JWT, Caching System)
* **Frontend Web**: React.js (Redux Toolkit / Zustand State Management)
* **Mobile App**: Kotlin Android Native (Jetpack Compose, StateFlow/ViewModel)
* **Audio Engine**: YouTube IFrame Player API (Web) & YouTube Player SDK / Embedded Player (Android)
* **Metadata & Recommendation Engine**: Spotify Web API (Search, Top Charts & Recommendations API)
* **Lyrics Engine**: LRCLIB / Musixmatch API (Synced Lyrics)

---

## 2. Arsitektur & Aturan Integrasi Pemutaran Audio

### A. YouTube Player Integration & Compliance
- **Mekanisme Pemutaran**: Pemutaran musik dilakukan melalui **YouTube IFrame Player SDK** (Web) dan **YouTube Android Player API / Embedded WebView** (Mobile) secara tersembunyi/mini-player sesuai *Terms of Service* YouTube. Backend **TIDAK** mengekstrak atau mengunduh berkas MP3 secara ilegal.
- **Strategi YouTube Topic Channel**: Pencarian otomatis diprioritaskan ke saluran resmi `[Nama Artis] - Topic` untuk menjamin kualitas audio murni tanpa video klip/dialog awal.
- **Penanganan Kegagalan (Fallback & Error Handling)**:
  - Jika video YouTube dibatasi (*age-restricted* / *region-blocked*) atau tidak dapat diputar (`onError` event):
    1. System otomatis mencoba kandidat `youtube_video_id` sekunder dari tabel `song_sources`.
    2. Jika tetap gagal, sistem menampilkan notifikasi *toast* `"Lagu tidak dapat diputar saat ini"` dan otomatis memutar lagu berikutnya di antrean (*auto-skip*).

---

## 3. Fitur Utama (Requirements)

### 1. Autentikasi & Profil Pengguna
- **Pendaftaran & Login**: Register (`name`, `email`, `password`), Login (Mendapatkan Bearer Token).
- **Logout**: Membatalkan/menghapus token akses pengguna (`POST /api/v1/auth/logout`).
- **Kelola Profil**:
  - `GET /api/v1/profile`: Mengambil detail profil user beserta `avatar_url`.
  - `PATCH /api/v1/profile`: Memperbarui nama dan unggah foto profil (avatar).
  - `PUT /api/v1/profile/password`: Mengubah kata sandi pengguna dengan verifikasi kata sandi lama.

### 2. Dashboard Admin & Otorisasi
- **Manajemen Pengguna**:
  - Melihat seluruh daftar pengguna beserta status (`active`/`blocked`).
  - Memblokir akun (`POST /api/v1/admin/users/{id}/block`) dan Membuka blokir (`POST /api/v1/admin/users/{id}/unblock`).
  - Menghapus akun pengguna permanen (`DELETE /api/v1/admin/users/{id}`).
  - Mengubah role pengguna (`admin`/`user`).
- **Ringkasan Statistik Sistem**:
  - Menampilkan total pengguna terdaftar, total playlist aktif, dan daftar lagu yang paling sering diputar (dikalkulasi dari tabel `song_plays`).

### 3. Manajemen Musik & Hybrid API
- **Pencarian Musik**: Mengambil metadata lagu rapi (judul, artis, album, cover art) via Spotify API.
- **Antrean Pintar (Smart Queue / Dynamic Radio)**:
  - Menggenerasi antrean lagu otomatis via Spotify Recommendations API (`seed_tracks`/`seed_artists`).
  - Pengelolaan antrean lokal (*Shuffle*, *Repeat*, *Next/Prev*) dikelola oleh *State Management* di Frontend (React/Kotlin).
- **Sinkronisasi Durasi & Synced Lyrics**:
  - Durasi pemutaran diambil secara *real-time* dari YouTube Player Engine (`player.getDuration()`).
  - Lirik ter-sinkronisasi di-fetch via LRCLIB API berdasarkan `title` dan `artist`.
- **Pencatatan Pemutaran (`Song Plays`)**:
  - Frontend memanggil `POST /api/v1/music/{song_id}/play` hanya ketika lagu telah diputar setidaknya **> 30 detik** untuk pencatatan statistik yang akurat.

### 4. Playlist & Favorit Pengguna
- **Pengelolaan Playlist**: CRUD Playlist pribadi (Judul, Deskripsi, Foto Sampul).
- **Pengaturan Urutan Lagu**: Mendukung pengurutan posisi lagu dalam playlist (`position`).
- **Lagu Favorit (Liked Songs)**: Menambahkan/menghapus lagu ke daftar Favorit (`/api/v1/favorites`).

---

## 4. Keamanan & Kebijakan Otorisasi Backend

1. **Autentikasi (Sanctum/JWT Middleware)**: Seluruh endpoint terproteksi wajib menyertakan header `Authorization: Bearer <token>`.
2. **Otorisasi Role Admin (`EnsureUserIsAdmin` Middleware)**: Endpoint `/api/v1/admin/*` dilindungi middleware khusus yang mengecek `user.role == 'admin'`. Akses ilegal akan merespons HTTP 403 Forbidden.
3. **Validasi Kepemilikan (Laravel Policy / Ownership Check)**: Operasi pembaharuan/penghapusan playlist memverifikasi bahwa `playlist.user_id == auth()->id()`.
4. **Validasi Input & Throttle**:
  - Validasi ketat pada request input (FormRequest).
  - Rate Limiting Login: Maksimal 5 kali percobaan per menit per IP (HTTP 429 Too Many Requests).
  - Rate Limiting API General: Maksimal 60 request per menit per token.

---

## 5. Rancangan Basis Data (Database Schema)

### A. Tabel `users`
- `id` (PK, BigInt)
- `name` (Varchar)
- `email` (Varchar, Unique)
- `password` (Varchar)
- `avatar_url` (Varchar, Nullable)
- `status` (Enum: `'active'`, `'blocked'`, Default: `'active'`)
- `role` (Enum: `'admin'`, `'user'`, Default: `'user'`)
- `created_at`, `updated_at` (Timestamp)

### B. Tabel `songs` (Master Metadata Lagu)
- `id` (PK, BigInt)
- `spotify_id` (Varchar, Unique)
- `title` (Varchar)
- `artist` (Varchar)
- `album` (Varchar)
- `cover_url` (Varchar)
- `duration_ms` (Integer)
- `created_at`, `updated_at` (Timestamp)

### C. Tabel `song_sources` (Pemetaan Sumber Audio YouTube)
- `id` (PK, BigInt)
- `song_id` (FK -> songs.id, Delete Cascade)
- `youtube_video_id` (Varchar)
- `is_primary` (Boolean, Default: true)
- `created_at`, `updated_at` (Timestamp)

### D. Tabel `playlists`
- `id` (PK, BigInt)
- `user_id` (FK -> users.id, Delete Cascade)
- `title` (Varchar)
- `description` (Text, Nullable)
- `created_at`, `updated_at` (Timestamp)

### E. Tabel `playlist_song` (Pivot Table Relasi Playlist)
- `id` (PK, BigInt)
- `playlist_id` (FK -> playlists.id, Delete Cascade)
- `song_id` (FK -> songs.id, Delete Cascade)
- `position` (Integer, Default: 1)
- `created_at` (Timestamp)
- *Constraint*: UNIQUE (`playlist_id`, `song_id`)

### F. Tabel `favorites` (Relasi Lagu Favorit User)
- `id` (PK, BigInt)
- `user_id` (FK -> users.id, Delete Cascade)
- `song_id` (FK -> songs.id, Delete Cascade)
- `created_at` (Timestamp)
- *Constraint*: UNIQUE (`user_id`, `song_id`)

### G. Tabel `song_plays` (Riwayat Pemutaran Lagu)
- `id` (PK, BigInt)
- `user_id` (FK -> users.id, Delete Cascade)
- `song_id` (FK -> songs.id, Delete Cascade)
- `played_at` (Timestamp)

---

## 6. Rancangan RESTful API (Backend Laravel 12)

| Method | Endpoint | Deskripsi | Access Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Pendaftaran akun pengguna baru | Public |
| `POST` | `/api/v1/auth/login` | Login & mendapatkan API token | Public |
| `POST` | `/api/v1/auth/logout` | Revoke/menghapus token aktif | Authenticated User |
| `GET` | `/api/v1/profile` | Mengambil data profil user | Authenticated User |
| `PATCH` | `/api/v1/profile` | Memperbarui nama / avatar profil | Authenticated User |
| `PUT` | `/api/v1/profile/password` | Mengubah kata sandi user | Authenticated User |
| `GET` | `/api/v1/music/trending` | Mengambil lagu trending (via Cache/Spotify) | Authenticated User |
| `GET` | `/api/v1/music/search` | Pencarian lagu (Spotify + YouTube Video ID) | Authenticated User |
| `GET` | `/api/v1/music/recommendations` | Mengambil rekomendasi *Smart Queue* | Authenticated User |
| `POST` | `/api/v1/music/{song_id}/play` | Mencatat riwayat pemutaran (>30 detik) | Authenticated User |
| `GET` | `/api/v1/music/{spotify_id}/lyrics` | Mengambil lirik lagu (*Synced LRC*) | Authenticated User |
| `GET` | `/api/v1/favorites` | Menampilkan daftar lagu favorit user | Authenticated User |
| `POST` | `/api/v1/favorites/{song_id}` | Menambahkan lagu ke favorit | Authenticated User |
| `DELETE` | `/api/v1/favorites/{song_id}` | Menghapus lagu dari favorit | Authenticated User |
| `GET` | `/api/v1/playlists` | Menampilkan playlist milik user | Authenticated User |
| `POST` | `/api/v1/playlists` | Membuat playlist baru | Authenticated User |
| `PUT` | `/api/v1/playlists/{id}` | Mengubah judul/deskripsi playlist | Owner User Only |
| `DELETE` | `/api/v1/playlists/{id}` | Menghapus playlist | Owner User Only |
| `POST` | `/api/v1/playlists/{id}/songs` | Menambahkan lagu ke playlist | Owner User Only |
| `DELETE` | `/api/v1/playlists/{id}/songs/{song_id}` | Menghapus lagu dari playlist | Owner User Only |
| `PATCH` | `/api/v1/playlists/{id}/reorder` | Mengubah urutan lagu (`position`) | Owner User Only |
| `GET` | `/api/v1/admin/users` | Menampilkan seluruh daftar pengguna | Admin Only |
| `POST` | `/api/v1/admin/users/{id}/block` | Memblokir akun pengguna | Admin Only |
| `POST` | `/api/v1/admin/users/{id}/unblock` | Membuka blokir akun pengguna | Admin Only |
| `DELETE` | `/api/v1/admin/users/{id}` | Menghapus akun pengguna permanen | Admin Only |
| `GET` | `/api/v1/admin/stats` | Ringkasan statistik sistem (user, playlist, top plays) | Admin Only |

---

## 7. Persyaratan Non-Fungsional (Non-Functional Requirements)

### 1. Kinerja (Performance)
- **Response Time**: Response time API untuk request berkategori cache (Trending/Search populer) harus `< 200 ms`. Request pemetaan baru Spotify/YouTube `< 1.5 detik`.
- **Concurrent Users**: Sanggup melayani minimal 100 request bersamaan tanpa peningkatan latency mendadak.

### 2. Keamanan (Security)
- **Password Hashing**: Menggunakan algoritma `Bcrypt` atau `Argon2id`.
- **Token Expiry**: Bearer token diset kadaluarsa dalam 30 hari (dapat diperbarui).
- **Data Protection**: Mencegah SQL Injection via Eloquent ORM Binding, dan Sanitasi XSS pada input teks.

### 3. Keandalan & Toleransi Kesalahan (Reliability)
- **Graceful Degradation**: Jika Spotify API atau YouTube API mengalami *rate-limiting* / *downtime*, backend mengembalikan respon fallback dari data cache lokal tanpa *crash* (500 Error).

### 4. Kriteria Penerimaan Pengujian (Acceptance Criteria)
- **Pengujian Role**: User dengan role `'user'` dipastikan mendapat respon `403 Forbidden` jika mengakses endpoint `/api/v1/admin/*`.
- **Pengujian Isosiasi Data**: User A tidak dapat menambahkan/menghapus lagu pada playlist milik User B.
- **Pengujian Status Blokir**: Account bertanda `status = 'blocked'` akan ditolak saat mencoba login atau memanggil API.