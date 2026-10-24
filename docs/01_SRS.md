# Software Requirements Specification (SRS) - ASATunes v1.1

## Riwayat Revisi
| Versi | Perubahan |
| :--- | :--- |
| 1.0 | Rancangan awal: Spotify (metadata) + YouTube IFrame Player (audio) |
| 1.1 | Pemutaran audio via ekstraksi yt-dlp; Spotify dihapus; metadata dari YouTube; Smart Queue berdasarkan artis/album (bukan judul); Trending di-cache 7 hari; identitas lagu diseragamkan ke `youtube_id`; endpoint yang kurang ditambahkan; sampul playlist dibuat otomatis dari cover lagu |
| 1.1 (rev. 24 Okt 2026) | Penyesuaian dengan implementasi backend; lihat "Catatan Revisi" di akhir dokumen |

---

## 1. Pendahuluan
**ASATunes** adalah aplikasi *music streaming* lintas platform (*decoupled monorepo*) yang memutar **audio saja** dari YouTube. Backend mengekstrak URL audio menggunakan **yt-dlp**, lalu klien memutarnya dengan pemutar audio biasa. Aplikasi **tidak menyimpan berkas audio**; yang disimpan hanya metadata lagu.

### Stack Teknologi
* **Backend**: Laravel 12 (RESTful API, Auth Sanctum, Caching System, Task Scheduler)
* **Frontend Web**: React.js (Redux Toolkit / Zustand), pemutaran dengan elemen `<audio>`
* **Mobile App**: Kotlin Android Native (Jetpack Compose, StateFlow/ViewModel), pemutaran dengan ExoPlayer (Media3)
* **Ekstraksi Audio & Pencarian**: yt-dlp (dijalankan dari backend via `Symfony Process`)
* **Trending**: YouTube Data API v3 (`videos.list`, `chart=mostPopular`)
* **Lyrics Engine**: LRCLIB API

### Aktor Sistem
- **User**: pengguna terdaftar yang memutar musik, mengelola profil, playlist, dan favorit.
- **Admin**: pengelola sistem yang masuk ke dashboard admin untuk mengelola pengguna dan melihat statistik.
- **Aktor eksternal**: YouTube (yt-dlp / Data API) dan LRCLIB API.

**Catatan**: Admin dan User dimodelkan sebagai **aktor terpisah** (tanpa pewarisan aktor) karena Admin memiliki jalur autentikasi dan akses ke dashboard tersendiri. Keduanya memakai mekanisme login yang sama; setelah login, Admin diarahkan ke dashboard berdasarkan `role`. Akun Admin **tetap boleh** memakai seluruh fitur User (memutar musik, mengelola playlist dan favorit pribadi). Karena itu, pada tabel API di bagian 6, peran "Authenticated User" mencakup Admin yang sudah login.

---

## 2. Arsitektur & Aturan Pemutaran Audio

### A. Alur Pemutaran
1. Klien memanggil `GET /api/v1/music/search?q=` → backend menjalankan `yt-dlp ytsearch10:` dan mengembalikan daftar hasil (`youtube_id`, judul, artis, thumbnail, durasi).
2. Klien memilih lagu dan memanggil `GET /api/v1/music/stream?query={youtube_id}`.
3. Backend menjalankan `yt-dlp -j -f ba/ba*` (satu panggilan yang menghasilkan URL audio sekaligus metadata `artist`, `album`, dan `track` bila tersedia), melakukan *upsert* lagu ke tabel `songs`, lalu mengembalikan `song_id` dan `stream_url`.
4. Klien memutar `stream_url`. Jika diperlukan (masalah CORS/IP terikat), audio diteruskan melalui `GET /api/v1/music/proxy-audio`.

### B. Aturan Proxy Audio
- Endpoint wajib autentikasi.
- Parameter `url` hanya boleh bertuju ke host `*.googlevideo.com` dengan skema `https` (mencegah SSRF).
- Mendukung header `Range` agar *seek* berfungsi, dan meneruskan `Content-Type` asli dari sumber.
- Tidak menggunakan `Access-Control-Allow-Origin: *`; gunakan konfigurasi CORS Laravel dengan daftar origin yang diizinkan.

