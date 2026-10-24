# ASATunes: Dokumentasi API

Versi dokumen: 1.1 (24 Oktober 2026). Mengacu pada `01_SRS.md` v1.1.
Mencerminkan backend Laravel sampai Langkah 36 (semua endpoint di bawah sudah dibangun dan teruji).
Perubahan dari 1.0: `proxy-audio` diganti URL audio bertanda tangan (`play_url`).

---

## 1. Konvensi umum

### 1.1 Alamat dan header

| Hal | Nilai |
|---|---|
| Base URL (lokal) | `http://localhost:8000/api/v1` |
| Format | JSON, UTF-8 |
| Header wajib | `Accept: application/json` |
| Header untuk isi JSON | `Content-Type: application/json` |
| Autentikasi | `Authorization: Bearer <token>` |

`Accept: application/json` wajib dikirim di setiap permintaan. Tanpa itu, Laravel bisa menganggap permintaan datang dari browser biasa.

### 1.2 Bentuk respons

Berhasil:

```json
{ "status": "success", "data": { } }
{ "status": "success", "message": "Teks pesan." }
```

Gagal:

```json
{ "status": "error", "message": "Teks pesan." }
```

Validasi gagal (422):

```json
{
  "status": "error",
  "message": "Data yang dikirim tidak valid.",
  "errors": { "title": ["Judul wajib diisi."] }
}
```

Semua pesan berbahasa Indonesia. Klien sebaiknya bergantung pada **kode status** dan kunci `errors`, bukan pada teks pesan.

### 1.3 Kode status

| Kode | Arti |
|---|---|
| 200 / 201 | Berhasil / berhasil dibuat |
| 401 | Token tidak ada, salah, atau kedaluwarsa. Minta login ulang |
| 403 | Akun diblokir, bukan admin, atau bukan pemilik sumber daya |
| 404 | Sumber daya tidak ditemukan (juga untuk format ID yang salah pada beberapa route) |
| 405 | Metode HTTP tidak diizinkan |
| 422 | Validasi gagal, atau aturan bisnis ditolak |
| 429 | Terlalu banyak permintaan. Lihat header `Retry-After` |
| 502 | Layanan pihak ketiga gagal (stream, proxy, lirik) |
| 503 | Layanan musik atau data trending tidak tersedia |

Akun yang diblokir mendapat `403` di semua endpoint, dan semua tokennya dicabut pada saat itu juga.

### 1.4 Halaman (pagination)

Daftar berhalaman memakai `?page=` dan mengembalikan:

```json
{
  "status": "success",
  "data": [ ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 20, "total": 51 }
}
```

### 1.5 Pembatas laju (rate limit)

| Pembatas | Batas | Berlaku untuk |
|---|---|---|
| Global | 60 per menit per pengguna | Semua endpoint setelah login (kecuali `music/audio`, yang tanpa token) |
| Login | 5 per menit per email + IP | `POST /auth/login` |
| Daftar | 10 per menit per IP | `POST /auth/register` |
| yt-dlp | 20 per menit per pengguna | `music/search`, `music/stream`, `music/{id}/recommendations` |
| Pemutaran | 30 per menit per pengguna | `POST /music/{song}/play` |
| Audio | 300 per menit per pengguna | `GET /music/audio/{song}` (URL bertanda tangan) |

Batas-batas ini berlaku bersamaan. Melebihi salah satunya menghasilkan `429`.

### 1.6 CORS

Hanya origin frontend yang diizinkan (variabel `FRONTEND_URL`, bawaan `http://localhost:5173`). Header yang bisa dibaca klien lintas origin: `Content-Range`, `Accept-Ranges`, `Content-Length`.

### 1.7 Token

Token Sanctum berlaku **30 hari** sejak login. Simpan di klien, kirim sebagai `Bearer`. Logout hanya mencabut token perangkat itu.

---

## 2. Bentuk objek

**User**

```json
{
  "id": 2, "name": "Dwi", "email": "dwi@example.com",
  "email_verified_at": null,
  "avatar_url": "http://localhost:8000/storage/avatars/abc.jpg",
  "status": "active", "role": "user",
  "created_at": "2026-10-18T17:04:41.000000Z", "updated_at": "2026-10-18T17:29:14.000000Z"
}
```

