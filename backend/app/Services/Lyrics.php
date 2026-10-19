<?php
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class Lyrics
{
    private const BASE = 'https://lrclib.net/api';

    /**
     * @return array{synced: ?string, plain: ?string, instrumental: bool}|null  null = tidak ada lirik
     * @throws \RuntimeException kalau LRCLIB sedang bermasalah (tidak di-cache)
     */
    public function find(string $title, string $artist, ?int $duration): ?array
    {
        $title  = $this->cleanTitle($title);
        $artist = YtDlp::cleanArtist($artist);

        $key = 'lyrics:' . sha1(mb_strtolower("{$artist}|{$title}|{$duration}"));
        $hit = Cache::get($key);

        if ($hit !== null) {
            return $hit === false ? null : $hit;
        }

        $result = $this->fetchExact($title, $artist, $duration) ?? $this->fetchSearch($title, $artist);

        $normalized = $result ? [
            'synced'       => $result['syncedLyrics'] ?? null,
            'plain'        => $result['plainLyrics'] ?? null,
            'instrumental' => (bool) ($result['instrumental'] ?? false),
        ] : null;

        Cache::put($key, $normalized ?? false, $normalized ? now()->addDays(30) : now()->addDay());

        return $normalized;
    }

    private function fetchExact(string $title, string $artist, ?int $duration): ?array
    {
        $response = $this->client()->get(self::BASE . '/get', array_filter([
            'track_name'  => $title,
            'artist_name' => $artist,
            'duration'    => $duration,
        ]));

        if ($response->status() === 404 || $response->serverError()) {
            // 404 = tidak ada; 5xx = /get sedang bermasalah, lanjut ke /search
            return null;
        }

        if ($response->failed()) {
            throw new \RuntimeException('LRCLIB /get status ' . $response->status());
        }

        return $response->json();
    }

    private function fetchSearch(string $title, string $artist): ?array
    {
        $response = $this->client()->get(self::BASE . '/search', ['q' => "{$artist} {$title}"]);

        if ($response->failed()) {
            throw new \RuntimeException('LRCLIB /search status ' . $response->status());
        }

        foreach ($response->json() ?? [] as $row) {
            if (! empty($row['syncedLyrics']) || ! empty($row['plainLyrics'])) {
                return $row;
            }
        }

        return null;
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withUserAgent('ASATunes/1.0 (https://github.com/Dwi-Susilo/asatunes)')
            ->timeout(8)
            ->retry(1, 300, throw: false);
    }

    /** Buang "(Official Video)", "[Lyrics]", dsb. agar pencarian lebih tepat. */
    private function cleanTitle(string $title): string
    {
        $clean = preg_replace('/\s*[\(\[][^\)\]]*[\)\]]/u', '', $title);

        return trim($clean !== '' && $clean !== null ? $clean : $title);
    }
}