### C. Cache & Penanganan Kegagalan
- Hasil ekstraksi (`stream_url`) di-cache **1–2 jam** per `youtube_id` (URL kedaluwarsa sekitar 6 jam dan terikat IP server).
- Jika ekstraksi gagal atau pemutaran error:
  1. Backend mencoba ulang sekali dengan pencarian `ytsearch1:{artis} {judul}`.
  2. Jika tetap gagal, klien menampilkan *toast* `"Lagu tidak dapat diputar saat ini"` dan otomatis memutar lagu berikutnya di antrean (*auto-skip*).
- Respons error ke klien **tidak boleh** menyertakan output debug (stderr yt-dlp) atau pesan exception mentah; detail dicatat di log server.

### D. Batasan & Risiko yang Diakui
- Ekstraksi audio di luar pemutar resmi **tidak sejalan dengan Terms of Service YouTube**. Proyek ini ditujukan untuk keperluan akademik/prototipe non-komersial dan tidak dipublikasikan secara terbuka.
- Ketergantungan pada yt-dlp: harus diperbarui berkala karena YouTube sering mengubah mekanismenya.
- IP server (terutama datacenter) bisa dibatasi atau diminta verifikasi oleh YouTube.
- Waktu ekstraksi sekitar 2–5 detik per lagu baru.

---

## 3. Fitur Utama (Requirements)

### 1. Autentikasi & Profil Pengguna
- **Pendaftaran & Login**: Register (`name`, `email`, `password`), Login (mendapatkan Bearer Token **Laravel Sanctum**).
- **Logout**: Menghapus token akses aktif (`POST /api/v1/auth/logout`).
- **Kelola Profil**:
  - `GET /api/v1/profile`: detail profil beserta `avatar_url`.
  - `PATCH /api/v1/profile`: memperbarui nama dan unggah foto profil.
  - `PUT /api/v1/profile/password`: mengubah kata sandi dengan verifikasi kata sandi lama.

### 2. Dashboard Admin & Otorisasi
- **Manajemen Pengguna**:
  - Melihat daftar pengguna beserta status (`active`/`blocked`), dengan paginasi.
  - Memblokir/membuka blokir akun. Saat diblokir, seluruh token aktif user dihapus.
  - Menghapus akun pengguna permanen.
  - Mengubah role pengguna (`admin`/`user`).
  - Admin tidak boleh memblokir, menghapus, atau menurunkan role dirinya sendiri, dan tidak boleh menghapus/menurunkan admin terakhir.
- **Ringkasan Statistik Sistem**: total pengguna, total playlist, dan lagu paling sering diputar (dari `song_plays`, di-cache).

### 3. Manajemen Musik
- **Pencarian Musik**: via yt-dlp (`ytsearch10:`), query divalidasi (maks. 100 karakter) dan di-cache untuk query populer.
- **Trending**:
  - Data diambil dari YouTube Data API `videos.list` dengan `chart=mostPopular`, `videoCategoryId=10` (Musik), `regionCode=ID`, `maxResults=24`.
  - Hasil di-cache **7 hari** dan diperbarui otomatis oleh Laravel Scheduler **seminggu sekali** (dikerjakan satu kali per minggu, sehingga kuota yang terpakai minimal).
  - Jika pembaruan gagal, sistem tetap menyajikan data minggu sebelumnya (*stale cache*), dan **tidak** menyimpan hasil kosong ke cache.
