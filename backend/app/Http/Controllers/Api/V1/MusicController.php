<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SearchMusicRequest;
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
}
