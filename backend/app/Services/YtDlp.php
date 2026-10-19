<?php
namespace App\Services;

use App\Exceptions\YtDlpException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class YtDlp
{
    /**
     * Cari lagu. Mengembalikan daftar item siap kirim ke klien.
     */
    public function search(string $query, int $limit = 10): array
    {
        $output = $this->run([
            '--flat-playlist',
            '--dump-json',
            "ytsearch{$limit}:{$query}",
        ]);

        $results = [];

        foreach (preg_split('/\R/', trim($output)) as $line) {
            $item = json_decode($line, true);

            if (! is_array($item) || empty($item['id'])) {
                continue;
            }

            $results[] = [
                'youtube_id'   => $item['id'],
                'title'        => $item['title'] ?? '',
                'artist'       => self::cleanArtist($item['channel'] ?? $item['uploader'] ?? ''),
                'thumbnail'    => self::thumbnailFor($item['id']),
                'duration_sec' => isset($item['duration']) ? (int) $item['duration'] : null,
            ];
        }

        return $results;
    }

    /**
     * Bersihkan akhiran seperti " - Topic", "VEVO", "Official" dari nama channel.
     */
    public static function cleanArtist(string $name): string
    {
        $name = preg_replace('/\s*-\s*Topic$/i', '', $name) ?? $name;
        $name = preg_replace('/\s*(VEVO|Official)$/i', '', $name) ?? $name;

        return trim($name);
    }

    public static function thumbnailFor(string $youtubeId): string
    {
        return "https://i.ytimg.com/vi/{$youtubeId}/hqdefault.jpg";
    }

    /**
     * Jalankan yt-dlp. Argumen dikirim sebagai daftar terpisah, bukan satu teks
     * yang ditafsirkan shell. Detail error hanya ke log, tidak ke klien.
     */
    private function run(array $args): string
    {
        try {
            $result = Process::timeout(config('ytdlp.timeout'))->run([
                config('ytdlp.binary'),
                '--js-runtimes', config('ytdlp.js_runtime'),
                ...$args,
            ]);
        } catch (\Throwable $e) {
            Log::error('yt-dlp tidak dapat dijalankan', ['error' => $e->getMessage()]);

            throw new YtDlpException('yt-dlp tidak dapat dijalankan', 0, $e);
        }

        if ($result->failed()) {
            Log::error('yt-dlp gagal', [
                'exit'   => $result->exitCode(),
                'stderr' => $result->errorOutput(),
            ]);

            throw new YtDlpException('yt-dlp gagal dengan kode ' . $result->exitCode());
        }

        return $result->output();
    }
}
