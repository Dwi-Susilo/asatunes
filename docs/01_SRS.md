# Software Requirements Specification (SRS) - ASATunes v1.2

## Riwayat Revisi
| Versi | Perubahan |
| :--- | :--- |
| 1.0 | Rancangan awal: Spotify (metadata) + YouTube IFrame Player (audio) |
| 1.1 | Pemutaran audio via ekstraksi yt-dlp; Spotify dihapus; metadata dari YouTube; Smart Queue berdasarkan artis/album (bukan judul); Trending di-cache 7 hari; identitas lagu diseragamkan ke `youtube_id`; endpoint yang kurang ditambahkan; sampul playlist dibuat otomatis dari cover lagu |
| 1.1 (rev. 24 Okt 2026) | Catatan revisi di akhir dokumen v1.1 agar sesuai dengan implementasi backend |
| 1.2 | Disesuaikan dengan implementasi backend sampai Langkah 36 dan `02_API.md` v1.1: `proxy-audio` diganti URL audio bertanda tangan (`play_url`); reorder playlist memakai `PUT /playlists/{id}/songs/order`; pencarian disaring; Smart Queue disesuaikan; batas 500 lagu per playlist; tabel throttle lengkap; konvensi respons dan kode status; pembedaan objek Kandidat lagu dan Lagu; kriteria penerimaan diberi status pengujian; keputusan yang belum diambil dicatat di bagian 8 |
| 1.2 (rev. 24 Okt 2026) | Butir bagian 9 dicocokkan dengan kode: daftar kata penyaring, kata normalisasi Smart Queue, kunci cache rekomendasi, kolom `users`, aturan register/login |

---

## 1. Pendahuluan
**ASATunes** adalah aplikasi *music streaming* lintas platform (*decoupled monorepo*) yang memutar **audio saja** dari YouTube. Backend mengekstrak URL audio menggunakan **yt-dlp**, lalu mengalirkannya ke klien melalui URL bertanda tangan milik server sendiri. Aplikasi **tidak menyimpan berkas audio**; yang disimpan hanya metadata lagu.

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

**Catatan**: Admin dan User dimodelkan sebagai **aktor terpisah** (tanpa pewarisan aktor) karena Admin memiliki jalur autentikasi dan akses ke dashboard tersendiri. Keduanya memakai mekanisme login yang sama; setelah login, Admin diarahkan ke dashboard berdasarkan `role`. Akun Admin **tetap boleh** memakai seluruh fitur User (memutar musik, mengelola playlist dan favorit pribadi). Karena itu, pada tabel API di bagian 6, peran "Authenticated User" mencakup Admin yang sudah login. Pengecualian: playlist milik pengguna lain tetap tertutup bagi Admin (HTTP 403).

---

## 2. Arsitektur & Aturan Pemutaran Audio

### A. Alur Pemutaran
1. Klien memanggil `GET /api/v1/music/search?q=` → backend menjalankan `yt-dlp ytsearch10:`, menyaring hasilnya (lihat 3.3), dan mengembalikan daftar *Kandidat lagu* (`youtube_id`, judul, artis, thumbnail, durasi).
2. Klien memilih lagu dan memanggil `GET /api/v1/music/stream?query={youtube_id}`.
3. Backend menjalankan `yt-dlp -j -f ba/ba*` (satu panggilan yang menghasilkan URL audio sekaligus metadata `artist`, `album`, dan `track` bila tersedia), melakukan *upsert* lagu ke tabel `songs`, lalu mengembalikan `song_id`, `play_url`, dan `expires_at`.
4. Klien memasang `play_url` **apa adanya** sebagai sumber audio (misalnya `<audio src="{play_url}">` atau sumber media ExoPlayer) tanpa header `Authorization`. Setelah `expires_at` terlewati, klien memanggil `stream` lagi untuk mendapat `play_url` baru.

### B. Aturan URL Audio Bertanda Tangan
Bagian ini menggantikan "Aturan Proxy Audio" pada v1.1. Endpoint `proxy-audio?url=` dihapus. Alasannya: elemen `<audio src>` di browser tidak dapat mengirim header `Authorization`, sedangkan v1.1 mewajibkan token pada endpoint audio.

