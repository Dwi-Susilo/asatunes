# Software Requirements Specification (SRS) - ASATunes v1.4

## Riwayat Revisi
| Versi | Perubahan |
| :--- | :--- |
| 1.0 | Rancangan awal: Spotify (metadata) + YouTube IFrame Player (audio) |
| 1.1 | Pemutaran audio via ekstraksi yt-dlp; Spotify dihapus; metadata dari YouTube; Smart Queue berdasarkan artis/album (bukan judul); Trending di-cache 7 hari; identitas lagu diseragamkan ke `youtube_id`; endpoint yang kurang ditambahkan; sampul playlist dibuat otomatis dari cover lagu |
| 1.1 (rev. 24 Okt 2026) | Catatan revisi di akhir dokumen v1.1 agar sesuai dengan implementasi backend |
| 1.2 | Disesuaikan dengan implementasi backend sampai Langkah 36 dan `02_API.md` v1.1: `proxy-audio` diganti URL audio bertanda tangan (`play_url`); reorder playlist memakai `PUT /playlists/{id}/songs/order`; pencarian disaring; Smart Queue disesuaikan; batas 500 lagu per playlist; tabel throttle lengkap; konvensi respons dan kode status; pembedaan objek Kandidat lagu dan Lagu; kriteria penerimaan diberi status pengujian; keputusan yang belum diambil dicatat di bagian 8 |
| 1.2 (rev. 24 Okt 2026) | Butir bagian 9 dicocokkan dengan kode: daftar kata penyaring, kata normalisasi Smart Queue, kunci cache rekomendasi, kolom `users`, aturan register/login |
| 1.3 (rancangan, 30 Okt 2026) | Menambah aktor **Tamu** (mendengarkan musik tanpa akun); endpoint baca musik (`search`, `trending`, `lyrics`, `recommendations`, `stream`, `play`) terbuka untuk umum; `play_url` tidak lagi terikat ke pengguna; pembatas laju per IP untuk Tamu; kolom `song_plays.ip_address`; blokir hanya menutup fitur akun; pernyataan publikasi di 2.D diubah; bagian 10 Antarmuka Web. Status: backend dan frontend kini mengikutinya (lihat rev. 21 Nov 2026). |
| 1.3 (rev. 15 Nov 2026) | Mengikuti diagram use case terbaru: aktor **Tamu** diganti nama menjadi **Pengunjung** dan **User** menjadi **Pengguna** (di seluruh dokumen kecuali riwayat revisi ini); aktor memakai **pewarisan** (Pengguna mewarisi Pengunjung, Admin mewarisi Pengguna); menambah use case **Lupa password** (Pengunjung) dan **Lihat riwayat lagu diputar** (Pengguna); catatan diagram tentang akun `blocked` dicatat di Keputusan Terbuka D12; rincian Lupa password dan riwayat belum ditetapkan (D13, D14); label peran dan perlakuan Registrasi/Login bagi yang sudah login (D15, D16). Status: backend dan frontend kini mengikutinya (lihat rev. 21 Nov 2026). |
| 1.3 (rev. 15 Nov 2026, keputusan) | Keputusan pemilik: **D12** (akun `blocked` tetap memakai perilaku sekarang), **D13** (Lupa password lewat email berisi token), **D14** (Riwayat memakai `song_plays`), **D15** (label peran di dokumen diganti; objek **User** dan nilai `role` tetap), **D16** (server tidak menolak Registrasi/Login/Lupa password bagi pemegang token), dan **K1** (identitas opsional pada endpoint musik terbuka); ditambah **D9** (IP Pengunjung disimpan sebagai HMAC-SHA256 dengan kunci aplikasi, `Varchar(64)`, dikosongkan setelah 1 hari) dan **K3** (cooldown pemutaran lewat Cache); ditambah **K6** (memutar lagu memindahkan tampilan ke Halaman Pemutar `/putar`), **K7** (pemutaran tetap berjalan bila sesi berakhir saat mendengarkan), dan **D10** (tab Terkait ditiadakan). Rincian D11 (slot yt-dlp tetap bersama), D13 (Lupa password), dan D14 (Riwayat) diputuskan pada 16 Nov 2026 (lihat 3.1, 3.3, 4.5, 4.6, dan 6.A). Status: backend dan frontend kini mengikutinya (lihat rev. 21 Nov 2026). |
| 1.4 (rev. 21 Nov 2026) | Dokumen disesuaikan dengan implementasi: **backend tahap B1 sampai B8** (72 tes lulus) dan **frontend tahap F1 sampai F9** sudah dibangun. Bagian 10 ditulis ulang menurut tampilan yang diputuskan pemilik (17 Nov 2026): **K8** tab **Terkait** ada (menggantikan D10 dan butir "di luar lingkup" pada 10.E); **K9** tombol suka dan "tambah ke playlist" dipindah dari bilah bawah ke Halaman Pemutar `/putar`; **K10** sakelar Autoplay bawaan mati dan pilihannya diingat di peramban (`localStorage`); **K11** tema hitam pekat dengan aksen merah; slider volume di bilah bawah (tidak disimpan); sampul saja tanpa video; tanpa chip penyaring, hamburger, cast, Explore, Upgrade, tombol tidak suka, serta jumlah tayang/suka; dashboard Admin bertata letak terpisah (`/admin/pengguna`, `/admin/statistik`); menu bawah di ponsel; halaman `/riwayat`, `/lupa-password`, `/reset-password`; menu Tambah ke playlist dapat membuat playlist baru. Bagian 9 dan catatan kriteria 7.5 diperbarui. Keputusan pemilik 21 Nov 2026: **D17** "Hasil teratas" dan baris trending geser dengan "Tampilkan semua" **dihapus** dari rancangan (masuk 10.E); **D18** thumbnail kecil **dibiarkan** (tidak dipotong 16:9); **K12** tab **Antrean** diganti nama **Berikutnya** dan, bila lagu dipilih dari Beranda atau Hasil Cari, diisi otomatis dari rekomendasi lagu itu (seperti radio YouTube Music); **K13** tab **Terkait** berisi lagu artis lain dari internet, acak, minimal 15 bila sumber cukup, dan berbeda dari Berikutnya (endpoint baru `GET /music/{youtube_id}/related`, backend tahap B9); **K14** API dapat berjalan di belakang tunnel atau reverse proxy lewat `TRUSTED_PROXIES` di `.env` (backend tahap B10, 81 tes), supaya pembatas laju, hash IP Pengunjung (D9), dan tautan audio bertanda tangan tetap benar; berkas deploy ada di `deploy/`; Beranda menampilkan Trending sebagai kisi kartu; tombol favorit dan playlist hanya di halaman `/putar`; menu Tambah ke playlist dapat membuat playlist baru. |

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
- **Pengunjung**: pengunjung yang belum terdaftar atau belum login. Boleh registrasi, login, lupa password, mencari musik, melihat trending, memutar musik, memakai antrean otomatis (rekomendasi), dan melihat lirik. Tidak boleh memakai playlist, favorit, profil, riwayat, atau dashboard.
- **Pengguna**: pengguna terdaftar yang sudah login. Mewarisi Pengunjung; selain itu mengelola profil, playlist, dan favorit, melihat riwayat lagu diputar, dan logout.
- **Admin**: pengelola sistem yang masuk ke dashboard admin. Mewarisi Pengguna; selain itu melihat statistik, melihat lagu paling sering diputar, melihat daftar pengguna, menghapus pengguna, mengubah role pengguna, dan mengelola status pengguna.
- **Aktor eksternal**: YouTube (yt-dlp / Data API) dan LRCLIB API. Menurut diagram use case, YouTube terhubung ke Lihat trending, Cari lagu, Putar lagu, dan Lihat rekomendasi; LRCLIB terhubung ke Lihat lirik.

