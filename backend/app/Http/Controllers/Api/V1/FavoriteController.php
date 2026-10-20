<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SongResource;
use App\Models\Favorite;
use App\Models\Song;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = Favorite::where('user_id', $request->user()->id)
            ->with('song')
            ->latest('created_at')
            ->latest('id')
            ->paginate(20);

        $items = $page->getCollection()->map(
            fn(Favorite $f) => (new SongResource($f->song))->resolve() + ['favorited_at' => $f->created_at]
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

    public function store(Request $request, Song $song): JsonResponse
    {
        try {
            $favorite = Favorite::firstOrCreate([
                'user_id' => $request->user()->id,
                'song_id' => $song->id,
            ]);
        } catch (UniqueConstraintViolationException) {
            $favorite = null; // request lain baru saja membuatnya
        }

        $created = $favorite?->wasRecentlyCreated ?? false;

        return response()->json([
            'status'  => 'success',
            'message' => $created ? 'Ditambahkan ke favorit.' : 'Lagu sudah ada di favorit.',
        ], $created ? 201 : 200);
    }

    public function destroy(Request $request, Song $song): JsonResponse
    {
        $deleted = Favorite::where('user_id', $request->user()->id)
            ->where('song_id', $song->id)
            ->delete();

        return response()->json([
            'status'  => 'success',
            'message' => $deleted ? 'Dihapus dari favorit.' : 'Lagu tidak ada di favorit.',
        ]);
    }
}