`status`: `active` | `blocked`. `role`: `user` | `admin`. `avatar_url` bernilai `null` kalau belum ada foto.

**Kandidat lagu** (hasil `search`, `trending`, `recommendations`): lagu yang **belum tentu** ada di database kita, sehingga **tidak punya `id`**:

```json
{
  "youtube_id": "_N6vSc_mT6I", "title": "TULUS - Hati-Hati di Jalan (Official Lyric Video)",
  "artist": "Tulus", "thumbnail": "https://i.ytimg.com/vi/_N6vSc_mT6I/hqdefault.jpg",
  "duration_sec": 242
}
```

`recommendations` menambah kolom `source`: `album` | `artist` | `trending`.

**Lagu** (hasil `favorites` dan `playlists`): lagu yang sudah tersimpan, **punya `id`**:

```json
{
  "id": 4, "youtube_id": "_N6vSc_mT6I", "title": "TULUS - Hati-Hati di Jalan (Official Lyric Video)",
  "artist": "Tulus", "album": null,
  "thumbnail": "https://i.ytimg.com/vi/_N6vSc_mT6I/hqdefault.jpg", "duration_sec": 242
}
```

**Playlist**

```json
{
  "id": 3, "title": "Santai Sore", "description": "Lagu pengantar sore",
  "songs_count": 5,
  "cover_thumbnails": ["https://i.ytimg.com/vi/…/hqdefault.jpg"],
  "created_at": "…", "updated_at": "…"
}
```

`cover_thumbnails` berisi **paling banyak 4** URL sampul dari lagu-lagu pertama, untuk dirangkai jadi kolase.

---

## 3. Alur utama untuk frontend

**Aturan kunci: `youtube_id` dan `song_id` itu dua hal berbeda.**

- Hasil pencarian, trending, dan rekomendasi hanya punya `youtube_id`.
- Favorit, playlist, dan pencatat pemutaran memakai `song_id` (angka dari tabel `songs`).
- `song_id` didapat dari `GET /music/stream`, yang sekaligus menyimpan lagunya.

Alur memutar satu lagu:

1. Pengguna memilih lagu dari daftar (`youtube_id`).
2. `GET /music/stream?query=<youtube_id>` mengembalikan `song_id` dan `play_url`.
3. Pasang `play_url` apa adanya sebagai sumber audio, misalnya `<audio src="{play_url}">`. Tidak perlu header `Authorization` (lihat 6.3).
4. Setelah mendengarkan, kirim `POST /music/{song_id}/play` dengan `listened_sec`. Hanya dihitung bila 30 detik atau lebih.
5. Untuk antrean berikutnya: `GET /music/<youtube_id lagu sekarang>/recommendations`.
6. Untuk lirik: `GET /music/lyrics?title=…&artist=…&duration=…` dari data lagu yang sedang diputar.
7. Ikon hati dan "tambah ke playlist" memakai `song_id` dari langkah 2.

---

## 4. Autentikasi

### POST `/auth/register`

| Field | Aturan |
|---|---|
| `name` | wajib, maks 100 karakter |
| `email` | wajib, email valid, unik |
| `password` | wajib, minimal 6 karakter |

`201`: `data` berisi objek **User** (peran selalu `user`). **Tidak** mengembalikan token: panggil login sesudahnya. Field lain seperti `role` atau `status` diabaikan. Pembatas: 10 per menit per IP.

### POST `/auth/login`

| Field | Aturan |
|---|---|
| `email` | wajib |
| `password` | wajib |

- `200`: `data: { user, token }`. `token` hanya tampil sekali, simpan.
- `401`: `Email atau kata sandi salah.` (pesan sama untuk email tak terdaftar dan password salah).
- `403`: `Akun Anda telah diblokir.`
- `429`: lebih dari 5 percobaan per menit.

### POST `/auth/logout` (login)

`200`: `Berhasil logout.` Mencabut token yang dipakai pada permintaan ini saja.

---

## 5. Profil (login)

### GET `/profile`

`200`: `data` berisi objek **User** milik pemilik token.

### PATCH `/profile`