- **Antrean Pintar (Smart Queue / Radio)**:
  - Antrean dibangun dari **artis (dan album, bila tersedia) lagu yang sedang diputar**, bukan dari judul. Judul tidak dipakai sebagai kata kunci karena memunculkan lagu lain yang kebetulan berjudul sama.
  - Sumber data: kolom `artist` dan `album` pada tabel `songs`. `artist` dibersihkan dari akhiran seperti " - Topic", "VEVO", dan "Official". `album` hanya terisi bila metadata YouTube menyediakannya (umumnya pada unggahan channel "Artis - Topic"); jika kosong, antrean memakai artis saja.
  - Cara mengumpulkan kandidat:
    1. Jika `album` tersedia: `yt-dlp "ytsearch15:{artis} {album}"` (kandidat dari album diprioritaskan).
    2. Kandidat dari artis: `yt-dlp --flat-playlist "ytsearch30:{artis}"`.
  - Aturan penyaringan:
    1. Nama artis harus muncul pada channel/uploader atau judul hasil (membuang lagu artis lain).
    2. Buang lagu yang sedang diputar dan semua entri yang judul ternormalisasinya sama dengan lagu tersebut.
    3. Setiap judul ternormalisasi hanya boleh muncul **sekali** di antrean, sehingga semua lagu dalam antrean berjudul berbeda. Normalisasi: huruf kecil, tanpa tanda baca, tanpa kata "official", "video", "lyric", "lirik", "audio", "live", "remastered", "mv", "hd", "4k".
    4. Abaikan durasi di luar 60 detik sampai 10 menit (menyaring kompilasi, *full album*, dan potongan pendek).
    5. Ambil 15–20 lagu; entri dari album yang sama ditaruh di depan, sisanya diacak.
  - Fallback: jika setelah penyaringan kurang dari 10 lagu (artis tidak dikenal atau hasil sedikit), lengkapi dari cache Trending (di luar lagu yang sedang diputar).
  - Hasil di-cache **per artis** (misalnya 24 jam), sehingga semua lagu dari artis yang sama memakai satu kali pencarian dan kuota/proses yt-dlp hemat.
  - Rekomendasi **tidak** dihitung dari data `song_plays` atau `favorites` pengguna.
  - Pengelolaan antrean lokal (*Shuffle*, *Repeat*, *Next/Prev*) ditangani *State Management* di frontend.
- **Lirik**: diambil via LRCLIB (`/api/get`, lalu fallback `/api/search`) berdasarkan `title` dan `artist` yang sudah dibersihkan dari kata seperti "official", "lyric", dan sejenisnya; hasil di-cache.
- **Pencatatan Pemutaran (`Song Plays`)**:
  - Frontend memanggil `POST /api/v1/music/{song_id}/play` hanya ketika lagu telah diputar **> 30 detik**.
  - Server membatasi frekuensi pencatatan per user per lagu (mis. maks. 1 kali per 30 detik) untuk mencegah manipulasi statistik.
  - Data dipakai untuk statistik admin, bukan untuk rekomendasi.

### 4. Playlist & Favorit Pengguna
- **Pengelolaan Playlist**: CRUD playlist pribadi (judul dan deskripsi). Pengguna tidak mengunggah foto sampul.
- **Sampul Playlist Otomatis**: sampul disusun otomatis dari cover lagu di dalam playlist:
  - Diambil maksimal 4 cover dari lagu dengan `position` terkecil, dengan thumbnail yang berbeda.
  - Tata letak: 0 lagu = gambar placeholder bawaan; 1 lagu = satu gambar penuh; 2 lagu = dua panel berdampingan; 3 lagu = satu gambar besar di kiri dan dua gambar bertumpuk di kanan; 4 lagu atau lebih = kisi 2×2.
  - Backend hanya mengirim daftar URL (`cover_thumbnails`, maksimal 4); penyusunan gambar dilakukan di klien (CSS grid di web, Compose di Android) dengan pemotongan tengah (*center-crop*). Tidak ada berkas gambar yang dibuat atau disimpan di server.
  - Jika `songs.thumbnail` kosong, klien memakai `https://i.ytimg.com/vi/{youtube_id}/hqdefault.jpg`.
  - Sampul ikut berubah otomatis saat lagu ditambah, dihapus, atau diurutkan ulang.
  - Daftar playlist mengambil cover dengan eager loading terbatas (maksimal 4 lagu per playlist) untuk menghindari query N+1.
- **Detail Playlist**: `GET /api/v1/playlists/{id}` mengembalikan lagu terurut berdasarkan `position`.
- **Pengaturan Urutan**: posisi lagu baru = `max(position)+1`; reorder dilakukan dalam transaksi database.
- **Lagu Favorit**: menambah/menghapus/melihat daftar favorit (`/api/v1/favorites`).

---

## 4. Keamanan & Kebijakan Otorisasi Backend

