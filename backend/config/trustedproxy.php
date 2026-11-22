<?php

/*
 * Proxy tepercaya (tahap B10). Dipakai bila API berjalan di belakang tunnel atau reverse proxy
 * (Tailscale Funnel, Cloudflare Tunnel, Nginx di depan). Tanpa ini, semua klien tampak
 * berasal dari alamat proxy dan permintaan tampak `http`, sehingga pembatas laju per IP,
 * hash IP Pengunjung (D9), dan tautan audio bertanda tangan menjadi salah.
 *
 * TRUSTED_PROXIES di .env:
 *   (kosong)           tidak ada proxy; header X-Forwarded-* diabaikan (bawaan, aman untuk lokal)
 *   127.0.0.1          agen tunnel berjalan di mesin yang sama (disarankan)
 *   10.0.0.1,10.0.0.2  daftar alamat dipisah koma
 *   *                  percaya pemanggil langsung; hanya bila server TIDAK dapat dijangkau selain lewat proxy
 */
return [
    'proxies' => env('TRUSTED_PROXIES') ?: null,
];