**Catatan**: Pengunjung, Pengguna, dan Admin dimodelkan dengan **pewarisan aktor** sesuai diagram use case: Pengguna mewarisi Pengunjung, dan Admin mewarisi Pengguna. Karena itu Pengguna dan Admin yang sudah login dapat melakukan semua use case musik Pengunjung (cari, trending, putar, rekomendasi, lirik). Registrasi, Login, dan Lupa password **hanya untuk Pengunjung** (belum login) dan tidak diwarisi Pengguna maupun Admin (keputusan D16: server tidak menolak permintaan itu bila ada token; pengalihan dilakukan antarmuka). Admin memiliki jalur autentikasi dan akses ke dashboard tersendiri. Keduanya memakai mekanisme login yang sama; setelah login, Admin diarahkan ke dashboard berdasarkan `role`. Akun Admin **tetap boleh** memakai seluruh fitur Pengguna (memutar musik, mengelola playlist dan favorit pribadi). Karena itu, pada tabel API di bagian 6, peran "Pengguna" (sebelumnya "Authenticated User") mencakup Admin yang sudah login, dan peran "Pengunjung" (sebelumnya "Public") mencakup pemanggil tanpa token (keputusan D15). Pengecualian: playlist milik pengguna lain tetap tertutup bagi Admin (HTTP 403). Akun berstatus `blocked` (keputusan D12): perilaku saat ini tetap berlaku, yaitu tidak dapat login dan tidak punya sesi, sehingga hanya dapat memakai fitur Pengunjung; catatan diagram "kecuali Logout" dibaca sebagai tidak adanya sesi untuk di-logout.

---

## 2. Arsitektur & Aturan Pemutaran Audio

### A. Alur Pemutaran
1. Klien memanggil `GET /api/v1/music/search?q=` → backend menjalankan `yt-dlp ytsearch10:`, menyaring hasilnya (lihat 3.3), dan mengembalikan daftar *Kandidat lagu* (`youtube_id`, judul, artis, thumbnail, durasi).
2. Klien memilih lagu dan memanggil `GET /api/v1/music/stream?query={youtube_id}`.
3. Backend menjalankan `yt-dlp -j -f ba/ba*` (satu panggilan yang menghasilkan URL audio sekaligus metadata `artist`, `album`, dan `track` bila tersedia), melakukan *upsert* lagu ke tabel `songs`, lalu mengembalikan `song_id`, `play_url`, dan `expires_at`.
4. Klien memasang `play_url` **apa adanya** sebagai sumber audio (misalnya `<audio src="{play_url}">` atau sumber media ExoPlayer) tanpa header `Authorization`. Setelah `expires_at` terlewati, klien memanggil `stream` lagi untuk mendapat `play_url` baru.

### B. Aturan URL Audio Bertanda Tangan
Bagian ini menggantikan "Aturan Proxy Audio" pada v1.1. Endpoint `proxy-audio?url=` dihapus. Alasannya: elemen `<audio src>` di browser tidak dapat mengirim header `Authorization`, sedangkan v1.1 mewajibkan token pada endpoint audio.