- `stream` menerbitkan `play_url`: alamat server sendiri (`GET /api/v1/music/audio/{song}`) yang **bertanda tangan** (*signed URL*), berlaku **3 jam** (`expires_at`, format ISO 8601), dan terikat ke pengguna yang meminta `stream`.
- Endpoint audio **tidak memerlukan header `Authorization`**; keamanannya bertumpu pada tanda tangan.
- Server menolak dengan **HTTP 403** bila: tanda tangan salah atau hilang, URL sudah kedaluwarsa, bagian lagu pada URL diubah, atau pemilik URL diblokir atau sudah dihapus.
- Klien **tidak boleh** mengubah host, jalur, atau parameter `play_url`, dan tidak boleh melewatkannya lewat proxy yang mengubah alamat, karena tanda tangan dihitung dari alamat lengkap. `APP_URL` harus sama dengan alamat API yang diakses klien.
- Server mengalirkan audio dan mendukung header `Range` (dijawab `206` dengan `Content-Range`) agar *seek* berfungsi, serta meneruskan `Content-Type` asli dari sumber.
- URL asli `googlevideo.com` **tidak pernah dikirim ke klien**, dan klien tidak mengirim alamat apa pun ke server, sehingga tidak ada masukan URL dari klien yang dapat disalahgunakan (SSRF).
- Bila sumber audio gagal, server mencoba mengambil sumber baru sekali, lalu menjawab `502` jika tetap gagal.
- Pembatas laju khusus: 300 permintaan per menit per pengguna (tidak terkena pembatas global).
- Tidak menggunakan `Access-Control-Allow-Origin: *`; gunakan konfigurasi CORS Laravel dengan daftar origin yang diizinkan (`FRONTEND_URL`). Header yang dapat dibaca klien lintas origin: `Content-Range`, `Accept-Ranges`, `Content-Length`.

### C. Cache & Penanganan Kegagalan
- Hasil ekstraksi (sumber audio) di-cache **90 menit** per `youtube_id` di server (URL asal kedaluwarsa sekitar 6 jam dan terikat IP server).
- Jika ekstraksi gagal atau pemutaran error:
  1. Untuk lagu yang **sudah tersimpan** di tabel `songs`, backend mencoba ulang sekali dengan pencarian `ytsearch1:{artis} {judul}`. Untuk lagu yang benar-benar baru (belum ada di database), kesalahan langsung dikembalikan ke klien karena belum ada artis dan judul untuk dicari.
  2. Jika tetap gagal, server menjawab `502` dengan pesan `Lagu tidak dapat diputar saat ini.`; klien menampilkan *toast* `"Lagu tidak dapat diputar saat ini"` dan otomatis memutar lagu berikutnya di antrean (*auto-skip*).
- Respons error ke klien **tidak boleh** menyertakan output debug (stderr yt-dlp) atau pesan exception mentah; detail dicatat di log server.

### D. Batasan & Risiko yang Diakui
- Ekstraksi audio di luar pemutar resmi **tidak sejalan dengan Terms of Service YouTube**. Proyek ini ditujukan untuk keperluan akademik/prototipe non-komersial dan tidak dipublikasikan secara terbuka.
- Ketergantungan pada yt-dlp: harus diperbarui berkala karena YouTube sering mengubah mekanismenya.
- IP server (terutama datacenter) bisa dibatasi atau diminta verifikasi oleh YouTube.
- Waktu ekstraksi lagu baru berkisar beberapa detik (tercatat sekitar 6 detik pada `02_API.md` v1.1); lihat Keputusan Terbuka D2.
- Siapa pun yang memegang `play_url` dapat memutar lagu itu sampai URL kedaluwarsa atau pemiliknya diblokir.

---

## 3. Fitur Utama (Requirements)

### 1. Autentikasi & Profil Pengguna
- **Pendaftaran & Login**: Register (`name` wajib, maks. 100 karakter; `email` wajib, berformat email, maks. 255 karakter, unik; `password` wajib, minimal 6 karakter), Login (`email` dan `password` wajib; mendapatkan Bearer Token **Laravel Sanctum**). Pendaftaran tidak dapat menetapkan `role` atau `status`; akun baru selalu `user` dan `active`.
- **Logout**: Mencabut token perangkat yang sedang dipakai (`POST /api/v1/auth/logout`).
- **Kelola Profil**:
  - `GET /api/v1/profile`: detail profil beserta `avatar_url` (`null` bila belum ada foto).
  - `PATCH /api/v1/profile`: memperbarui nama dan/atau foto profil. Foto: `jpg`/`jpeg`/`png`/`webp`, maks. 2048 KB; foto lama dihapus otomatis saat foto baru tersimpan. Unggah foto dikirim sebagai `multipart/form-data` dengan metode `POST` dan field tambahan `_method=PATCH`; mengubah nama saja boleh dengan `PATCH` JSON biasa.
  - `PUT /api/v1/profile/password`: mengubah kata sandi dengan verifikasi kata sandi lama. Kata sandi baru minimal 6 karakter dan harus berbeda dari yang lama. Token **perangkat lain** dicabut; token yang sedang dipakai tetap berlaku.