| Field | Aturan |
|---|---|
| `name` | opsional |
| `avatar` | opsional, gambar `jpg`/`jpeg`/`png`/`webp`, maks 2048 KB |

`200`: `data` berisi User terbaru. Foto lama dihapus otomatis saat foto baru tersimpan.

**Penting untuk unggah foto:** kirim sebagai `multipart/form-data` dengan metode **`POST`** dan field tambahan `_method=PATCH`. (PHP tidak membaca multipart pada metode `PATCH`.) Di React: `formData.append('_method', 'PATCH')`. Mengubah nama saja boleh dengan `PATCH` JSON biasa.

### PUT `/profile/password`

| Field | Aturan |
|---|---|
| `current_password` | wajib |
| `password` | wajib, minimal 6 karakter, harus berbeda dari kata sandi lama |

- `200`: `Kata sandi berhasil diubah.` Semua token **perangkat lain** dicabut; token yang sedang dipakai tetap berlaku.
- `422`: `current_password` salah (`Kata sandi lama salah.`) atau aturan password dilanggar.

---

## 6. Musik (login)

### 6.1 GET `/music/search`

| Query | Aturan |
|---|---|
| `q` | wajib, 1 sampai 100 karakter |

`200`: `data` berisi daftar **Kandidat lagu**. Hasil **disaring**: durasi 60 sampai 600 detik, dan judul yang memuat kata seperti karaoke, instrumental, cover, full album, nonstop, kumpulan, playlist, slowed, nightcore disingkirkan. Karena itu jumlahnya bisa kurang dari 10, bahkan kosong (`[]`).
`503`: yt-dlp tidak tersedia. Pembatas: yt-dlp.

### 6.2 GET `/music/stream`

| Query | Aturan |
|---|---|
| `query` | wajib, tepat 11 karakter `A-Z a-z 0-9 _ -` (YouTube ID) |

`200`: `data: { song_id, play_url, expires_at }`. Lagu otomatis tersimpan (hanya metadata). Sumber audio di-cache 90 menit di server, jadi panggilan berulang sangat cepat. Panggilan pertama untuk lagu baru sekitar 6 detik.
`422`: format ID salah. `502`: `Lagu tidak dapat diputar saat ini.` Pembatas: yt-dlp.

`play_url` adalah alamat di server kita sendiri yang **bertanda tangan** dan berlaku 3 jam (`expires_at`, format ISO 8601). Pakai **apa adanya**: jangan ubah host, jalur, atau parameternya, dan jangan lewatkan proxy yang mengubah alamat, karena tanda tangan dihitung dari alamat lengkap (`APP_URL` harus sama dengan alamat API yang diakses klien). Setelah kedaluwarsa, panggil `stream` lagi untuk mendapat yang baru. URL asli `googlevideo.com` tidak pernah dikirim ke klien.

### 6.3 GET `/music/audio/{song}` (URL bertanda tangan, tanpa token)

Alamat ini **tidak dipanggil dengan menyusun sendiri**: selalu pakai `play_url` dari `stream` (6.2). Tidak memerlukan header `Authorization`, sehingga bisa langsung dipasang di `<audio src>` atau pemutar Android.

Mengalirkan audio dari server. Mendukung header **`Range`** (misalnya `bytes=1000000-`): dijawab `206` dengan `Content-Range`, sehingga *seek* bekerja. `Content-Type` diteruskan dari sumber (misalnya `audio/webm`).

- `403`: tanda tangan salah atau hilang, URL sudah kedaluwarsa, atau pemilik URL diblokir atau sudah dihapus. Tindakan klien: panggil `stream` lagi (kalau akun diblokir, tetap `403`).
- `502`: sumber audio gagal. Server sudah mencoba mengambil sumber baru satu kali. Klien boleh mencoba lagi nanti.
- Pembatas: 300 per menit per pengguna (tidak terkena pembatas global).

### 6.4 GET `/music/trending`

`200`: `data` berisi daftar **Kandidat lagu** (sampai 25, durasi 60 sampai 600 detik) dari video musik terpopuler YouTube (kategori Musik, wilayah Indonesia). Diperbarui otomatis seminggu sekali (Senin 03:00 UTC). Kalau pembaruan gagal, data minggu lalu tetap dipakai.
`503`: `Data trending belum tersedia.` (hanya bila belum pernah berhasil sama sekali).

