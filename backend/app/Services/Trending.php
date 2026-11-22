<?php
namespace App\Services;

use App\Models\Song;
use Carbon\CarbonInterval;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Daftar Trending.
 *
 * Sumber utama: peringkat putar lokal (song_plays, 7 hari terakhir, per pendengar unik).
 * Kalau tidak ada putaran sama sekali, daftar diambil dari YouTube Data API (mostPopular).
 */
class Trending
{
    private const LOCAL   = 'trending:local';   // peringkat lokal, 10 menit
    private const CURRENT = 'trending:current'; // data YouTube, berlaku 7 hari
    private const STALE   = 'trending:stale';   // cadangan YouTube tanpa kedaluwarsa
    private const RETRY   = 'trending:retry';   // batas percobaan ke YouTube: 1 per 10 menit
    private const LIMIT   = 25;
    private const WINDOW  = 7; // hari

    public function get(): array
    {
        $local = Cache::remember(self::LOCAL, now()->addMinutes(10), fn() => $this->build());

        if ($local !== []) {
            return $local;
        }

        return $this->fromYoutube();
    }

    /** Data YouTube; kalau cache habis coba perbarui; kalau gagal pakai cadangan lama; kalau tidak ada, kosong. */
    private function fromYoutube(): array
    {
        $current = Cache::get(self::CURRENT);

        if ($current !== null) {
            return $current;
        }

        // Hanya satu percobaan perbarui per 10 menit; sisanya langsung pakai cadangan
        if (Cache::add(self::RETRY, true, now()->addMinutes(10))) {
            $fresh = $this->refresh();

            if ($fresh !== null) {
                return $fresh;
            }
        }

        return Cache::get(self::STALE) ?? [];
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
                'maxResults'      => self::LIMIT,
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

    /** Peringkat lokal. Kosong kalau tidak ada putaran (yang lolos filter durasi) dalam 7 hari. */
    private function build(): array
    {
        $since = now()->subDays(self::WINDOW);

        // Pendengar unik: user login dihitung per user_id, tamu (user_id kosong) per ip_address
        $ranked = DB::table('song_plays')
            ->select(
                'song_id',
                DB::raw('COUNT(DISTINCT user_id) + COUNT(DISTINCT CASE WHEN user_id IS NULL THEN ip_address END) AS listeners'),
                DB::raw('COUNT(*) AS plays'),
            )
            ->where('played_at', '>=', $since)
            ->groupBy('song_id')
            ->orderByDesc('listeners')
            ->orderByDesc('plays')
            ->limit(self::LIMIT * 2) // ambil lebih, karena sebagian akan terfilter durasi
            ->pluck('song_id');

        return Song::query()
            ->whereIn('id', $ranked)
            ->whereBetween('duration_sec', [60, 600])
            ->get()
            ->sortBy(fn(Song $s) => $ranked->search($s->id))
            ->take(self::LIMIT)
            ->values()
            ->map(fn(Song $s) => [
                'id'           => $s->id,
                'youtube_id'   => $s->youtube_id,
                'title'        => $s->title,
                'artist'       => $s->artist,
                'thumbnail'    => $s->thumbnail,
                'duration_sec' => $s->duration_sec,
            ])
            ->all();
    }
}