### 2. Dashboard Admin & Otorisasi
- **Manajemen Pengguna**:
  - Melihat daftar pengguna beserta status (`active`/`blocked`), terbaru dulu, dengan paginasi (`per_page` 1-100, bawaan 15).
  - Memblokir/membuka blokir akun. Saat diblokir, seluruh token aktif user dihapus seketika.
  - Menghapus akun pengguna permanen (token dan foto profil ikut dihapus).
  - Mengubah role pengguna (`admin`/`user`).
  - Admin tidak boleh memblokir, menghapus, atau menurunkan role dirinya sendiri, dan tidak boleh menghapus/menurunkan admin terakhir (HTTP 422).
- **Ringkasan Statistik Sistem**: `total_users`, `total_playlists`, dan `top_songs` (sampai 10 lagu yang pernah diputar, urut dari terbanyak, masing-masing dengan `plays_count`; dari `song_plays`). Hasil di-cache **10 menit**, sehingga angka bisa tertinggal.

### 3. Manajemen Musik
- **Pencarian Musik**: via yt-dlp (`ytsearch10:`); parameter `q` wajib, 1-100 karakter. Hasil **disaring**: durasi 60 sampai 600 detik, dan judul yang memuat kata seperti karaoke, instrumental, cover, full album, nonstop, kumpulan, playlist, slowed, atau nightcore disingkirkan (daftar lengkap menurut kode: karaoke, instrumental, backing track, cover, reaction, tutorial, full album, nonstop, non stop, kumpulan, playlist, compilation, slowed, sped up, nightcore, 8d, 1 hour). Karena penyaringan, jumlah hasil bisa kurang dari 10 bahkan kosong. Jika yt-dlp tidak tersedia, server menjawab `503`.
- **Trending**:
  - Data diambil dari YouTube Data API `videos.list` dengan `chart=mostPopular`, `videoCategoryId=10` (Musik), `regionCode=ID`, menghasilkan sampai 25 lagu berdurasi 60-600 detik.
  - Hasil di-cache **7 hari** dan diperbarui otomatis oleh Laravel Scheduler **seminggu sekali**, yaitu `trending:refresh` setiap Senin 03:00 UTC.
  - Jika pembaruan gagal, sistem tetap menyajikan data minggu sebelumnya (*stale cache*), dan **tidak** menyimpan hasil kosong ke cache. Server menjawab `503` (`Data trending belum tersedia.`) hanya bila pembaruan belum pernah berhasil sama sekali.
