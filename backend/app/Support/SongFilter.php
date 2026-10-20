<?php
namespace App\Support;

class SongFilter
{
    public const MIN_SEC = 60;
    public const MAX_SEC = 600;

    private const BAD_TITLE = '/\b(karaoke|instrumental|backing track|cover|reaction|tutorial|full album|nonstop|non stop|kumpulan|playlist|compilation|slowed|sped up|nightcore|8d|1 hour)\b/iu';

    /** @param array{youtube_id?: string, title?: string, duration_sec?: int|null} $song */
    public static function acceptable(array $song): bool
    {
        $duration = (int) ($song['duration_sec'] ?? 0);

        return ($song['youtube_id'] ?? '') !== ''
        && ($song['title'] ?? '') !== ''
        && $duration >= self::MIN_SEC
        && $duration <= self::MAX_SEC
        && ! preg_match(self::BAD_TITLE, $song['title']);
    }
}