### 6.5 GET `/music/lyrics`

| Query | Aturan |
|---|---|
| `title` | wajib, maks 200 |
| `artist` | wajib, maks 200 |
| `duration` | opsional, bilangan bulat 1 sampai 3600 (detik; membantu mencocokkan versi yang tepat) |

`200`: `data: { synced, plain, instrumental }`.
`synced` berformat LRC (`[00:02.98] baris lirik`) untuk lirik berjalan, `plain` teks biasa. Salah satunya bisa `null`.
`404`: `Lirik tidak ditemukan.` (tampilkan "tidak ada lirik"). `502`: `Layanan lirik sedang tidak tersedia.` (boleh dicoba lagi nanti). Hasil di-cache 30 hari (ada) atau 1 hari (tidak ada).

### 6.6 GET `/music/{youtube_id}/recommendations`

| Parameter | Aturan |
|---|---|
| `youtube_id` (path) | 11 karakter `A-Za-z0-9_-` |
| `limit` (query) | opsional, 1 sampai 20, bawaan 10 |

`200`: `data` berisi daftar kandidat dengan kolom `source` (`album`, `artist`, `trending`). Tanpa judul kembar, tanpa karaoke atau kompilasi, durasi 60 sampai 600 detik. Bisa **kurang dari `limit`**: Trending hanya dipakai bila hasil yang relevan kurang dari 3. Antrean bergulir: minta lagi memakai lagu yang baru diputar.
`404`: format ID salah atau lagu belum dikenal (`Lagu belum dikenal. Putar lagu ini terlebih dahulu.`), jadi panggil `stream` dulu. Pembatas: yt-dlp. Hasil di-cache 12 jam.

### 6.7 POST `/music/{song}/play`

`{song}` = `song_id` (angka).

| Field | Aturan |
|---|---|
| `listened_sec` | wajib, bilangan bulat 0 sampai 86400 |

- `201`: `data: { counted: true, reason: null }`, pemutaran dicatat.
- `200`: `data: { counted: false, reason: "too_short" }` (kurang dari 30 detik) atau `"duplicate"` (lagu yang sama sudah dicatat untuk pengguna ini dalam 60 detik terakhir).
- `404`: lagu tidak ada. Pembatas: 30 per menit.

---

## 7. Favorit (login)

Semua operasi hanya menyangkut favorit milik pemilik token.

| Method | Path | Hasil |
|---|---|---|
| GET | `/favorites` | `200`, `data`: daftar **Lagu** + `favorited_at`, terbaru di atas, 20 per halaman, dengan `meta` |
| POST | `/favorites/{song}` | `201` `Ditambahkan ke favorit.` atau `200` `Lagu sudah ada di favorit.` |
| DELETE | `/favorites/{song}` | `200` `Dihapus dari favorit.` atau `Lagu tidak ada di favorit.` |

`{song}` = `song_id`. Menambah dan menghapus bersifat idempoten: aman dikirim ulang. `404` bila lagu tidak ada.

---

## 8. Playlist (login)

Hanya pemilik yang bisa melihat dan mengubah. Pengguna lain, termasuk admin, mendapat `403`.

| Method | Path | Hasil |
|---|---|---|
| GET | `/playlists` | `200`, daftar **Playlist** milikku, 50 per halaman, dengan `meta` |
| POST | `/playlists` | `201`, `data`: Playlist baru |
| GET | `/playlists/{playlist}` | `200`, `data`: Playlist + `songs` (daftar **Lagu** berurutan) |
| PATCH/PUT | `/playlists/{playlist}` | `200`, `data`: Playlist terbaru |
| DELETE | `/playlists/{playlist}` | `200` `Playlist dihapus.` (lagunya sendiri tidak ikut terhapus) |

Isi `POST` dan `PATCH`:

| Field | Aturan |
|---|---|
| `title` | wajib saat `POST`, opsional saat `PATCH`, maks 100 |
| `description` | opsional, boleh `null`, maks 500 |

### Isi playlist