- `stream` menerbitkan `play_url`: alamat server sendiri (`GET /api/v1/music/audio/{song}`) yang **bertanda tangan** (*signed URL*) dan berlaku **3 jam** (`expires_at`, format ISO 8601). URL **tidak terikat ke pengguna**: berlaku sama untuk Pengunjung maupun pengguna terdaftar, dan terikat hanya pada lagu serta masa berlakunya.
- Endpoint audio **tidak memerlukan header `Authorization`**; keamanannya bertumpu pada tanda tangan.
- Server menolak dengan **HTTP 403** bila: tanda tangan salah atau hilang, URL sudah kedaluwarsa, atau bagian lagu pada URL diubah.
- Klien **tidak boleh** mengubah host, jalur, atau parameter `play_url`, dan tidak boleh melewatkannya lewat proxy yang mengubah alamat, karena tanda tangan dihitung dari alamat lengkap. `APP_URL` harus sama dengan alamat API yang diakses klien.
- Server mengalirkan audio dan mendukung header `Range` (dijawab `206` dengan `Content-Range`) agar *seek* berfungsi, serta meneruskan `Content-Type` asli dari sumber.
- URL asli `googlevideo.com` **tidak pernah dikirim ke klien**, dan klien tidak mengirim alamat apa pun ke server, sehingga tidak ada masukan URL dari klien yang dapat disalahgunakan (SSRF).
- Bila sumber audio gagal, server mencoba mengambil sumber baru sekali, lalu menjawab `502` jika tetap gagal.
- Pembatas laju khusus: 300 permintaan per menit **per IP** (tidak terkena pembatas global).
- Tidak menggunakan `Access-Control-Allow-Origin: *`; gunakan konfigurasi CORS Laravel dengan daftar origin yang diizinkan (`FRONTEND_URL`). Header yang dapat dibaca klien lintas origin: `Content-Range`, `Accept-Ranges`, `Content-Length`.

### C. Cache & Penanganan Kegagalan
- Hasil ekstraksi (sumber audio) di-cache **90 menit** per `youtube_id` di server (URL asal kedaluwarsa sekitar 6 jam dan terikat IP server).
- Jika ekstraksi gagal atau pemutaran error:
  1. Untuk lagu yang **sudah tersimpan** di tabel `songs`, backend mencoba ulang sekali dengan pencarian `ytsearch1:{artis} {judul}`. Untuk lagu yang benar-benar baru (belum ada di database), kesalahan langsung dikembalikan ke klien karena belum ada artis dan judul untuk dicari.
  2. Jika tetap gagal, server menjawab `502` dengan pesan `Lagu tidak dapat diputar saat ini.`; klien menampilkan *toast* `"Lagu tidak dapat diputar saat ini"` dan otomatis memutar lagu berikutnya di antrean (*auto-skip*).
- Respons error ke klien **tidak boleh** menyertakan output debug (stderr yt-dlp) atau pesan exception mentah; detail dicatat di log server.

### D. Batasan & Risiko yang Diakui
- Ekstraksi audio di luar pemutar resmi **tidak sejalan dengan Terms of Service YouTube**. Proyek ini berawal sebagai tugas akademik dan non-komersial, dan **boleh dipublikasikan sehingga siapa pun dapat mendengarkan musik**. Dengan makin banyak pengguna, risiko YouTube membatasi atau memblokir IP server meningkat, dan bila itu terjadi pemutaran gagal untuk semua pengguna. Mitigasi: cache hasil ekstraksi (90 menit) dan trending (7 hari), pembatas laju per IP, dan pembatasan jumlah proses yt-dlp bersamaan.
- Ketergantungan pada yt-dlp: harus diperbarui berkala karena YouTube sering mengubah mekanismenya.
- IP server (terutama datacenter) bisa dibatasi atau diminta verifikasi oleh YouTube.
- Waktu ekstraksi lagu baru berkisar beberapa detik (tercatat sekitar 6 detik pada `02_API.md` v1.1); lihat Keputusan Terbuka D2.
- Siapa pun yang memegang `play_url` dapat memutar lagu itu sampai URL kedaluwarsa. Ini disengaja: `play_url` tidak terikat ke pengguna (bagian 2.B).

---

## 3. Fitur Utama (Requirements)

### 1. Autentikasi & Profil Pengguna
- **Akses Pengunjung**: pencarian, trending, antrean otomatis, lirik, dan pemutaran tidak memerlukan login (bagian 3.3). Fitur akun (profil, playlist, favorit) memerlukan login.
- **Pendaftaran & Login**: Register (`name` wajib, maks. 100 karakter; `email` wajib, berformat email, maks. 255 karakter, unik; `password` wajib, minimal 6 karakter), Login (`email` dan `password` wajib; mendapatkan Bearer Token **Laravel Sanctum**). Pendaftaran tidak dapat menetapkan `role` atau `status`; akun baru selalu `user` dan `active`.
- **Logout**: Mencabut token perangkat yang sedang dipakai (`POST /api/v1/auth/logout`).
- **Lupa Password** (use case Pengunjung pada diagram use case): hanya untuk Pengunjung (belum login) dan tidak diwarisi Pengguna maupun Admin. Alur (keputusan D13), memakai tabel `password_reset_tokens`: `POST /auth/forgot-password` dengan `email` mengirim email berisi tautan dan token reset. Jawabannya selalu sama (`200`) baik email terdaftar maupun tidak, dan akun `blocked` tidak dikirimi email. `POST /auth/reset-password` dengan `email`, `token`, dan `password` (minimal 6 karakter) mengganti kata sandi bila token valid; token berlaku **60 menit** dan sekali pakai (`422` bila tidak valid atau kedaluwarsa), dan akun `blocked` ditolak `403`. Setelah reset berhasil, **semua token login** akun itu dicabut. Pembatas: 5 per menit per email + IP untuk kedua endpoint. Tautan di email menuju frontend (`FRONTEND_URL`): `/reset-password?token=...&email=...`. Pengiriman email sungguhan memerlukan pengaturan email produksi; `.env.example` memakai `MAIL_MAILER=log`, sehingga email hanya ditulis ke log.
- **Kelola Profil**:
  - `GET /api/v1/profile`: detail profil beserta `avatar_url` (`null` bila belum ada foto).
  - `PATCH /api/v1/profile`: memperbarui nama dan/atau foto profil. Foto: `jpg`/`jpeg`/`png`/`webp`, maks. 2048 KB; foto lama dihapus otomatis saat foto baru tersimpan. Unggah foto dikirim sebagai `multipart/form-data` dengan metode `POST` dan field tambahan `_method=PATCH`; mengubah nama saja boleh dengan `PATCH` JSON biasa.
  - `PUT /api/v1/profile/password`: mengubah kata sandi dengan verifikasi kata sandi lama. Kata sandi baru minimal 6 karakter dan harus berbeda dari yang lama. Token **perangkat lain** dicabut; token yang sedang dipakai tetap berlaku.