- **Antrean Pintar (Smart Queue / Radio)** (`GET /music/{youtube_id}/recommendations`):
  - Antrean dibangun dari **artis (dan album, bila tersedia) lagu yang sedang diputar**, bukan dari judul. Judul tidak dipakai sebagai kata kunci karena memunculkan lagu lain yang kebetulan berjudul sama.
  - Sumber data: kolom `artist` dan `album` pada tabel `songs`. `artist` dibersihkan dari akhiran seperti " - Topic", "VEVO", dan "Official". Prioritas album **hanya berlaku untuk lagu yang sudah tersimpan di database dan memiliki `album`**, karena hasil pencarian YouTube tidak memberi nama album; jika kosong, antrean memakai artis saja. Karena itu lagu harus diputar lewat `stream` lebih dulu; jika `youtube_id` belum dikenal, server menjawab `404` (`Lagu belum dikenal. Putar lagu ini terlebih dahulu.`).
  - Aturan penyaringan:
    1. Nama artis harus muncul pada channel/uploader atau judul hasil (membuang lagu artis lain).
    2. Buang lagu yang sedang diputar dan semua entri yang judul ternormalisasinya sama dengan lagu tersebut.
    3. Setiap judul ternormalisasi hanya boleh muncul **sekali** di antrean, sehingga semua lagu dalam antrean berjudul berbeda. Normalisasi: huruf kecil, tanpa tanda baca, tanpa kata "official", "video", "audio", "music", "lyric"/"lyrics", "lirik", "mv", "hd", "live".
    4. Buang karaoke dan kompilasi; abaikan durasi di luar 60 detik sampai 10 menit.
  - Parameter `limit` opsional: 1-20, bawaan 10. Jumlah hasil bisa **kurang dari `limit`**.
  - Setiap entri memiliki kolom `source`: `album`, `artist`, atau `trending`.
  - Fallback: hasil dari Trending hanya dipakai bila hasil yang relevan (dari album/artis) kurang dari 3.
  - Hasil di-cache **12 jam**. Endpoint ini memakai pembatas yt-dlp (20 per menit per pengguna). Antrean bersifat bergulir: klien meminta lagi memakai lagu yang baru diputar.
  - Rekomendasi **tidak** dihitung dari data `song_plays` atau `favorites` pengguna.
  - Pengelolaan antrean lokal (*Shuffle*, *Repeat*, *Next/Prev*) ditangani *State Management* di frontend.
- **Lirik** (`GET /music/lyrics`): diambil via LRCLIB berdasarkan `title` (maks. 200) dan `artist` (maks. 200) yang sudah dibersihkan dari kata seperti "official", "lyric", dan sejenisnya; `duration` opsional (1-3600 detik) membantu mencocokkan versi yang tepat. Respons `data: { synced, plain, instrumental }`; `synced` berformat LRC, `plain` teks biasa, salah satunya bisa `null`. `404` bila lirik tidak ditemukan, `502` bila layanan lirik tidak tersedia. Hasil di-cache 30 hari bila ada dan 1 hari bila tidak ada.
- **Pencatatan Pemutaran (`Song Plays`)**:
  - Frontend memanggil `POST /api/v1/music/{song_id}/play` dengan body `listened_sec` (wajib, bilangan bulat 0-86400) setelah lagu diputar. Batas minimum pencatatan 30 detik (apakah tepat 30 detik dihitung: lihat Keputusan Terbuka D4).
  - Respons `201` (`counted: true`) bila dicatat; `200` dengan `counted: false` dan `reason` `too_short` atau `duplicate` bila tidak dicatat. Pemutaran ulang lagu yang sama oleh pengguna yang sama dalam jendela waktu tertentu dianggap `duplicate` (lama jendela: lihat Keputusan Terbuka D3). Pembatas: 30 permintaan per menit per pengguna.
  - Data dipakai untuk statistik admin, bukan untuk rekomendasi.

### 4. Playlist & Favorit Pengguna
- **Pengelolaan Playlist**: CRUD playlist pribadi (`title` wajib saat dibuat, maks. 100; `description` opsional, maks. 500). Pengguna tidak mengunggah foto sampul. Menghapus playlist tidak menghapus lagunya sendiri. Daftar playlist berhalaman 50 per halaman.
- **Isi Playlist**: maksimal **500 lagu** per playlist. Menambah lagu dengan `{ "song_id": ... }`: `201` bila ditambahkan (ditaruh paling akhir), `200` bila sudah ada, `422` bila lagu tidak ada atau playlist penuh. Menghapus lagu merapatkan posisi sisanya.
- **Sampul Playlist Otomatis**: sampul disusun otomatis dari cover lagu di dalam playlist:
  - Diambil maksimal 4 cover dari lagu dengan `position` terkecil, dengan thumbnail yang berbeda.
  - Tata letak: 0 lagu = gambar placeholder bawaan; 1 lagu = satu gambar penuh; 2 lagu = dua panel berdampingan; 3 lagu = satu gambar besar di kiri dan dua gambar bertumpuk di kanan; 4 lagu atau lebih = kisi 2×2.
  - Backend hanya mengirim daftar URL (`cover_thumbnails`, maksimal 4); penyusunan gambar dilakukan di klien (CSS grid di web, Compose di Android) dengan pemotongan tengah (*center-crop*). Tidak ada berkas gambar yang dibuat atau disimpan di server.
  - Jika `songs.thumbnail` kosong, klien memakai `https://i.ytimg.com/vi/{youtube_id}/hqdefault.jpg`.
  - Sampul ikut berubah otomatis saat lagu ditambah, dihapus, atau diurutkan ulang.
  - Daftar playlist mengambil cover dengan eager loading terbatas (maksimal 4 lagu per playlist) untuk menghindari query N+1.
