<?php
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Playlist;
use App\Models\Song;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class StatsController extends Controller
{
    public function index(): JsonResponse
    {
        $data = Cache::remember('admin:stats', now()->addMinutes(10), function () {
            return [
                'total_users'     => User::count(),
                'total_playlists' => Playlist::count(),
                'top_songs'       => Song::query()
                    ->has('plays')
                    ->withCount('plays')
                    ->orderByDesc('plays_count')
                    ->limit(10)
                    ->get()
                    ->toArray(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data'   => $data,
        ]);
    }
}
