<?php
namespace App\Services;

use Carbon\CarbonInterval;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Trending
{
    private const CURRENT = 'trending:current'; // berlaku 7 hari
    private const STALE   = 'trending:stale';   // cadangan tanpa kedaluwarsa

    /** Data terbaru; kalau cache habis, coba perbarui; kalau gagal, pakai cadangan lama. */
    public function get(): ?array
    {
        return Cache::get(self::CURRENT) ?? $this->refresh() ?? Cache::get(self::STALE);
    }

    /** Ambil dari YouTube dan simpan ke cache. Mengembalikan null kalau gagal. */
    public function refresh(): ?array
    {
        $key = config('services.youtube.key');

        if (! $key) {
            Log::error('trending: YOUTUBE_API_KEY belum diisi');
            return null;
        }

        try {
            $response = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/videos', [
                'part'            => 'snippet,contentDetails',
                'chart'           => 'mostPopular',
                'videoCategoryId' => '10', // kategori Music
                'regionCode'      => config('services.youtube.region'),
                'maxResults'      => 25,
                'key'             => $key,
            ]);
        } catch (\Throwable $e) {
            // Sengaja hanya mencatat nama kelasnya: pesan exception bisa memuat URL beserta API key
            Log::warning('trending: gagal menghubungi YouTube', ['error' => $e::class]);
            return null;
        }

        if ($response->failed()) {
            Log::warning('trending: YouTube API menolak', ['status' => $response->status()]);
            return null;
        }

        $items = collect($response->json('items', []))
            ->map(fn(array $v) => [
                'youtube_id'   => $v['id'],
                'title'        => $v['snippet']['title'],
                'artist'       => YtDlp::cleanArtist($v['snippet']['channelTitle'] ?? ''),
                'thumbnail'    => YtDlp::thumbnailFor($v['id']),
                'duration_sec' => $this->seconds($v['contentDetails']['duration'] ?? ''),
            ])
            ->filter(fn(array $s) => $s['duration_sec'] >= 60 && $s['duration_sec'] <= 600)
            ->values()
            ->all();

        if ($items === []) {
            Log::warning('trending: YouTube mengembalikan daftar kosong');
            return null;
        }

        Cache::put(self::CURRENT, $items, now()->addDays(7));
        Cache::forever(self::STALE, $items);

        return $items;
    }

    private function seconds(string $iso): int
    {
        try {
            return (int) CarbonInterval::instance(new \DateInterval($iso))->totalSeconds;
        } catch (\Throwable) {
            return 0;
        }
    }

}