### 2. Dashboard Admin & Otorisasi
- **Manajemen Pengguna**:
  - Melihat daftar pengguna beserta status (`active`/`blocked`), terbaru dulu, dengan paginasi (`per_page` 1-100, bawaan 15).
  - Memblokir/membuka blokir akun. Saat diblokir, seluruh token aktif user dihapus seketika. Blokir hanya menutup **fitur akun** (login, profil, playlist, favorit); orang yang akunnya diblokir tetap dapat mendengarkan musik sebagai Pengunjung. Menurut keputusan D12, akun `blocked` tidak dapat login dan tidak punya sesi; ia hanya dapat memakai fitur Pengunjung (catatan diagram "akses setara Pengunjung, kecuali Logout" dibaca sebagai tidak adanya sesi untuk di-logout).
  - Menghapus akun pengguna permanen (token dan foto profil ikut dihapus).
  - Mengubah role pengguna (`admin`/`user`).
  - Admin tidak boleh memblokir, menghapus, atau menurunkan role dirinya sendiri, dan tidak boleh menghapus/menurunkan admin terakhir (HTTP 422).
- **Ringkasan Statistik Sistem**: `total_users`, `total_playlists`, dan `top_songs` (sampai 10 lagu yang pernah diputar, urut dari terbanyak, masing-masing dengan `plays_count`; dari `song_plays`). Hasil di-cache **10 menit**, sehingga angka bisa tertinggal. Pada diagram use case, `top_songs` digambar sebagai use case tersendiri ("Lagu paling sering diputar"), terpisah dari "Lihat statistik"; pada API saat ini datanya berada di respons `GET /admin/stats` yang sama (API.md bagian 9).

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
- **Lagu Terkait** (`GET /music/{youtube_id}/related`, keputusan K13): lagu dari **artis lain**, berbeda dari antrean di atas yang hanya memuat artis atau album yang sama. Sumbernya internet: pencarian YouTube lewat yt-dlp yang diarahkan ke artis lain, ditambah Trending. Aturan: lagu seed dan lagu artis yang sama dibuang; semua penyaring pencarian (3.3) berlaku; tanpa judul ternormalisasi kembar. Urutan **diacak pada setiap permintaan**; kumpulan lagunya di-cache 12 jam (tidak disimpan bila yt-dlp gagal). Parameter `limit` opsional 1-30, bawaan 20; hasil minimal 15 bila sumber cukup, bila tidak, yang ada dikembalikan apa adanya. Setiap entri memiliki `source`: `related` atau `trending`. `404` bila lagu belum dikenal. Memakai pembatas yt-dlp. Mutu hasil pencarian bergantung pada YouTube dan belum diukur.
- **Lirik** (`GET /music/lyrics`): diambil via LRCLIB berdasarkan `title` (maks. 200) dan `artist` (maks. 200) yang sudah dibersihkan dari kata seperti "official", "lyric", dan sejenisnya; `duration` opsional (1-3600 detik) membantu mencocokkan versi yang tepat. Respons `data: { synced, plain, instrumental }`; `synced` berformat LRC, `plain` teks biasa, salah satunya bisa `null`. `404` bila lirik tidak ditemukan, `502` bila layanan lirik tidak tersedia. Hasil di-cache 30 hari bila ada dan 1 hari bila tidak ada.
- **Pencatatan Pemutaran (`Song Plays`)**:
  - Frontend memanggil `POST /api/v1/music/{song_id}/play` dengan body `listened_sec` (wajib, bilangan bulat 0-86400) setelah lagu diputar. **Pengunjung dan Pengguna sama-sama dapat memanggilnya.** Batas minimum pencatatan 30 detik (apakah tepat 30 detik dihitung: lihat Keputusan Terbuka D4).
  - Untuk Pengguna, pemutaran dicatat dengan `user_id`. Untuk Pengunjung, `user_id` dikosongkan dan pemutaran dicatat dengan `ip_address` (hash IP; keputusan D9).
  - Respons `201` (`counted: true`) bila dicatat; `200` dengan `counted: false` dan `reason` `too_short` atau `duplicate` bila tidak dicatat. Pemutaran ulang lagu yang sama oleh pengguna yang sama (untuk Pengunjung: IP yang sama) dalam jendela waktu tertentu dianggap `duplicate` (lama jendela: lihat Keputusan Terbuka D3). Pembatas: 30 permintaan per menit per Pengguna atau per IP (Pengunjung).
  - Data dipakai untuk statistik admin, bukan untuk rekomendasi. Data putaran Pengguna juga dipakai untuk Riwayat Lagu Diputar (keputusan D14).
- **Riwayat Lagu Diputar** (use case Pengguna pada diagram use case): Pengguna melihat riwayat lagu yang diputarnya. Mengikuti aturan bagian 3.4: fitur untuk pengguna terdaftar, dan Pengunjung yang mencoba mengaksesnya mendapat `401`. Saat ini satu-satunya tabel yang mencatat pemutaran adalah `song_plays` (bagian 5.F), yang hanya berisi putaran yang tercatat (30 detik atau lebih, bukan `duplicate`) dan memiliki `user_id` kosong untuk putaran Pengunjung. Keputusan D14: riwayat memakai `song_plays` yang ada, satu baris per putaran yang tercatat, sehingga lagu yang didengar kurang dari 30 detik atau berstatus `duplicate` tidak muncul. Endpoint `GET /api/v1/history` (Pengguna login; tanpa token `401`), terbaru di atas, 20 per halaman dengan `meta`; tiap butir berbentuk **Lagu** ditambah `played_at`. Riwayat disimpan tanpa batas waktu. Indeks (`user_id`, `played_at`) lihat 5.F.

