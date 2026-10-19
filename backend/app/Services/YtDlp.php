<?php
namespace App\Services;

use App\Exceptions\YtDlpException;
use Illuminate\Support\Facades\Cache;
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
     * Ekstrak satu video: metadata lagu + URL stream audio.
     */
    public function extract(string $youtubeId): array
    {
        $info = $this->fetchInfo("https://www.youtube.com/watch?v={$youtubeId}");

        return [
            'metadata'   => $this->metadata($youtubeId, $info),
            'stream_url' => $info['url'],
        ];
    }

    /**
     * Cadangan: cari lewat teks (artis + judul), lalu ambil URL audio hasil pertama.
     */
    public function extractFromSearch(string $text): string
    {
        return $this->fetchInfo("ytsearch1:{$text}")['url'];
    }

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

    private function metadata(string $youtubeId, array $info): array
    {
        $artist = self::cleanArtist($info['artist'] ?? $info['channel'] ?? $info['uploader'] ?? '');

        return [
            'title'        => $info['track'] ?? $info['title'] ?? '',
            'artist'       => $artist !== '' ? $artist : 'Unknown',
            'album'        => $info['album'] ?? null,
            'thumbnail'    => self::thumbnailFor($youtubeId),
            'duration_sec' => isset($info['duration']) ? (int) $info['duration'] : null,
        ];
    }

    private function fetchInfo(string $target): array
    {
        $output = $this->run(['-j', '-f', 'ba/ba*', '--no-playlist', $target]);

        $info = json_decode(strtok(trim($output), "\n"), true);

        if (! is_array($info) || empty($info['url'])) {
            throw new YtDlpException('Respons yt-dlp tidak berisi URL audio');
        }

        return $info;
    }

    /**
     * Jalankan yt-dlp. Argumen dikirim sebagai daftar terpisah, bukan satu teks
     * yang ditafsirkan shell. Detail error hanya ke log, tidak ke klien.
     */
    private function run(array $args): string
    {
        return $this->withSlot(function () use ($args) {
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
        });
    }

    /**
     * Batasi jumlah proses yt-dlp yang berjalan bersamaan (SRS 4.6).
     * Ada N "slot" berupa kunci cache; tunggu slot kosong maksimal 10 detik.
     */
    private function withSlot(callable $callback): mixed
    {
        $slots    = max(1, (int) config('ytdlp.max_concurrent'));
        $ttl      = (int) config('ytdlp.timeout') + 10;
        $deadline = microtime(true) + 10;

        do {
            for ($i = 0; $i < $slots; $i++) {
                $lock = Cache::lock("ytdlp:slot:{$i}", $ttl);

                if ($lock->get()) {
                    try {
                        return $callback();
                    } finally {
                        $lock->release();
                    }
                }
            }

            usleep(200_000);
        } while (microtime(true) < $deadline);

        throw new YtDlpException('Semua slot yt-dlp sedang dipakai');
    }
}