1. **Autentikasi (Sanctum)**: seluruh endpoint terproteksi wajib header `Authorization: Bearer <token>`, **termasuk `stream`, `search`, dan `proxy-audio`**. Token berlaku 30 hari; setelah kedaluwarsa pengguna login ulang (Sanctum tidak memiliki refresh token).
2. **Otorisasi Admin (`EnsureUserIsAdmin` Middleware)**: endpoint `/api/v1/admin/*` mengecek `user.role == 'admin'`, selain itu HTTP 403.
3. **Pengecekan Status Akun**: middleware memeriksa `status != 'blocked'` pada setiap request; akun diblokir ditolak saat login maupun memanggil API.
4. **Validasi Kepemilikan (Laravel Policy)**: operasi playlist memverifikasi `playlist.user_id == auth()->id()`.
5. **Validasi Input & Throttle**:
   - FormRequest untuk semua input.
   - Login: maks. 5 percobaan per menit per kombinasi email + IP (HTTP 429).
   - API umum: maks. 60 request per menit per token.
   - `search` dan `stream` memiliki limit lebih ketat (mis. 20 per menit per token) karena menjalankan proses yt-dlp.
6. **Keamanan Proses Eksternal**: yt-dlp dijalankan dengan *array argument* (tanpa shell), timeout 30 detik, dan jumlah proses yt-dlp bersamaan dibatasi.

---

## 5. Rancangan Basis Data (Database Schema)

### A. Tabel `users`
- `id` (PK, BigInt), `name` (Varchar), `email` (Varchar, Unique), `password` (Varchar)
- `avatar_url` (Varchar, Nullable)
- `status` (Enum: `'active'`, `'blocked'`, Default: `'active'`)
- `role` (Enum: `'admin'`, `'user'`, Default: `'user'`)
- `created_at`, `updated_at`

### B. Tabel `songs` (Master Metadata Lagu)
- `id` (PK, BigInt)
- `youtube_id` (Varchar(11), Unique)
- `title` (Varchar)
- `artist` (Varchar)
- `album` (Varchar, Nullable)
- `thumbnail` (Varchar, Nullable)
- `duration_sec` (Integer, Nullable)
- `created_at`, `updated_at`
- *Catatan*: hanya metadata; **tidak ada berkas audio** yang disimpan. Baris dibuat (*upsert*) saat lagu pertama kali diputar atau ditambahkan ke playlist/favorit.

### C. Tabel `playlists`
- `id` (PK), `user_id` (FK → users.id, Cascade), `title`, `description` (Text, Nullable), `created_at`, `updated_at`
- *Catatan*: tidak ada kolom sampul; sampul dibuat otomatis dari `songs.thumbnail` (lihat bagian 3.4).

### D. Tabel `playlist_song`
- `id` (PK), `playlist_id` (FK, Cascade), `song_id` (FK, Cascade), `position` (Integer), `created_at`
- *Constraint*: UNIQUE (`playlist_id`, `song_id`). Indeks: (`playlist_id`, `position`).

### E. Tabel `favorites`
- `id` (PK), `user_id` (FK, Cascade), `song_id` (FK, Cascade), `created_at`
- *Constraint*: UNIQUE (`user_id`, `song_id`)

### F. Tabel `song_plays`
- `id` (PK), `user_id` (FK → users.id, Nullable, Set Null), `song_id` (FK, Cascade), `played_at`
- Indeks: (`song_id`, `played_at`)
- *Catatan*: `user_id` nullable agar statistik tidak hilang saat akun dihapus.

### Perubahan dari v1.0
- Tabel `song_sources` **dihapus** (tidak ada pemetaan Spotify→YouTube).
- `songs.spotify_id` → `songs.youtube_id`; `album` menjadi nullable (terisi bila tersedia dari metadata YouTube); `cover_url` → `thumbnail`; `duration_ms` → `duration_sec`.
- Trending tidak lagi memakai tabel terpisah; data disimpan di cache.

---

## 6. Rancangan RESTful API (Backend Laravel 12)

