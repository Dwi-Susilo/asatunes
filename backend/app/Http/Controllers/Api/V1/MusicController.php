<?php
namespace App\Http\Controllers\Api\V1;

use App\Exceptions\YtDlpException;
use App\Http\Controllers\Controller;
use App\Http\Requests\LyricsRequest;
use App\Http\Requests\SearchMusicRequest;
use App\Http\Requests\StreamMusicRequest;
use App\Models\Song;
use App\Models\User;
use App\Services\Lyrics;
use App\Services\SmartQueue;
use App\Services\Trending;
use App\Services\YtDlp;
use App\Support\GoogleVideoUrl;
use App\Support\SongFilter;
use GuzzleHttp\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MusicController extends Controller
{
    public function search(SearchMusicRequest $request, YtDlp $ytDlp): JsonResponse
    {
        $query = mb_strtolower(preg_replace('/\s+/', ' ', trim($request->validated('q'))));
        $key   = 'music:search:' . md5($query);

        $results = Cache::get($key);

        if ($results === null) {
            $results = $ytDlp->search($query);

            // Hasil kosong tidak disimpan (SRS bagian 7.3)
            if ($results !== []) {
                Cache::put($key, $results, now()->addHour());
            }
        }

        $results = array_values(array_filter($results, [SongFilter::class, 'acceptable']));

        return response()->json([
            'status' => 'success',
            'data'   => $results,
        ]);
    }

    public function stream(StreamMusicRequest $request, YtDlp $ytDlp): JsonResponse
    {
        $youtubeId = $request->validated('query');
        $key       = $this->streamCacheKey($youtubeId);

        $song      = Song::where('youtube_id', $youtubeId)->first();
        $streamUrl = $song ? Cache::get($key) : null;

        if ($streamUrl === null) {
            try {
                [$song, $streamUrl] = $this->resolve($youtubeId, $song, $ytDlp);
            } catch (YtDlpException) {
                return $this->playbackError();
            }

            Cache::put($key, $streamUrl, now()->addMinutes(90));
        }

        $expires = now()->addHours(3);

        // URL di server kita sendiri, ditandatangani dan terikat ke pengguna ini
        $playUrl = URL::temporarySignedRoute('music.audio', $expires, [
            'song' => $song->id,
            'u'    => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'song_id'    => $song->id,
                'play_url'   => $playUrl,
                'expires_at' => $expires->toIso8601String(),
            ],
        ]);
    }

    /**
     * Ekstrak lagu dan simpan (upsert). Jika gagal dan lagunya sudah dikenal,
     * coba ulang sekali lewat pencarian "{artis} {judul}" (SRS bagian 2.C).
     */
    private function resolve(string $youtubeId, ?Song $known, YtDlp $ytDlp): array
    {
        try {
            $info = $ytDlp->extract($youtubeId);
            $song = Song::updateOrCreate(['youtube_id' => $youtubeId], $info['metadata']);

            return [$song, $info['stream_url']];
        } catch (YtDlpException $e) {
            if (! $known) {
                throw $e;
            }

            return [$known, $ytDlp->extractFromSearch("{$known->artist} {$known->title}")];
        }
    }

    // public function proxyAudio(ProxyAudioRequest $request): JsonResponse | StreamedResponse
    // {
    //     $url = $request->validated('url');

    //     // Teruskan hanya header Range yang bentuknya wajar, misalnya "bytes=0-1023"
    //     $headers = [];
    //     $range   = $request->header('Range');

    //     if (is_string($range) && preg_match('/^bytes=\d*-\d*$/', $range)) {
    //         $headers['Range'] = $range;
    //     }

    //     try {
    //         $upstream = (new Client())->request('GET', $url, [
    //             'headers'         => $headers,
    //             'stream'          => true,
    //             'decode_content'  => false,
    //             'http_errors'     => false,
    //             'connect_timeout' => 10,
    //             'timeout'         => 30,
    //             'allow_redirects' => [
    //                 'max'         => 3,
    //                 'protocols'   => ['https'],
    //                 // Setiap pengalihan juga harus tetap ke *.googlevideo.com
    //                 'on_redirect' => function ($request, $response, $uri) {
    //                     if (! GoogleVideoUrl::isValid((string) $uri)) {
    //                         throw new \RuntimeException('Pengalihan ke host yang tidak diizinkan');
    //                     }
    //                 },
    //             ],
    //         ]);
    //     } catch (\Throwable $e) {
    //         Log::warning('proxy-audio gagal', ['error' => $e->getMessage()]);

    //         return $this->playbackError();
    //     }

    //     $status = $upstream->getStatusCode();

    //     if (! in_array($status, [200, 206, 416], true)) {
    //         Log::warning('proxy-audio: status tidak terduga dari sumber', ['status' => $status]);

    //         return $this->playbackError();
    //     }

    //     $responseHeaders = array_filter([
    //         'Content-Type'           => $upstream->getHeaderLine('Content-Type') ?: 'application/octet-stream',
    //         'Content-Length'         => $upstream->getHeaderLine('Content-Length'),
    //         'Content-Range'          => $upstream->getHeaderLine('Content-Range'),
    //         'Accept-Ranges'          => 'bytes',
    //         'Cache-Control'          => 'private',
    //         'X-Content-Type-Options' => 'nosniff',
    //     ]);

    //     $body = $upstream->getBody();

    //     return response()->stream(function () use ($body) {
    //         while (! $body->eof()) {
    //             echo $body->read(8192);

    //             if (ob_get_level() > 0) {
    //                 ob_flush();
    //             }
    //             flush();

    //             if (connection_aborted()) {
    //                 break;
    //             }
    //         }

    //         $body->close();
    //     }, $status, $responseHeaders);
    // }

    private function playbackError(): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => 'Lagu tidak dapat diputar saat ini.',
        ], 502);
    }

    /** Dipanggil lewat URL bertanda tangan (tanpa token Bearer). */
    public function audio(Request $request, Song $song, YtDlp $ytDlp): JsonResponse | StreamedResponse
    {
        // Pemilik URL (ikut ditandatangani, tidak bisa diubah) harus masih ada dan tidak diblokir
        $owner = User::find((int) $request->query('u'));

        if (! $owner || $owner->isBlocked()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Anda tidak memiliki akses ke sumber daya ini.',
            ], 403);
        }

        $key = $this->streamCacheKey($song->youtube_id);

        // Percobaan 1 memakai cache; kalau sumber menolak (URL kedaluwarsa), ambil yang baru sekali lagi
        foreach ([1, 2] as $attempt) {
            $streamUrl = $attempt === 1 ? Cache::get($key) : null;

            if ($streamUrl === null) {
                try {
                    [, $streamUrl] = $this->resolve($song->youtube_id, $song, $ytDlp);
                } catch (YtDlpException) {
                    return $this->playbackError();
                }

                Cache::put($key, $streamUrl, now()->addMinutes(90));
            }

            try {
                return $this->relay($request, $streamUrl);
            } catch (\RuntimeException $e) {
                Cache::forget($key);
                Log::warning('audio: sumber menolak', [
                    'song'    => $song->id,
                    'attempt' => $attempt,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        return $this->playbackError();
    }

/** Teruskan audio dari sumber ke klien, lengkap dengan dukungan Range. */
    private function relay(Request $request, string $url): StreamedResponse
    {
        // Pengaman berlapis: sumber harus tetap https://*.googlevideo.com
        if (! GoogleVideoUrl::isValid($url)) {
            throw new \RuntimeException('URL sumber tidak valid');
        }

        $headers = [];
        $range   = $request->header('Range');

        if (is_string($range) && preg_match('/^bytes=\d*-\d*$/', $range)) {
            $headers['Range'] = $range;
        }

        try {
            $upstream = (new Client())->request('GET', $url, [
                'headers'         => $headers,
                'stream'          => true,
                'decode_content'  => false,
                'http_errors'     => false,
                'connect_timeout' => 10,
                'timeout'         => 30,
                'allow_redirects' => [
                    'max'         => 3,
                    'protocols'   => ['https'],
                    'on_redirect' => function ($request, $response, $uri) {
                        if (! GoogleVideoUrl::isValid((string) $uri)) {
                            throw new \RuntimeException('Pengalihan ke host yang tidak diizinkan');
                        }
                    },
                ],
            ]);
        } catch (\Throwable $e) {
            // Sengaja hanya nama kelas: pesan exception Guzzle memuat URL sumber
            throw new \RuntimeException('koneksi ke sumber gagal: ' . $e::class);
        }

        $status = $upstream->getStatusCode();

        if (! in_array($status, [200, 206, 416], true)) {
            throw new \RuntimeException("status sumber {$status}");
        }

        $responseHeaders = array_filter([
            'Content-Type'           => $upstream->getHeaderLine('Content-Type') ?: 'application/octet-stream',
            'Content-Length'         => $upstream->getHeaderLine('Content-Length'),
            'Content-Range'          => $upstream->getHeaderLine('Content-Range'),
            'Accept-Ranges'          => 'bytes',
            'Cache-Control'          => 'private',
            'X-Content-Type-Options' => 'nosniff',
        ]);

        $body = $upstream->getBody();

        return response()->stream(function () use ($body) {
            while (! $body->eof()) {
                echo $body->read(8192);

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();

                if (connection_aborted()) {
                    break;
                }
            }

            $body->close();
        }, $status, $responseHeaders);
    }

    private function streamCacheKey(string $youtubeId): string
    {
        return "stream:{$youtubeId}";
    }

    public function trending(Trending $trending): JsonResponse
    {
        $songs = $trending->get();

        if ($songs === null) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data trending belum tersedia.',
            ], 503);
        }

        return response()->json(['status' => 'success', 'data' => $songs]);
    }

    public function lyrics(LyricsRequest $request, Lyrics $lyrics): JsonResponse
    {
        try {
            $result = $lyrics->find(
                $request->validated('title'),
                $request->validated('artist'),
                $request->validated('duration'),
            );
        } catch (\RuntimeException $e) {
            Log::warning('lyrics: LRCLIB bermasalah', ['error' => $e->getMessage()]);

            return response()->json([
                'status'  => 'error',
                'message' => 'Layanan lirik sedang tidak tersedia.',
            ], 502);
        }

        if ($result === null) {
            return response()->json(['status' => 'error', 'message' => 'Lirik tidak ditemukan.'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $result]);
    }

    public function recommendations(Request $request, string $youtubeId, SmartQueue $queue): JsonResponse
    {
        $seed = Song::where('youtube_id', $youtubeId)->first();

        if (! $seed) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lagu belum dikenal. Putar lagu ini terlebih dahulu.',
            ], 404);
        }

        $limit = max(1, min(20, (int) $request->query('limit', 10)));

        return response()->json(['status' => 'success', 'data' => $queue->for($seed, $limit)]);
    }
}
