<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SavePlaylistRequest;
use App\Http\Resources\PlaylistResource;
use App\Http\Resources\SongResource;
use App\Models\Playlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PlaylistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = Playlist::where('user_id', $request->user()->id)
            ->withCount('songs')
            ->with(['songs' => fn($q) => $q->limit(4)]) // cukup 4 untuk sampul, tanpa N+1
            ->latest('id')
            ->paginate(50);

        return response()->json([
            'status' => 'success',
            'data'   => PlaylistResource::collection($page->getCollection())->resolve(),
            'meta'   => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }

    public function store(SavePlaylistRequest $request): JsonResponse
    {
        $playlist = $request->user()->playlists()->create($request->validated());
        $playlist->loadCount('songs')->load('songs');

        return response()->json([
            'status' => 'success',
            'data'   => (new PlaylistResource($playlist))->resolve(),
        ], 201);
    }

    public function show(Playlist $playlist): JsonResponse
    {
        Gate::authorize('view', $playlist);

        $playlist->loadCount('songs')->load('songs');

        return response()->json([
            'status' => 'success',
            'data'   => (new PlaylistResource($playlist))->resolve()
             + ['songs' => SongResource::collection($playlist->songs)->resolve()],
        ]);
    }

    public function update(SavePlaylistRequest $request, Playlist $playlist): JsonResponse
    {
        Gate::authorize('update', $playlist);

        $playlist->update($request->validated());
        $playlist->loadCount('songs')->load(['songs' => fn($q) => $q->limit(4)]);

        return response()->json([
            'status' => 'success',
            'data'   => (new PlaylistResource($playlist))->resolve(),
        ]);
    }

    public function destroy(Playlist $playlist): JsonResponse
    {
        Gate::authorize('delete', $playlist);

        $playlist->delete();

        return response()->json(['status' => 'success', 'message' => 'Playlist dihapus.']);
    }
}
