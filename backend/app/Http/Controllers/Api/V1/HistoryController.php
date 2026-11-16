<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SongResource;
use App\Models\SongPlay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Riwayat Lagu Diputar (SRS 3.3, keputusan D14): satu baris per putaran yang tercatat
 * di song_plays (30 detik atau lebih, bukan duplicate), terbaru di atas, 20 per halaman.
 */
class HistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = SongPlay::where('user_id', $request->user()->id)
            ->with('song')
            ->latest('played_at')
            ->latest('id')
            ->paginate(20);

        $items = $page->getCollection()->map(
            fn(SongPlay $p) => (new SongResource($p->song))->resolve() + ['played_at' => $p->played_at]
        )->values();

        return response()->json([
            'status' => 'success',
            'data'   => $items,
            'meta'   => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }
}
