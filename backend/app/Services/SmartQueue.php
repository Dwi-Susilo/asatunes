<?php
namespace App\Services;

use App\Exceptions\YtDlpException;
use App\Models\Song;
use Illuminate\Support\Facades\Cache;

class SmartQueue
{
    private const MIN_BEFORE_TRENDING = 3;
    private const BAD_TITLE           = '/\b(karaoke|instrumental|backing track|cover|reaction|tutorial|full album|nonstop|non stop|kumpulan|playlist|compilation|slowed|sped up|nightcore|8d|1 hour)\b/iu';

    public function __construct(
        private YtDlp $ytDlp,
        private Trending $trending,
    ) {
    }

    public function for(Song $seed, int $limit = 10): array
    {
        $key = "queue:{$seed->youtube_id}:{$limit}";
        $hit = Cache::get($key);

        if ($hit !== null) {
            return $hit;
        }

        $degraded = false;
        $queue    = $this->build($seed, $limit, $degraded);

        // Jangan simpan hasil yang pincang karena yt-dlp sedang bermasalah
        if (! $degraded && $queue !== []) {
            Cache::put($key, $queue, now()->addHours(12));
        }

        return $queue;
    }

    private function build(Song $seed, int $limit, bool &$degraded): array
    {
        $seenIds    = [$seed->youtube_id => true];
        $seenTitles = [$this->norm($seed->title, $seed->artist) => true];

        $candidates = array_merge($this->local($seed), $this->remote($seed, $degraded));

        // usort stabil di PHP 8: urutan asal dipertahankan untuk skor yang sama
        usort($candidates, fn(array $a, array $b) => $b['score'] <=> $a['score']);

        $queue = $this->pick($candidates, $seenIds, $seenTitles, $limit);

        if (count($queue) < self::MIN_BEFORE_TRENDING) {
            $fallback = [];

            foreach ($this->trending->get() ?? [] as $t) {
                $fallback[] = $t + ['source' => 'trending', 'score' => 0];
            }

            $queue = array_merge(
                $queue,
                $this->pick($fallback, $seenIds, $seenTitles, $limit - count($queue)),
            );
        }

        return $queue;
    }

    /** Lagu di database kita yang satu album / satu artis. */
    private function local(Song $seed): array
    {
        $knownArtist = $this->knownArtist($seed);

        if (! $knownArtist && ! $seed->album) {
            return [];
        }

        $rows = Song::where('id', '!=', $seed->id)
            ->where(function ($q) use ($seed, $knownArtist) {
                if ($knownArtist) {
                    $q->where('artist', $seed->artist);
                }
                if ($seed->album) {
                    $q->orWhere('album', $seed->album);
                }
            })
            ->limit(50)
            ->get();

        return $rows->map(function (Song $s) use ($seed, $knownArtist) {
            $sameAlbum  = $seed->album && $s->album === $seed->album;
            $sameArtist = $knownArtist && $this->sameArtist($s->artist, $seed->artist);

            return [
                'youtube_id'   => $s->youtube_id,
                'title'        => $s->title,
                'artist'       => $s->artist,
                'thumbnail'    => YtDlp::thumbnailFor($s->youtube_id),
                'duration_sec' => (int) $s->duration_sec,
                'source'       => $sameAlbum ? 'album' : 'artist',
                'score'        => ($sameAlbum ? 3 : 0) + ($sameArtist ? 2 : 0) + 1,
            ];
        })->all();
    }

    /** Hasil pencarian YouTube, hanya yang artisnya sama. */
    private function remote(Song $seed, bool &$degraded): array
    {
        if (! $this->knownArtist($seed)) {
            return [];
        }

        $queries = [$seed->artist];

        if ($seed->album) {
            array_unshift($queries, "{$seed->artist} {$seed->album}");
        }

        $out = [];

        foreach ($queries as $query) {
            try {
                $results = $this->ytDlp->search($query);
            } catch (YtDlpException) {
                $degraded = true;
                continue;
            }

            foreach ($results as $r) {
                if (empty($r['youtube_id']) || ! $this->sameArtist($r['artist'] ?? '', $seed->artist)) {
                    continue;
                }

                $out[] = [
                    'youtube_id'   => $r['youtube_id'],
                    'title'        => $r['title'] ?? '',
                    'artist'       => $r['artist'] ?? $seed->artist,
                    'thumbnail'    => $r['thumbnail'] ?? YtDlp::thumbnailFor($r['youtube_id']),
                    'duration_sec' => (int) ($r['duration_sec'] ?? 0),
                    'source'       => 'artist',
                    'score'        => 2,
                ];
            }
        }

        return $out;
    }

    /** Terapkan filter + anti-duplikat, ambil paling banyak $max lagu. */
    private function pick(array $candidates, array &$seenIds, array &$seenTitles, int $max): array
    {
        $out = [];

        foreach ($candidates as $c) {
            if (count($out) >= $max) {
                break;
            }

            if (! $this->acceptable($c)) {
                continue;
            }

            $norm = $this->norm($c['title'], $c['artist']);

            if (isset($seenIds[$c['youtube_id']]) || isset($seenTitles[$norm])) {
                continue;
            }

            $seenIds[$c['youtube_id']] = true;
            $seenTitles[$norm]         = true;

            unset($c['score']);
            $out[] = $c;
        }

        return $out;
    }

    private function acceptable(array $c): bool
    {
        $d = (int) ($c['duration_sec'] ?? 0);

        return $c['youtube_id'] !== ''
        && $c['title'] !== ''
        && $d >= 60 && $d <= 600
        && ! preg_match(self::BAD_TITLE, $c['title']);
    }

    /** Judul tanpa hiasan, untuk membandingkan "lagu yang sama". */
    private function norm(string $title, string $artist): string
    {
        $t = mb_strtolower($title);
        $t = preg_replace('/[\(\[][^\)\]]*[\)\]]/u', ' ', $t) ?? $t;

        $a = trim(mb_strtolower(YtDlp::cleanArtist($artist)));
        if ($a !== '') {
            $t = preg_replace('/\b' . preg_quote($a, '/') . '\b/u', ' ', $t) ?? $t;
        }

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