- **Detail Playlist**: `GET /api/v1/playlists/{id}` mengembalikan lagu terurut berdasarkan `position`.
- **Pengaturan Urutan**: posisi lagu baru = `max(position)+1`. Reorder lewat `PUT /api/v1/playlists/{id}/songs/order` dengan `{ "song_ids": [...] }`; daftar harus berisi **persis** semua lagu playlist, tanpa id ganda atau id asing. Bila tidak cocok, server menjawab `422` dan urutan tidak berubah (klien sebaiknya memuat ulang playlist).
- **Lagu Favorit**: daftar favorit berhalaman 20 per halaman, terbaru di atas, dengan `favorited_at`. Menambah dan menghapus bersifat **idempoten** (`201`/`200` untuk tambah; `200` untuk hapus walau sudah tidak ada). Favorit bersifat privat per pengguna.

---

## 4. Keamanan & Kebijakan Otorisasi Backend

1. **Autentikasi (Sanctum)**: seluruh endpoint terproteksi wajib header `Authorization: Bearer <token>`, **termasuk `stream`, `search`, dan `recommendations`**. Satu-satunya pengecualian adalah `GET /music/audio/{song}`, yang memakai URL bertanda tangan (bagian 2.B). Token berlaku 30 hari; setelah kedaluwarsa pengguna login ulang (Sanctum tidak memiliki refresh token).
2. **Otorisasi Admin (`EnsureUserIsAdmin` Middleware)**: endpoint `/api/v1/admin/*` mengecek `user.role == 'admin'`, selain itu HTTP 403.
3. **Pengecekan Status Akun**: middleware memeriksa `status != 'blocked'` pada setiap request; akun diblokir mendapat HTTP 403 dan seluruh tokennya dicabut.
4. **Validasi Kepemilikan (Laravel Policy)**: operasi playlist memverifikasi `playlist.user_id == auth()->id()`; pengguna lain, termasuk Admin, mendapat HTTP 403.
5. **Validasi Input & Throttle**: FormRequest untuk semua input. Pembatas laju berlaku bersamaan; melebihi salah satunya menghasilkan HTTP 429 dengan header `Retry-After`.

   | Pembatas | Batas | Berlaku untuk |
   | :--- | :--- | :--- |
   | Global | 60 per menit per pengguna | Semua endpoint setelah login (kecuali `music/audio`) |
   | Login | 5 per menit per email + IP | `POST /auth/login` |
   | Daftar | 10 per menit per IP | `POST /auth/register` |
   | yt-dlp | 20 per menit per pengguna | `music/search`, `music/stream`, `music/{id}/recommendations` |
   | Pemutaran | 30 per menit per pengguna | `POST /music/{song}/play` |
   | Audio | 300 per menit per pengguna | `GET /music/audio/{song}` |

6. **Keamanan Proses Eksternal**: yt-dlp dijalankan dengan *array argument* (tanpa shell), timeout 30 detik, dan jumlah proses yt-dlp bersamaan dibatasi (bila semua slot terpakai, permintaan gagal terkontrol).
7. **URL Audio Bertanda Tangan**: aturan lengkap di bagian 2.B.

---

## 5. Rancangan Basis Data (Database Schema)

### A. Tabel `users`
- `id` (PK, BigInt), `name` (Varchar), `email` (Varchar, Unique), `password` (Varchar)
- `avatar_url` (Varchar, Nullable)
- `status` (Enum: `'active'`, `'blocked'`, Default: `'active'`)
- `role` (Enum: `'admin'`, `'user'`, Default: `'user'`)
- `email_verified_at` (Timestamp, Nullable; bawaan Laravel, belum dipakai) dan `remember_token` (bawaan Laravel, tidak dipakai API)
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
- *Catatan*: hanya metadata; **tidak ada berkas audio** yang disimpan. Baris dibuat (*upsert*) saat lagu pertama kali diminta lewat `stream` atau ditambahkan ke playlist/favorit.

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

### A. Tabel Endpoint