### 4. Playlist & Favorit Pengguna
Fitur ini hanya untuk pengguna terdaftar. Pengunjung yang mencoba mengaksesnya mendapat `401`, dan antarmuka mengarahkannya ke login atau daftar.

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

1. **Autentikasi (Sanctum)**: endpoint yang mengelola data akun (profil, favorit, playlist, admin, logout) wajib header `Authorization: Bearer <token>`. Endpoint musik (`search`, `trending`, `lyrics`, `recommendations`, `stream`, `play`) **terbuka untuk Pengunjung** dan tidak mewajibkan token. Bila token dikirim ke endpoint musik terbuka (keputusan K1): token valid dikenali sebagai Pengguna (pemutaran dicatat dengan `user_id`, pembatas laju per pengguna); token tidak valid, kedaluwarsa, atau milik akun `blocked` diperlakukan sebagai Pengunjung, bukan `401`. `GET /music/audio/{song}` memakai URL bertanda tangan (bagian 2.B). Token berlaku 30 hari; setelah kedaluwarsa pengguna login ulang (Sanctum tidak memiliki refresh token).
2. **Otorisasi Admin (`EnsureUserIsAdmin` Middleware)**: endpoint `/api/v1/admin/*` mengecek `user.role == 'admin'`, selain itu HTTP 403.
3. **Pengecekan Status Akun**: middleware memeriksa `status != 'blocked'` pada setiap request ke endpoint yang membutuhkan login; akun diblokir mendapat HTTP 403 dan seluruh tokennya dicabut. Endpoint musik terbuka tidak menolak akun terblokir (blokir tidak menutup akses mendengarkan). Akun terblokir tidak dapat login dan tidak punya sesi (keputusan D12).
4. **Validasi Kepemilikan (Laravel Policy)**: operasi playlist memverifikasi `playlist.user_id == auth()->id()`; pengguna lain, termasuk Admin, mendapat HTTP 403.
5. **Validasi Input & Throttle**: FormRequest untuk semua input. Pembatas laju berlaku bersamaan; melebihi salah satunya menghasilkan HTTP 429 dengan header `Retry-After`.

   | Pembatas | Batas | Berlaku untuk |
   | :--- | :--- | :--- |
   | Global | 60 per menit per pengguna (login) atau per IP (Pengunjung) | Semua endpoint (kecuali `music/audio`) |
   | Login | 5 per menit per email + IP | `POST /auth/login` |
   | Daftar | 10 per menit per IP | `POST /auth/register` |
   | Lupa password | 5 per menit per email + IP | `POST /auth/forgot-password`, `POST /auth/reset-password` |
   | yt-dlp | 20 per menit per pengguna (login) atau per IP (Pengunjung) | `music/search`, `music/stream`, `music/{id}/recommendations`, `music/{id}/related` |
   | Pemutaran | 30 per menit per pengguna (login) atau per IP (Pengunjung) | `POST /music/{song}/play` |
   | Audio | 300 per menit per IP | `GET /music/audio/{song}` |

   Pengguna di satu jaringan yang sama (kampus, kantor) berbagi jatah per IP.

6. **Keamanan Proses Eksternal**: yt-dlp dijalankan dengan *array argument* (tanpa shell), timeout 30 detik, dan jumlah proses yt-dlp bersamaan dibatasi (bila semua slot terpakai, permintaan gagal terkontrol). Slot dipakai bersama oleh Pengunjung dan Pengguna tanpa jatah khusus (keputusan D11).
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
- `id` (PK), `user_id` (FK → users.id, Nullable, Set Null), `ip_address` (Varchar(64), Nullable), `song_id` (FK, Cascade), `played_at`
- Indeks: (`song_id`, `played_at`). Cooldown Pengunjung memakai Cache (keputusan K3), sehingga indeks (`ip_address`, `song_id`, `played_at`) tidak diperlukan.
- Indeks (keputusan D14): (`user_id`, `played_at`) untuk riwayat Pengguna.
- *Catatan*: `user_id` kosong untuk pemutaran Pengunjung, dan juga menjadi kosong bila akun dihapus (Set Null) agar statistik tidak hilang. `ip_address` hanya diisi untuk Pengunjung; diisi dengan **hash** IP, bukan IP mentah (keputusan D9). `Varchar(64)` memuat hash heksadesimal 64 karakter. Hash memakai HMAC-SHA256 dengan kunci aplikasi (`APP_KEY`), dan `ip_address` dikosongkan setelah 1 hari lewat jadwal per jam (keputusan D9).

### Perubahan dari v1.0
- Tabel `song_sources` **dihapus** (tidak ada pemetaan Spotify→YouTube).
- `songs.spotify_id` → `songs.youtube_id`; `album` menjadi nullable (terisi bila tersedia dari metadata YouTube); `cover_url` → `thumbnail`; `duration_ms` → `duration_sec`.
- Trending tidak lagi memakai tabel terpisah; data disimpan di cache.

### Perubahan dari v1.2
- `song_plays` mendapat kolom `ip_address` (Nullable) untuk pemutaran Pengunjung.
- `song_plays` mendapat indeks (`user_id`, `played_at`) untuk Riwayat Lagu Diputar (keputusan D14).

---

## 6. Rancangan RESTful API (Backend Laravel 12)

### A. Tabel Endpoint

