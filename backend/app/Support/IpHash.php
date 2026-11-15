<?php
namespace App\Support;

/**
 * Hash IP Pengunjung (keputusan D9): HMAC-SHA256 dengan kunci aplikasi.
 * Hasilnya 64 karakter heksadesimal dan tidak dapat ditebak balik tanpa kunci.
 */
class IpHash
{
    public static function of(string $ip): string
    {
        return hash_hmac('sha256', $ip, (string) config('app.key'));
    }
}