| Method | Endpoint | Deskripsi | Access Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Pendaftaran akun baru | Public |
| `POST` | `/api/v1/auth/login` | Login & mendapatkan token | Public |
| `POST` | `/api/v1/auth/logout` | Mencabut token perangkat ini | Authenticated User |
| `GET` | `/api/v1/profile` | Mengambil data profil | Authenticated User |
| `PATCH` | `/api/v1/profile` | Memperbarui nama / avatar | Authenticated User |
| `PUT` | `/api/v1/profile/password` | Mengubah kata sandi | Authenticated User |
| `GET` | `/api/v1/music/trending` | Lagu trending (YouTube mostPopular, cache 7 hari) | Authenticated User |
| `GET` | `/api/v1/music/search?q=` | Pencarian lagu via yt-dlp (disaring) | Authenticated User |
| `GET` | `/api/v1/music/stream?query=` | Upsert lagu, mengembalikan `song_id`, `play_url`, `expires_at` | Authenticated User |
| `GET` | `/api/v1/music/audio/{song}` | Mengalirkan audio (URL bertanda tangan dari `stream`, mendukung Range) | Signed URL (tanpa token) |
| `GET` | `/api/v1/music/{youtube_id}/recommendations` | Antrean otomatis (berdasarkan artis/album) | Authenticated User |
| `GET` | `/api/v1/music/lyrics?title=&artist=` | Mengambil lirik (LRCLIB), `duration` opsional | Authenticated User |
| `POST` | `/api/v1/music/{song_id}/play` | Mencatat pemutaran (`listened_sec`) | Authenticated User |
| `GET` | `/api/v1/favorites` | Daftar lagu favorit | Authenticated User |
| `POST` | `/api/v1/favorites/{song_id}` | Menambah favorit (idempoten) | Authenticated User |
| `DELETE` | `/api/v1/favorites/{song_id}` | Menghapus favorit (idempoten) | Authenticated User |
| `GET` | `/api/v1/playlists` | Daftar playlist milik user beserta `cover_thumbnails` (maks. 4 URL) | Authenticated User |
| `POST` | `/api/v1/playlists` | Membuat playlist | Authenticated User |
| `GET` | `/api/v1/playlists/{id}` | Detail playlist beserta lagu terurut | Owner User Only |
| `PATCH`/`PUT` | `/api/v1/playlists/{id}` | Mengubah judul/deskripsi | Owner User Only |
| `DELETE` | `/api/v1/playlists/{id}` | Menghapus playlist | Owner User Only |
| `POST` | `/api/v1/playlists/{id}/songs` | Menambah lagu ke playlist (maks. 500) | Owner User Only |
| `DELETE` | `/api/v1/playlists/{id}/songs/{song_id}` | Menghapus lagu dari playlist | Owner User Only |
| `PUT` | `/api/v1/playlists/{id}/songs/order` | Mengubah urutan lagu (`song_ids`) | Owner User Only |
| `GET` | `/api/v1/admin/users` | Daftar pengguna (paginasi) | Admin Only |
| `POST` | `/api/v1/admin/users/{id}/block` | Memblokir akun | Admin Only |
| `POST` | `/api/v1/admin/users/{id}/unblock` | Membuka blokir | Admin Only |
| `PATCH` | `/api/v1/admin/users/{id}/role` | Mengubah role | Admin Only |
| `DELETE` | `/api/v1/admin/users/{id}` | Menghapus akun permanen | Admin Only |
| `GET` | `/api/v1/admin/stats` | Statistik sistem (user, playlist, top plays) | Admin Only |

### B. Konvensi Umum
- Setiap permintaan wajib mengirim `Accept: application/json`; isi JSON memakai `Content-Type: application/json`.
- Respons sukses: `{ "status": "success", "data": ... }` atau `{ "status": "success", "message": "..." }`.
- Respons error: `{ "status": "error", "message": "..." }`. Kegagalan validasi (422) menambahkan `errors` per field. Semua pesan berbahasa Indonesia; klien sebaiknya bergantung pada **kode status** dan kunci `errors`, bukan pada teks pesan.
- Daftar berhalaman memakai `?page=` dan mengembalikan `meta` (`current_page`, `last_page`, `per_page`, `total`). Ukuran halaman: favorit 20, playlist 50, admin/users `per_page` 1-100 (bawaan 15).