| Method | Endpoint | Deskripsi | Access Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Pendaftaran akun baru | Pengunjung |
| `POST` | `/api/v1/auth/login` | Login & mendapatkan token | Pengunjung |
| `POST` | `/api/v1/auth/forgot-password` | Meminta tautan reset kata sandi lewat email | Pengunjung |
| `POST` | `/api/v1/auth/reset-password` | Mengatur ulang kata sandi dengan token | Pengunjung |
| `POST` | `/api/v1/auth/logout` | Mencabut token perangkat ini | Pengguna |
| `GET` | `/api/v1/profile` | Mengambil data profil | Pengguna |
| `PATCH` | `/api/v1/profile` | Memperbarui nama / avatar | Pengguna |
| `PUT` | `/api/v1/profile/password` | Mengubah kata sandi | Pengguna |
| `GET` | `/api/v1/music/trending` | Lagu trending (YouTube mostPopular, cache 7 hari) | Pengunjung |
| `GET` | `/api/v1/music/search?q=` | Pencarian lagu via yt-dlp (disaring) | Pengunjung |
| `GET` | `/api/v1/music/stream?query=` | Upsert lagu, mengembalikan `song_id`, `play_url`, `expires_at` | Pengunjung |
| `GET` | `/api/v1/music/audio/{song}` | Mengalirkan audio (URL bertanda tangan dari `stream`, mendukung Range) | Signed URL (tanpa token, tanpa pemilik) |
| `GET` | `/api/v1/music/{youtube_id}/recommendations` | Antrean otomatis (berdasarkan artis/album) | Pengunjung |
| `GET` | `/api/v1/music/{youtube_id}/related` | Lagu artis lain dari internet, diacak (tab Terkait) | Pengunjung |
| `GET` | `/api/v1/music/lyrics?title=&artist=` | Mengambil lirik (LRCLIB), `duration` opsional | Pengunjung |
| `POST` | `/api/v1/music/{song_id}/play` | Mencatat pemutaran (`listened_sec`); Pengunjung dicatat dengan IP | Pengunjung |
| `GET` | `/api/v1/favorites` | Daftar lagu favorit | Pengguna |
| `POST` | `/api/v1/favorites/{song_id}` | Menambah favorit (idempoten) | Pengguna |
| `DELETE` | `/api/v1/favorites/{song_id}` | Menghapus favorit (idempoten) | Pengguna |
| `GET` | `/api/v1/history` | Riwayat lagu diputar (20 per halaman, terbaru dulu) | Pengguna |
| `GET` | `/api/v1/playlists` | Daftar playlist milik user beserta `cover_thumbnails` (maks. 4 URL) | Pengguna |
| `POST` | `/api/v1/playlists` | Membuat playlist | Pengguna |
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

Label peran (keputusan D15): "Pengunjung" menggantikan "Public" dan "Pengguna" menggantikan "Authenticated User". "Owner User Only" dan "Admin Only" tidak disebut pada keputusan dan belum diganti.

### B. Konvensi Umum
- Setiap permintaan wajib mengirim `Accept: application/json`; isi JSON memakai `Content-Type: application/json`.
- Respons sukses: `{ "status": "success", "data": ... }` atau `{ "status": "success", "message": "..." }`.
- Respons error: `{ "status": "error", "message": "..." }`. Kegagalan validasi (422) menambahkan `errors` per field. Semua pesan berbahasa Indonesia; klien sebaiknya bergantung pada **kode status** dan kunci `errors`, bukan pada teks pesan.
- Daftar berhalaman memakai `?page=` dan mengembalikan `meta` (`current_page`, `last_page`, `per_page`, `total`). Ukuran halaman: favorit 20, playlist 50, admin/users `per_page` 1-100 (bawaan 15).

| Kode | Arti |
| :--- | :--- |
| 200 / 201 | Berhasil / berhasil dibuat |
| 401 | Endpoint yang membutuhkan login dipanggil tanpa token, atau token salah/kedaluwarsa; minta login ulang. Tidak terjadi pada endpoint musik terbuka |
| 403 | Akun diblokir (pada fitur akun), bukan admin, bukan pemilik sumber daya, atau URL bertanda tangan tidak sah |
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
Status mengacu pada 33 tes otomatis backend (`php artisan test`) per 24 Oktober 2026. Baris bertanda v1.3, K1, D13, dan D14 mengacu pada 72 tes setelah tahap backend B1 sampai B8 (16 Nov 2026); tahap B9 (21 Nov 2026) menambah 5 tes (77), dan tahap B10 menambah 4 tes sehingga totalnya 81. Frontend belum punya kerangka tes otomatis; tampilan diperiksa dengan uji asap (Playwright) terhadap API tiruan.

