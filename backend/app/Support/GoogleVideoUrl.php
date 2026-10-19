<?php
namespace App\Support;

class GoogleVideoUrl
{
    /**
     * Hanya https://<subdomain>.googlevideo.com, tanpa userinfo dan tanpa port aneh.
     */
    public static function isValid(string $url): bool
    {
        // Tolak karakter kontrol, spasi, dan backslash (sering dipakai mengecoh parser URL)
        if (str_contains($url, '\\') || preg_match('/[\x00-\x20\x7f]/', $url)) {
            return false;
        }

        $parts = parse_url($url);

        if ($parts === false || isset($parts['user']) || isset($parts['pass'])) {
            return false;
        }

        if (strtolower($parts['scheme'] ?? '') !== 'https') {
            return false;
        }

        if (isset($parts['port']) && $parts['port'] !== 443) {
            return false;
        }

        $host = strtolower($parts['host'] ?? '');

        return (bool) preg_match('/^(?:[a-z0-9-]+\.)+googlevideo\.com$/', $host);
    }
}
