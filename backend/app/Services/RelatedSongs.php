<?php
namespace App\Services;

use App\Exceptions\YtDlpException;
use App\Models\Song;
use App\Support\SongFilter;
use Illuminate\Support\Facades\Cache;

/**
 * Tab "Terkait" (keputusan pemilik, 21 Nov 2026): lagu dari artis LAIN, bersumber dari internet
 * (pencarian YouTube lewat yt-dlp dan Trending), berbeda dari antrean "Berikutnya" (SmartQueue,
 * yang hanya berisi artis atau album yang sama). Urutan diacak pada setiap permintaan.
 */
class RelatedSongs
{
    /** Target jumlah minimal; bila sumber tidak cukup, yang ada dikembalikan apa adanya. */
    public const MIN_RESULTS = 15;

    public function __construct(
        private YtDlp $ytDlp,
        private Trending $trending,
    ) {
    }

    public function for(Song $seed, int $limit = 20): array
    {
        $key  = "related:{$seed->youtube_id}";
        $pool = Cache::get($key);

        if ($pool === null) {
            $degraded = false;
            $pool     = $this->build($seed, $degraded);

            // Kumpulan lagu di-cache; urutan acak dibuat per permintaan di bawah.
            if (! $degraded && count($pool) >= self::MIN_RESULTS) {
                Cache::put($key, $pool, now()->addHours(12));
            }
        }

        shuffle($pool);

        return array_slice($pool, 0, $limit);
    }

    private function build(Song $seed, bool &$degraded): array
    {
        $seenIds    = [$seed->youtube_id => true];
        $seenTitles = [$this->norm($seed->title) => true];
        $out        = [];

        $candidates = array_merge($this->search($seed, $degraded), $this->fromTrending());

        foreach ($candidates as $c) {
            if (! SongFilter::acceptable($c)) {
                continue;
            }

            // Artis yang sama sudah dilayani "Berikutnya"; tab ini sengaja memuat artis lain.
            if ($this->knownArtist($seed) && $this->sameArtist($c['artist'] ?? '', $seed->artist)) {
                continue;
            }

            $norm = $this->norm($c['title']);

            if (isset($seenIds[$c['youtube_id']]) || isset($seenTitles[$norm])) {
                continue;
            }

            $seenIds[$c['youtube_id']] = true;
            $seenTitles[$norm]         = true;
            $out[]                     = $c;
        }

        return $out;
    }

    /** Pencarian YouTube yang diarahkan ke artis lain. */
    private function search(Song $seed, bool &$degraded): array
    {
        $name = $this->knownArtist($seed) ? YtDlp::cleanArtist($seed->artist) : $seed->title;

        $out = [];

        foreach (["lagu mirip {$name}", "{$name} similar artists songs"] as $query) {
            try {
                $results = $this->ytDlp->search($query, 20);
            } catch (YtDlpException) {
                $degraded = true;
                continue;
            }

            foreach ($results as $r) {
                if (empty($r['youtube_id'])) {
                    continue;
                }

                $out[] = [
                    'youtube_id'   => $r['youtube_id'],
                    'title'        => $r['title'] ?? '',
                    'artist'       => $r['artist'] ?? '',
                    'thumbnail'    => $r['thumbnail'] ?? YtDlp::thumbnailFor($r['youtube_id']),
                    'duration_sec' => (int) ($r['duration_sec'] ?? 0),
                    'source'       => 'related',
                ];
            }
        }

        return $out;
    }

    private function fromTrending(): array
    {
        $out = [];

        foreach ($this->trending->get() ?? [] as $t) {
            $out[] = [
                'youtube_id'   => $t['youtube_id'] ?? '',
                'title'        => $t['title'] ?? '',
                'artist'       => $t['artist'] ?? '',
                'thumbnail'    => $t['thumbnail'] ?? YtDlp::thumbnailFor($t['youtube_id'] ?? ''),
                'duration_sec' => (int) ($t['duration_sec'] ?? 0),
                'source'       => 'trending',
            ];
        }

        return $out;
    }

    /** Judul tanpa hiasan, untuk membuang "lagu yang sama". */
    private function norm(string $title): string
    {
        $t = mb_strtolower($title);
        $t = preg_replace('/[\(\[][^\)\]]*[\)\]]/u', ' ', $t) ?? $t;
        $t = preg_replace('/\b(official|video|audio|music|lyrics?|lirik|mv|hd|live)\b/u', ' ', $t) ?? $t;
        $t = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $t) ?? $t;
        $t = trim(preg_replace('/\s+/', ' ', $t) ?? $t);

        return $t !== '' ? $t : mb_strtolower($title);
    }

    private function sameArtist(string $a, string $b): bool
    {
        $a = mb_strtolower(trim(YtDlp::cleanArtist($a)));
        $b = mb_strtolower(trim(YtDlp::cleanArtist($b)));

        return $a !== '' && $b !== '' && ($a === $b || str_contains($a, $b) || str_contains($b, $a));
    }

    private function knownArtist(Song $seed): bool
    {
        return $seed->artist !== '' && mb_strtolower($seed->artist) !== 'unknown';
    }
}