| Kriteria | Status |
| :--- | :--- |
| **Role**: user `'user'` mendapat `403` saat mengakses `/api/v1/admin/*` | Sebagian teruji: `GET /admin/users` dan `GET /admin/stats`; `block` diuji hanya dari sisi admin; `unblock`, `role`, dan `DELETE` belum |
| **Isolasi Data**: User A tidak dapat mengubah atau melihat playlist milik User B | Teruji: enam operasi (lihat, ubah, tambah lagu, urut, hapus lagu, hapus playlist) semuanya `403`, data tidak berubah. Pelaku yang diuji: pengguna biasa; Admin belum |
| **Status Blokir**: akun `blocked` ditolak pada fitur akun dan token lamanya tidak berlaku; musik tetap dapat diputar sebagai Pengunjung | Sebagian teruji: permintaan dengan token akun terblokir mendapat `403` dan token terhapus (diuji pada `GET /profile`); login oleh akun terblokir dan endpoint lain belum |
| **URL Audio**: tanda tangan salah/hilang, kedaluwarsa, atau lagu diubah ditolak `403` | Teruji ulang setelah v1.3: 3 skenario (`AudioUrlTest`: tanda tangan salah/hilang, kedaluwarsa, lagu diubah) ditambah `play_url` tanpa parameter pengguna dan URL tanpa pemilik (`PlayUrlNotBoundToUserTest`); dua skenario pemilik diblokir/dihapus dihapus karena tidak berlaku. Jalur sukses (`200`/`206` dengan `Range`) belum |
| **Registrasi**: tidak dapat menetapkan `role` atau `status` | Teruji |
| **Reorder playlist**: urutan valid diterapkan; daftar kurang, berisi id asing, atau ganda ditolak `422` tanpa mengubah urutan; hapus lagu merapatkan posisi | Teruji |
| **Favorit**: tambah dan hapus idempoten; privat per pengguna | Teruji |
| **Pencatatan pemutaran**: dengar singkat tidak dihitung (`too_short`); pemutaran ulang cepat tidak dihitung (`duplicate`); `listened_sec` wajib | Teruji. Batas tepat 30 detik dan lama jendela duplikat belum teruji |
| **Trending**: saat API YouTube gagal, endpoint tetap mengembalikan data minggu sebelumnya | Belum teruji |
| **Antrean Otomatis**: semua lagu berjudul berbeda (judul ternormalisasi), tidak memuat lagu yang sedang diputar, dan berasal dari artis atau album yang sama (kecuali entri `source: trending`; lihat D1) | Belum teruji |
| **Aturan admin**: tidak boleh memblokir/menghapus/menurunkan diri sendiri dan admin terakhir | Belum teruji |
| Batas 500 lagu per playlist, pencabutan token perangkat lain saat ganti password, pembatas laju (`429`) | Belum teruji |
| **Akses Pengunjung (v1.3)**: tanpa token, `trending`, `search`, `lyrics`, `recommendations`, `stream` dijawab `200` | Teruji (`OpenMusicRoutesTest`, `VisitorPlayTest`) |
| **Akses tertutup bagi Pengunjung (v1.3)**: tanpa token, `favorites`, `playlists`, `profile`, `admin/*` dijawab `401` | Sebagian teruji (`OpenMusicRoutesTest`): `favorites`, `playlists`, `profile`, `admin/stats`; `admin/users` belum |
| **URL audio Pengunjung (v1.3)**: `play_url` hasil `stream` tanpa token dapat diputar (`200`/`206` dengan `Range`) | Belum teruji |
| **Pencatatan Pengunjung (v1.3)**: `play` tanpa token mencatat `user_id` kosong dan `ip_address` terisi; pemutaran ulang lagu yang sama dari IP yang sama dalam 60 detik dijawab `duplicate` | Teruji (`VisitorPlayTest`); `ip_address` berisi hash, bukan IP mentah, dan dikosongkan setelah 1 hari |
| **Pembatas per IP (v1.3)**: Pengunjung mendapat `429` saat melewati batas global, yt-dlp, pemutaran, dan audio | Belum teruji |
| **Identitas opsional (v1.3, K1)**: endpoint musik terbuka dengan token valid dikenali sebagai Pengguna (`play` mencatat `user_id`); dengan token tidak valid atau kedaluwarsa dijawab seperti Pengunjung, bukan `401` | Teruji (`OptionalIdentityTest`, `OpenMusicRoutesTest`) |
| **Lagu Terkait (K13)**: `404` untuk lagu belum dikenal; minimal 15 lagu artis lain tanpa token; tanpa lagu kembar atau lagu yang disaring; urutan acak tiap permintaan; `limit` dihormati dan dibatasi 30; bila yt-dlp gagal tetap menjawab dari Trending dan hasil tidak di-cache | Teruji (`RelatedTest`, dengan yt-dlp dan Trending ditiru); mutu hasil pencarian YouTube sungguhan belum diuji |
| **Lupa password (D13)**: jawaban sama untuk email terdaftar dan tidak; akun `blocked` tidak dikirimi email dan ditolak `403` saat reset; token berlaku 60 menit dan sekali pakai; reset mencabut semua token login; pembatas 5 per menit | Teruji (`PasswordResetTest`); pengiriman email sungguhan belum diuji |
| **Riwayat lagu diputar (D14)**: hanya milik pengguna sendiri, terbaru dulu, 20 per halaman, `401` tanpa token, `403` akun blocked | Teruji (`HistoryTest`) |

---

## 8. Keputusan Terbuka
Hal berikut belum diputuskan dan sengaja dibiarkan terbuka; dokumen ini tidak memilihkan salah satunya. D8 (aktor Pengunjung) sudah diputuskan pada v1.3. D17 dan D18 diputuskan pada 21 Nov 2026 (lihat riwayat revisi dan bagian 10). D9, D10, D12, D15, D16, K1, K3, K6, dan K7 diputuskan pada rev. 15 Nov 2026 dan tidak lagi terbuka (keputusannya tercatat di bagian terkait dan di riwayat revisi); D10 kemudian digantikan K8. D11, D13, dan D14 diputuskan pada 16 Nov 2026. K8 sampai K11 diputuskan pada 17 Nov 2026 (bagian 10).

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
Butir di bawah dicocokkan dengan kode backend per 24 Oktober 2026.

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

**Revisi v1.3 dan v1.3 rev. 15 Nov 2026 sudah dicocokkan dengan kode.** Backend mengikutinya pada tahap B1 sampai B8 (72 tes lulus per 16 Nov 2026): rute musik terbuka dengan identitas opsional (K1), pembatas laju per pengguna atau per IP, `play_url` tanpa pemilik, kolom `song_plays.ip_address` berisi HMAC (D9) dengan cooldown lewat Cache (K3), Lupa password (D13), dan Riwayat (D14). Frontend mengikutinya pada tahap F1 sampai F9 (bagian 10).


---

## 10. Antarmuka Web (React.js)

*Bagian baru pada v1.3; ditulis ulang pada v1.4 menurut implementasi dan keputusan 17 Nov 2026.*

