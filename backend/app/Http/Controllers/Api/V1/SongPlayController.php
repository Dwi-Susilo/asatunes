<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePlayRequest;
use App\Models\Song;
use App\Models\SongPlay;
use App\Support\IpHash;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class SongPlayController extends Controller
{
    private const MIN_LISTEN_SEC = 30;
    private const COOLDOWN_SEC   = 60;

    public function store(StorePlayRequest $request, Song $song): JsonResponse
    {
        // 1. Terlalu singkat: tidak dihitung (dan tidak memakai jatah cooldown)
        if ($request->validated('listened_sec') < self::MIN_LISTEN_SEC) {
            return $this->result(false, 'too_short');
        }

        $user = $request->user();

        // Pengguna dikenali lewat user_id; Pengunjung lewat hash IP (keputusan D9)
        $ipHash = $user ? null : IpHash::of((string) $request->ip());
        $who    = $user ? "{$user->id}" : "ip:{$ipHash}";

        // 2. Cache::add hanya berhasil kalau kuncinya belum ada: satu hitungan per cooldown (keputusan K3)
        $first = Cache::add("play:{$who}:{$song->id}", true, now()->addSeconds(self::COOLDOWN_SEC));

        if (! $first) {
            return $this->result(false, 'duplicate');
        }

        SongPlay::create([
            'user_id'    => $user?->id,
            'ip_address' => $ipHash,
            'song_id'    => $song->id,
            'played_at'  => now(),
        ]);

        return $this->result(true, null, 201);
    }

    private function result(bool $counted, ?string $reason, int $status = 200): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => ['counted' => $counted, 'reason' => $reason],
        ], $status);
    }
}