| Kode | Arti |
| :--- | :--- |
| 200 / 201 | Berhasil / berhasil dibuat |
| 401 | Token tidak ada, salah, atau kedaluwarsa; minta login ulang |
| 403 | Akun diblokir, bukan admin, bukan pemilik sumber daya, atau URL bertanda tangan tidak sah |
| 404 | Sumber daya tidak ditemukan |
| 405 | Metode HTTP tidak diizinkan |
| 422 | Validasi gagal, atau aturan bisnis ditolak |
| 429 | Terlalu banyak permintaan (lihat `Retry-After`) |
| 502 | Layanan pihak ketiga gagal (stream, audio, lirik) |
| 503 | Layanan musik atau data trending tidak tersedia |

### C. Bentuk Objek
- **Kandidat lagu** (hasil `search`, `trending`, `recommendations`): lagu yang belum tentu ada di database, sehingga **tidak punya `id`**. Kolom: `youtube_id`, `title`, `artist`, `thumbnail`, `duration_sec`. `recommendations` menambah kolom `source`.
- **Lagu** (hasil `favorites` dan `playlists`): lagu yang sudah tersimpan, **punya `id`**. Kolom: `id`, `youtube_id`, `title`, `artist`, `album`, `thumbnail`, `duration_sec`.
- **Aturan kunci**: `youtube_id` dan `song_id` adalah dua hal berbeda. Pencarian, trending, dan rekomendasi hanya punya `youtube_id`; favorit, playlist, dan pencatatan pemutaran memakai `song_id`, yang didapat dari `stream`.

---

## 7. Persyaratan Non-Fungsional

### 1. Kinerja
- Endpoint berbasis cache (trending, lirik, rekomendasi yang sudah pernah diminta): `< 200 ms`.
- Ekstraksi audio lagu baru (yt-dlp): hasil di-cache 90 menit; target waktu ekstraksi dibahas di Keputusan Terbuka D2.
- Mampu melayani minimal 100 request bersamaan untuk endpoint non-yt-dlp. Proses yt-dlp dibatasi jumlah konkurensinya.

### 2. Keamanan
- Password di-hash dengan `Bcrypt` atau `Argon2id`.
- Mencegah SQL Injection via Eloquent, dan sanitasi XSS pada input teks.
- Tidak ada kebocoran informasi internal pada respons error.

### 3. Keandalan
- **Graceful Degradation**: jika YouTube API/yt-dlp gagal atau terkena *rate limit*, backend mengembalikan data cache terakhir atau pesan error terkontrol, bukan HTTP 500 mentah.
- Hasil kosong akibat kegagalan tidak boleh disimpan ke cache.

### 4. Pemeliharaan
- yt-dlp diperbarui otomatis oleh jadwal `ytdlp:update` setiap Minggu 03:30 dan versi yang terpasang dicatat di log. Jadwal (`trending:refresh` Senin 03:00, `ytdlp:update` Minggu 03:30) mengikuti zona waktu aplikasi, yaitu UTC.

### 5. Kriteria Penerimaan Pengujian
Status mengacu pada 33 tes otomatis backend (`php artisan test`) per 24 Oktober 2026.

| Kriteria | Status |
| :--- | :--- |
| **Role**: user `'user'` mendapat `403` saat mengakses `/api/v1/admin/*` | Sebagian teruji: `GET /admin/users` dan `GET /admin/stats`; `block` diuji hanya dari sisi admin; `unblock`, `role`, dan `DELETE` belum |
| **Isolasi Data**: User A tidak dapat mengubah atau melihat playlist milik User B | Teruji: enam operasi (lihat, ubah, tambah lagu, urut, hapus lagu, hapus playlist) semuanya `403`, data tidak berubah. Pelaku yang diuji: pengguna biasa; Admin belum |
| **Status Blokir**: akun `blocked` ditolak dan token lamanya tidak berlaku | Sebagian teruji: permintaan dengan token akun terblokir mendapat `403` dan token terhapus (diuji pada `GET /profile`); login oleh akun terblokir dan endpoint lain belum |
| **URL Audio**: tanda tangan salah/hilang, kedaluwarsa, lagu diubah, pemilik diblokir, atau pemilik dihapus ditolak `403` | Teruji (5 skenario). Jalur sukses (`200`/`206` dengan `Range`) belum |
| **Registrasi**: tidak dapat menetapkan `role` atau `status` | Teruji |
| **Reorder playlist**: urutan valid diterapkan; daftar kurang, berisi id asing, atau ganda ditolak `422` tanpa mengubah urutan; hapus lagu merapatkan posisi | Teruji |
| **Favorit**: tambah dan hapus idempoten; privat per pengguna | Teruji |
| **Pencatatan pemutaran**: dengar singkat tidak dihitung (`too_short`); pemutaran ulang cepat tidak dihitung (`duplicate`); `listened_sec` wajib | Teruji. Batas tepat 30 detik dan lama jendela duplikat belum teruji |
| **Trending**: saat API YouTube gagal, endpoint tetap mengembalikan data minggu sebelumnya | Belum teruji |
| **Antrean Otomatis**: semua lagu berjudul berbeda (judul ternormalisasi), tidak memuat lagu yang sedang diputar, dan berasal dari artis atau album yang sama (kecuali entri `source: trending`; lihat D1) | Belum teruji |
| **Aturan admin**: tidak boleh memblokir/menghapus/menurunkan diri sendiri dan admin terakhir | Belum teruji |
| Batas 500 lagu per playlist, pencabutan token perangkat lain saat ganti password, pembatas laju (`429`) | Belum teruji |