| Method | Path | Isi | Hasil |
|---|---|---|---|
| POST | `/playlists/{playlist}/songs` | `{ "song_id": 4 }` | `201` `Lagu ditambahkan ke playlist.` (ditaruh paling akhir), `200` `Lagu sudah ada di playlist.`, `422` bila lagu tidak ada atau playlist sudah penuh (maks **500** lagu) |
| DELETE | `/playlists/{playlist}/songs/{song}` | | `200` `Lagu dihapus dari playlist.` atau `Lagu tidak ada di playlist.`. Urutan sisanya dirapatkan |
| PUT | `/playlists/{playlist}/songs/order` | `{ "song_ids": [6, 4, 5] }` | `200` `Urutan playlist diperbarui.` |

Aturan `order`: `song_ids` harus berisi **persis** semua lagu yang ada di playlist, dalam urutan baru, tanpa id ganda. Kalau daftarnya tidak cocok (misalnya playlist berubah dari perangkat lain), dijawab `422` `Daftar lagu tidak cocok dengan isi playlist. Muat ulang playlist lalu coba lagi.` dan urutan tidak berubah. Respons ini artinya klien harus memuat ulang playlist.

---

## 9. Admin (login, peran `admin`)

Semua endpoint di bawah `/admin` menjawab `403` untuk pengguna biasa.

| Method | Path | Hasil |
|---|---|---|
| GET | `/admin/users` | `200`, daftar **User** terbaru dulu, dengan `meta`. Query: `per_page` (1 sampai 100, bawaan 15), `page` |
| POST | `/admin/users/{user}/block` | `200`, `data`: User. Semua tokennya dicabut seketika |
| POST | `/admin/users/{user}/unblock` | `200`, `data`: User |
| PATCH | `/admin/users/{user}/role` | isi `{ "role": "admin" \| "user" }`. `200`, `data`: User |
| DELETE | `/admin/users/{user}` | `200` `Akun berhasil dihapus.` (token dan foto profil ikut dihapus) |
| GET | `/admin/stats` | `200`, `data: { total_users, total_playlists, top_songs }` |

Aturan bisnis (dijawab `422`):
- Admin tidak boleh memblokir, menghapus, atau menurunkan peran **dirinya sendiri**.
- Admin terakhir tidak boleh dihapus atau diturunkan.

`top_songs`: sampai 10 lagu, urut dari yang paling sering diputar, masing-masing berisi `plays_count`. Hanya lagu yang pernah diputar. **Hasil di-cache 10 menit**, jadi angkanya bisa tertinggal.

---

## 10. Keputusan terbuka dan catatan untuk SRS v1.2

1. **Memutar audio (sudah diputuskan, Langkah 36).** SRS 2.B mewajibkan `proxy-audio` memakai token `Bearer`, tetapi elemen `<audio src>` di browser tidak bisa mengirim header `Authorization`. Diputuskan memakai URL bertanda tangan (`play_url`) yang diterbitkan `stream`, berlaku 3 jam dan terikat ke pengguna. Endpoint `proxy-audio?url=` dihapus, sehingga klien tidak lagi mengirim alamat apa pun ke server. **SRS 2.B perlu diperbarui** agar mencerminkan ini. Konsekuensinya: siapa pun yang memegang `play_url` bisa memutar lagu itu sampai kedaluwarsa atau pemiliknya diblokir.
2. **Pencarian disaring.** SRS belum menyebut aturan penyaringan (durasi 60 sampai 600 detik, kata terlarang). Perlu dicatat di SRS.
3. **Smart Queue.** Prioritas album hanya berlaku untuk lagu yang sudah tersimpan di database, karena pencarian YouTube tidak memberi nama album. Hasil bisa kurang dari yang diminta.
4. **Tambahan di luar SRS:** batas 500 lagu per playlist, pencabutan token perangkat lain saat password diganti, dan pembatas pendaftaran 10 per menit.
5. **Belum ada:** penanda `is_favorite` pada hasil pencarian atau stream (ikon hati harus memuat daftar favorit sendiri), dan dokumentasi format respons `429`.
6. **Jadwal** (`trending:refresh` Senin 03:00, `ytdlp:update` Minggu 03:30) mengikuti zona waktu aplikasi (UTC).