**Aturan umum.**
- **Tema** hitam pekat dengan aksen merah (K11).
- Pengunjung dan Pengguna memakai cangkang yang sama: bilah atas, panel kiri, area utama, dan bilah pemutar bawah.
- Di ponsel (lebar di bawah 768 px) navigasi berpindah ke **menu bawah**: Pengunjung melihat Beranda dan Masuk; Pengguna melihat menu akunnya.
- Bila sesi berakhir saat lagu sedang diputar (misalnya token kedaluwarsa dan endpoint akun menjawab `401`), pemutaran **tetap berjalan** dan pemakai diperlakukan sebagai Pengunjung (K7).

**Halaman.**

| Alamat | Halaman | Akses |
| :--- | :--- | :--- |
| `/` | Beranda | Pengunjung |
| `/cari` | Hasil Cari | Pengunjung |
| `/putar` | Halaman Pemutar | Pengunjung |
| `/login`, `/register` | Masuk, Daftar | Pengunjung (pengguna yang sudah login dialihkan) |
| `/lupa-password`, `/reset-password` | Lupa password, atur ulang kata sandi | Pengunjung (tidak dialihkan bila sudah login, D16) |
| `/favorit`, `/riwayat`, `/playlist`, `/playlist/{id}`, `/profil` | Fitur akun | Pengguna |
| `/admin/pengguna`, `/admin/statistik` | Dashboard Admin (`/admin` beralih ke `/admin/pengguna`) | Admin |

### A. Cangkang dan Beranda
- **Bilah atas**: logo, kolom cari di tengah (pencarian dikirim hanya saat Enter), serta **Daftar** dan **Masuk** di kanan untuk Pengunjung; untuk Pengguna, foto profil dan tombol **Keluar**.
- **Panel kiri**: menu navigasi (Beranda, Cari; untuk Pengguna ditambah Favorit, Riwayat, Playlist, Profil, dan untuk Admin menu Admin), tombol **Playlist baru**, lalu daftar playlist Pengguna. Untuk Pengunjung, daftar playlist diganti ajakan masuk, dan "Playlist baru" mengarah ke login.
- **Isi beranda**: "Trending" berbentuk kisi kartu (sampai 25 lagu dari `GET /music/trending`); tiap kartu memuat sampul 16:9, durasi, judul, dan artis. Memilih kartu memutar lagu itu dengan "Berikutnya" berisi rekomendasi (K12).

### B. Hasil Cari
Daftar lagu "Hasil untuk ..." dari `GET /music/search`. Tidak ada chip penyaring karena pencarian hanya mengembalikan lagu.

### C. Halaman Pemutar (`/putar`)
- **Pembukaan halaman**: saat Pengunjung atau Pengguna memutar sebuah lagu, tampilan berpindah ke Halaman Pemutar untuk lagu itu (K6).
- **Area kiri**: sampul lagu besar berukuran 16:9 (sampul saja; aplikasi memutar audio tanpa video), judul, artis, serta tombol **Favorit** dan **Tambah ke playlist** (K9). Pengunjung yang menekannya diarahkan ke login. Menu **Tambah ke playlist** memuat daftar playlist Pengguna dan pilihan **+ Playlist baru**: Pengguna yang belum punya playlist dapat membuatnya dari menu itu, dan lagu yang sedang diputar langsung dimasukkan ke dalamnya.
- **Panel kanan**: tab **Berikutnya** (sebelumnya Antrean; K12), **Lirik**, dan **Terkait** (K8, K13), serta sakelar **Autoplay**. Lagu yang dipilih dari Beranda atau Hasil Cari memulai antrean berisi satu lagu, lalu "Berikutnya" diisi dari rekomendasi lagu itu tanpa bergantung pada Autoplay; lagu yang dipilih dari Favorit, Riwayat, atau playlist memakai daftar itu sebagai antrean. Tab **Terkait** berisi lagu artis lain dari `GET /music/{youtube_id}/related` (acak, minimal 15 bila sumber cukup), tanpa lagu yang sudah ada di Berikutnya. Bawaan Autoplay mati dan pilihannya diingat di peramban (K10). Bila Autoplay menyala dan antrean hampir habis, antrean ditambah dari rekomendasi lagu yang sedang diputar; ini tidak dilakukan saat Ulangi = semua lagu. Memilih lagu pada tab Terkait mengganti antrean dengan daftar terkait, dimulai dari lagu itu.
- **Bilah pemutar bawah**: sampul kecil dan judul (menuju `/putar`), acak, sebelumnya, putar/jeda, berikutnya, ulang, garis progres, waktu, dan slider volume (tidak disimpan). Tidak ada tombol suka di bilah ini (K9).

### D. Dashboard Admin
Tata letak terpisah dari antarmuka Pengguna, dengan menu navigasi sendiri: **Pengguna** (`/admin/pengguna`: daftar, blokir/buka blokir, ubah role, hapus) dan **Statistik** (`/admin/statistik`: `total_users`, `total_playlists`, `top_songs`), serta tautan **Kembali ke pemutar** karena Admin boleh memakai fitur Pengguna. Halaman dijaga berdasarkan `role`; Pengguna biasa yang membukanya ditolak (API menjawab `403`).

### E. Di Luar Lingkup
Bagian artis populer; chip Artis, Album, Playlist, dan Podcast; chip Familiar/Discover dan chip penyaring apa pun; tab Komentar; jumlah penayangan dan suka; tombol tidak suka; gambar video; tombol hamburger, cast, Explore, dan Upgrade; blok "Hasil teratas" pada Hasil Cari; baris trending geser dengan "Tampilkan semua" (D17).

### F. Belum Ditetapkan
Tidak ada. Thumbnail kecil pada daftar dan bilah bawah tetap berbentuk persegi tanpa pemotongan khusus (D18).