---

## 8. Keputusan Terbuka
Hal berikut belum diputuskan dan sengaja dibiarkan terbuka; dokumen ini tidak memilihkan salah satunya.

| No | Hal | Keadaan sekarang |
| :--- | :--- | :--- |
| D1 | Kriteria antrean terhadap fallback Trending | Kriteria mensyaratkan semua lagu berasal dari artis/album yang sama, padahal fallback Trending (dipakai bila hasil relevan kurang dari 3) menambahkan lagu lain. Pilihan: kriteria dilonggarkan untuk `source: trending`, atau fallback dibatasi |
| D2 | Target waktu ekstraksi lagu baru | v1.1 menargetkan di bawah 5 detik; `02_API.md` v1.1 mencatat sekitar 6 detik. Pilihan: target dinaikkan, atau tetap sebagai target yang belum tercapai |
| D3 | Lama jendela duplikat pemutaran | SRS v1.1 menyebut 30 detik; `02_API.md` v1.1 menyebut 60 detik |
| D4 | Batas pencatatan tepat 30 detik | SRS v1.1 menulis "> 30 detik"; `02_API.md` v1.1 menulis "30 detik atau lebih". Tes memakai 10 dan 45 detik, sehingga batas ini belum teruji |
| D5 | Penanda `is_favorite` pada hasil pencarian/stream | Belum ada; ikon hati harus memuat daftar favorit sendiri |
| D6 | Format respons `429` | Belum didokumentasikan |
| D7 | Kode status login dengan kata sandi salah | Tes menerima `401` maupun `422`; belum ditetapkan salah satu |

---

## 9. Catatan Verifikasi
Status per 24 Oktober 2026, dicocokkan dengan kode backend.

**Sudah dicocokkan dan dikoreksi di dokumen ini**
1. Daftar kata penyaring pencarian: lengkap di bagian 3.3 (dari `SongFilter.php`).
2. Kata normalisasi judul Smart Queue: dari `SmartQueue.php` baris 193. Kode memuat "music" dan "lyrics", dan **tidak** memuat "remastered" dan "4k"; bagian 3.3 sudah disesuaikan.
3. Kunci cache rekomendasi adalah `queue:{youtube_id}:{limit}`: cache **per lagu dan per `limit`**, bukan per artis. Dua lagu dari artis yang sama punya cache terpisah.
4. Tabel `users` memuat `email_verified_at` dan `remember_token` (bawaan Laravel); bagian 5.A sudah diperbarui.
5. Aturan field register dan login dicocokkan dengan `RegisterRequest` dan `LoginRequest`; bagian 3.1 sudah diperbarui.

**Masih perlu dicek**
1. Normalisasi judul "huruf kecil, tanpa tanda baca" (bagian 3.3) belum dilihat langsung di kode; hanya baris penghapus kata yang sudah dicocokkan.
2. Cache hasil pencarian untuk query populer: belum dicek di kode dan tidak tercantum di `02_API.md`.
3. Urutan pemanggilan LRCLIB (`/api/get` lalu `/api/search`): disebut v1.1; perlu dicek ulang di `Lyrics.php` bila ingin dipastikan.
