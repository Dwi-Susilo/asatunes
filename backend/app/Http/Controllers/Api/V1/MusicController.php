<?php
namespace App\Http\Controllers\Api\V1;

use App\Exceptions\YtDlpException;
use App\Http\Controllers\Controller;
use App\Http\Requests\SearchMusicRequest;
use App\Http\Requests\StreamMusicRequest;
use App\Models\Song;
use App\Services\YtDlp;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

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

        return response()->json([
            'status' => 'success',
            'data'   => $results,
        ]);
    }

    public function stream(StreamMusicRequest $request, YtDlp $ytDlp): JsonResponse
    {
        $youtubeId = $request->validated('query');
        $cacheKey  = "music:stream:{$youtubeId}";

        $song      = Song::where('youtube_id', $youtubeId)->first();
        $streamUrl = $song ? Cache::get($cacheKey) : null;

        if ($streamUrl === null) {
            try {
                [$song, $streamUrl] = $this->resolve($youtubeId, $song, $ytDlp);
            } catch (YtDlpException) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Lagu tidak dapat diputar saat ini.',
                ], 502);
            }

            Cache::put($cacheKey, $streamUrl, now()->addMinutes(90));
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'song_id'    => $song->id,
                'stream_url' => $streamUrl,
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
}