| Method | Endpoint | Deskripsi | Access Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Pendaftaran akun baru | Public |
| `POST` | `/api/v1/auth/login` | Login & mendapatkan token | Public |
| `POST` | `/api/v1/auth/logout` | Menghapus token aktif | Authenticated User |
| `GET` | `/api/v1/profile` | Mengambil data profil | Authenticated User |
| `PATCH` | `/api/v1/profile` | Memperbarui nama / avatar | Authenticated User |
| `PUT` | `/api/v1/profile/password` | Mengubah kata sandi | Authenticated User |
| `GET` | `/api/v1/music/trending` | Lagu trending (YouTube mostPopular, cache 7 hari) | Authenticated User |
| `GET` | `/api/v1/music/search?q=` | Pencarian lagu via yt-dlp | Authenticated User |
| `GET` | `/api/v1/music/stream?query=` | Upsert lagu, mengembalikan `song_id` dan `stream_url` | Authenticated User |
| `GET` | `/api/v1/music/proxy-audio?url=` | Meneruskan audio (hanya host googlevideo.com, mendukung Range) | Authenticated User |
| `GET` | `/api/v1/music/{youtube_id}/recommendations` | Antrean otomatis (berdasarkan artis/album) | Authenticated User |
| `GET` | `/api/v1/music/lyrics?title=&artist=` | Mengambil lirik (LRCLIB) | Authenticated User |
| `POST` | `/api/v1/music/{song_id}/play` | Mencatat pemutaran (>30 detik) | Authenticated User |
| `GET` | `/api/v1/favorites` | Daftar lagu favorit | Authenticated User |
| `POST` | `/api/v1/favorites/{song_id}` | Menambah favorit | Authenticated User |
| `DELETE` | `/api/v1/favorites/{song_id}` | Menghapus favorit | Authenticated User |
| `GET` | `/api/v1/playlists` | Daftar playlist milik user beserta `cover_thumbnails` (maks. 4 URL) | Authenticated User |
| `POST` | `/api/v1/playlists` | Membuat playlist | Authenticated User |
| `GET` | `/api/v1/playlists/{id}` | Detail playlist beserta lagu terurut | Owner User Only |
| `PUT` | `/api/v1/playlists/{id}` | Mengubah judul/deskripsi | Owner User Only |
| `DELETE` | `/api/v1/playlists/{id}` | Menghapus playlist | Owner User Only |
| `POST` | `/api/v1/playlists/{id}/songs` | Menambah lagu ke playlist | Owner User Only |
| `DELETE` | `/api/v1/playlists/{id}/songs/{song_id}` | Menghapus lagu dari playlist | Owner User Only |
| `PATCH` | `/api/v1/playlists/{id}/reorder` | Mengubah urutan lagu | Owner User Only |
| `GET` | `/api/v1/admin/users` | Daftar pengguna (paginasi) | Admin Only |
| `POST` | `/api/v1/admin/users/{id}/block` | Memblokir akun | Admin Only |
| `POST` | `/api/v1/admin/users/{id}/unblock` | Membuka blokir | Admin Only |
| `PATCH` | `/api/v1/admin/users/{id}/role` | Mengubah role | Admin Only |
| `DELETE` | `/api/v1/admin/users/{id}` | Menghapus akun permanen | Admin Only |
| `GET` | `/api/v1/admin/stats` | Statistik sistem (user, playlist, top plays) | Admin Only |

**Konvensi umum**: respons sukses `{ "status": "success", "data": ... }`, respons error `{ "status": "error", "message": "..." }`; endpoint daftar menggunakan paginasi (`page`, `per_page`).

---

## 7. Persyaratan Non-Fungsional

### 1. Kinerja
- Endpoint berbasis cache (trending, lirik, rekomendasi yang sudah pernah diminta): `< 200 ms`.
- Ekstraksi audio lagu baru (yt-dlp): `< 5 detik`; hasil di-cache.
- Mampu melayani minimal 100 request bersamaan untuk endpoint non-yt-dlp. Proses yt-dlp dibatasi jumlah konkurensinya.

### 2. Keamanan
- Password di-hash dengan `Bcrypt` atau `Argon2id`.
- Mencegah SQL Injection via Eloquent, dan sanitasi XSS pada input teks.
- Tidak ada kebocoran informasi internal pada respons error.

