<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddPlaylistSongRequest;
use App\Http\Requests\ReorderPlaylistSongsRequest;
use App\Models\Playlist;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class PlaylistSongController extends Controller
{
    private const MAX_SONGS = 500;

    public function store(AddPlaylistSongRequest $request, Playlist $playlist): JsonResponse
    {
        Gate::authorize('update', $playlist);

        $songId = (int) $request->validated('song_id');

        $result = DB::transaction(function () use ($playlist, $songId) {
            $this->lock($playlist);

            $rows = DB::table('playlist_song')->where('playlist_id', $playlist->id);

            if ((clone $rows)->where('song_id', $songId)->exists()) {
                return 'duplicate';
            }

            if ((clone $rows)->count() >= self::MAX_SONGS) {
                return 'full';
            }

            DB::table('playlist_song')->insert([
                'playlist_id' => $playlist->id,
                'song_id'     => $songId,
                'position'    => (int) (clone $rows)->max('position') + 1,
                'created_at'  => now(),
            ]);

            $playlist->touch();

            return 'added';
        });

        return match ($result) {
            'added'     => $this->message('Lagu ditambahkan ke playlist.', 201),
            'duplicate' => $this->message('Lagu sudah ada di playlist.'),
            'full'      => $this->message('Playlist sudah penuh (maksimal ' . self::MAX_SONGS . ' lagu).', 422, 'error'),
        };
    }

    public function destroy(Playlist $playlist, Song $song): JsonResponse
    {
        Gate::authorize('update', $playlist);

        $removed = DB::transaction(function () use ($playlist, $song) {
            $this->lock($playlist);

            $deleted = DB::table('playlist_song')
                ->where('playlist_id', $playlist->id)
                ->where('song_id', $song->id)
                ->delete();

            if ($deleted > 0) {
                $this->renumber($playlist->id);
                $playlist->touch();
            }

            return $deleted > 0;
        });

        return $this->message($removed ? 'Lagu dihapus dari playlist.' : 'Lagu tidak ada di playlist.');
    }

    public function reorder(ReorderPlaylistSongsRequest $request, Playlist $playlist): JsonResponse
    {
        Gate::authorize('update', $playlist);

        $ordered = array_map('intval', $request->validated('song_ids'));

        $ok = DB::transaction(function () use ($playlist, $ordered) {
            $this->lock($playlist);

            $current = DB::table('playlist_song')
                ->where('playlist_id', $playlist->id)
                ->pluck('song_id')
                ->map(fn($id) => (int) $id)
                ->all();

            $a = $current;
            $b = $ordered;
            sort($a);
            sort($b);

            // Harus persis lagu-lagu yang ada di playlist: tidak kurang, tidak lebih
            if ($a !== $b) {
                return false;
            }

            foreach ($ordered as $index => $songId) {
                DB::table('playlist_song')
                    ->where('playlist_id', $playlist->id)
                    ->where('song_id', $songId)
                    ->update(['position' => $index + 1]);
            }

            $playlist->touch();

            return true;
        });

        if (! $ok) {
            return $this->message(
                'Daftar lagu tidak cocok dengan isi playlist. Muat ulang playlist lalu coba lagi.',
                422,
                'error',
            );
        }

        return $this->message('Urutan playlist diperbarui.');
    }

    /** Kunci baris playlist sampai transaksi selesai, agar perubahan bersamaan antre. */
    private function lock(Playlist $playlist): void
    {
        Playlist::whereKey($playlist->id)->lockForUpdate()->first();
    }

    /** Nomori ulang 1..n sesuai urutan sekarang. */
    private function renumber(int $playlistId): void
    {
        $songIds = DB::table('playlist_song')
            ->where('playlist_id', $playlistId)
            ->orderBy('position')
            ->orderBy('id')
            ->pluck('song_id');

        foreach ($songIds->values() as $index => $songId) {
            DB::table('playlist_song')
                ->where('playlist_id', $playlistId)
                ->where('song_id', $songId)
                ->update(['position' => $index + 1]);
        }
    }

    private function message(string $text, int $status = 200, string $type = 'success'): JsonResponse
    {
        return response()->json(['status' => $type, 'message' => $text], $status);
    }
}