### 3. Keandalan
- **Graceful Degradation**: jika YouTube API/yt-dlp gagal atau terkena *rate limit*, backend mengembalikan data cache terakhir atau pesan error terkontrol, bukan HTTP 500 mentah.
- Hasil kosong akibat kegagalan tidak boleh disimpan ke cache.

### 4. Pemeliharaan
- yt-dlp diperbarui berkala (mis. terjadwal mingguan) dan versi yang terpasang dicatat di log.

### 5. Kriteria Penerimaan Pengujian
- **Role**: user `'user'` mendapat `403 Forbidden` saat mengakses `/api/v1/admin/*`.
- **Isolasi Data**: User A tidak dapat mengubah atau melihat detail playlist milik User B.
- **Status Blokir**: akun `status = 'blocked'` ditolak saat login maupun memanggil API, dan token lamanya tidak berlaku.
- **Proxy Audio**: permintaan `proxy-audio` ke host selain `*.googlevideo.com` ditolak (HTTP 422/403).
- **Trending**: saat API YouTube gagal, endpoint tetap mengembalikan data minggu sebelumnya.
- **Antrean Otomatis**: semua lagu dalam respons rekomendasi berjudul berbeda (judul ternormalisasi), tidak memuat lagu yang sedang diputar, dan berasal dari artis (atau album) yang sama dengan lagu tersebut.

---

## Catatan Revisi (24 Oktober 2026)

SRS v1.1 tetap berlaku dengan penyesuaian di bawah ini agar sesuai dengan implementasi backend (rincian lengkap di `02_API.md` v1.1). **Jika ada pertentangan dengan isi di atas, catatan ini yang berlaku.**

1. **Pemutaran audio (mengganti 2.A langkah 3-4, 2.B, tabel bagian 6, dan bagian 4 poin 1):** endpoint `proxy-audio` dihapus. `GET /music/stream` mengembalikan `song_id`, `play_url`, dan `expires_at`. `play_url` adalah URL bertanda tangan ke `GET /music/audio/{song}`, berlaku 3 jam, terikat ke pengguna, tanpa header `Authorization`, dan mendukung `Range`. URL asli YouTube tidak dikirim ke klien.
2. **Kriteria penerimaan pengganti "Proxy Audio" (7.5):** URL audio dengan tanda tangan salah, kedaluwarsa, atau milik pengguna yang diblokir atau dihapus ditolak dengan `403`.
3. **Percobaan ulang (2.C poin 1):** pencarian ulang `ytsearch1:{artis} {judul}` hanya berlaku untuk lagu yang sudah tersimpan di database. Untuk lagu baru yang ekstraksinya gagal, kesalahan langsung dikembalikan ke klien.
4. **Risiko baru (2.D):** pemegang `play_url` dapat memutar lagu tersebut sampai URL kedaluwarsa atau pemiliknya diblokir.
5. **Reorder playlist (tabel bagian 6):** `PUT /playlists/{id}/songs/order` dengan body `{ "song_ids": [...] }`, menggantikan `PATCH /playlists/{id}/reorder`.
6. **Pencarian (3.3):** hasil disaring berdasarkan durasi 60-600 detik, dan judul yang memuat kata seperti karaoke, instrumental, cover, full album, nonstop, kumpulan, playlist, slowed, atau nightcore disingkirkan (daftar ini berupa contoh, bukan daftar lengkap).
7. **Smart Queue (3.3):** prioritas album hanya berlaku untuk lagu yang sudah tersimpan di database.
8. **Tambahan:** maksimal 500 lagu per playlist; token perangkat lain dicabut saat password diganti; registrasi dibatasi 10 per menit per IP.
9. **Jadwal:** `trending:refresh` Senin 03:00 UTC, `ytdlp:update` Minggu 03:30 UTC.

**Keputusan terbuka:** `is_favorite` pada hasil pencarian/stream; format respons `429`; kriteria antrean terhadap fallback Trending; target waktu ekstraksi (5 detik vs sekitar 6 detik); jendela duplikat pemutaran (30 atau 60 detik); batas pencatatan tepat 30 detik (`>` atau `>=`).