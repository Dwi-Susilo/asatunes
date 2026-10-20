<?php
namespace Tests\Feature;

use App\Models\Playlist;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlaylistTest extends TestCase
{
    use RefreshDatabase;

    /** Buat playlist milik $user berisi $songCount lagu, berurutan 1..n. */
    private function playlistFor(User $user, int $songCount = 0): Playlist
    {
        $playlist = Playlist::create(['user_id' => $user->id, 'title' => 'Uji']);

        foreach (Song::factory()->count($songCount)->create() as $i => $song) {
            DB::table('playlist_song')->insert([
                'playlist_id' => $playlist->id,
                'song_id'     => $song->id,
                'position'    => $i + 1,
                'created_at'  => now(),
            ]);
        }

        return $playlist;
    }

    /** Id lagu dalam playlist, urut sesuai posisi. */
    private function orderOf(Playlist $playlist): array
    {
        return DB::table('playlist_song')->where('playlist_id', $playlist->id)
            ->orderBy('position')->pluck('song_id')->map(fn($id) => (int) $id)->all();
    }

    public function test_user_can_create_a_playlist(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/playlists', ['title' => 'Santai'])->assertCreated();

        $this->assertDatabaseHas('playlists', ['title' => 'Santai', 'user_id' => $user->id]);
    }

    public function test_title_is_required(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/playlists', [])->assertUnprocessable()->assertJsonValidationErrors(['title']);
    }

    public function test_list_contains_only_own_playlists_with_cover_limit(): void
    {
        $me    = User::factory()->create();
        $other = User::factory()->create();
        $this->playlistFor($me, 5);
        $this->playlistFor($other, 1);
        Sanctum::actingAs($me);

        $this->getJson('/api/v1/playlists')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.songs_count', 5)
            ->assertJsonCount(4, 'data.0.cover_thumbnails');
    }

    public function test_other_users_cannot_touch_a_playlist(): void
    {
        $owner    = User::factory()->create();
        $playlist = $this->playlistFor($owner, 2);
        $ids      = $this->orderOf($playlist);
        $url      = "/api/v1/playlists/{$playlist->id}";

        Sanctum::actingAs(User::factory()->create());

        $this->getJson($url)->assertForbidden();
        $this->patchJson($url, ['title' => 'Dibajak'])->assertForbidden();
        $this->postJson("{$url}/songs", ['song_id' => Song::factory()->create()->id])->assertForbidden();
        $this->putJson("{$url}/songs/order", ['song_ids' => array_reverse($ids)])->assertForbidden();
        $this->deleteJson("{$url}/songs/{$ids[0]}")->assertForbidden();
        $this->deleteJson($url)->assertForbidden();

        // Tidak ada yang berubah
        $this->assertDatabaseHas('playlists', ['id' => $playlist->id, 'title' => 'Uji']);
        $this->assertSame($ids, $this->orderOf($playlist));
    }

    public function test_adding_songs_appends_and_ignores_duplicates(): void
    {
        $user     = User::factory()->create();
        $playlist = $this->playlistFor($user);
        [$a, $b]  = Song::factory()->count(2)->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/v1/playlists/{$playlist->id}/songs", ['song_id' => $a->id])->assertCreated();
        $this->postJson("/api/v1/playlists/{$playlist->id}/songs", ['song_id' => $b->id])->assertCreated();
        $this->postJson("/api/v1/playlists/{$playlist->id}/songs", ['song_id' => $a->id])->assertOk();

        $this->assertSame([$a->id, $b->id], $this->orderOf($playlist));
    }

    public function test_reorder_applies_a_valid_order(): void
    {
        $user     = User::factory()->create();
        $playlist = $this->playlistFor($user, 3);
        $reversed = array_reverse($this->orderOf($playlist));
        Sanctum::actingAs($user);

        $this->putJson("/api/v1/playlists/{$playlist->id}/songs/order", ['song_ids' => $reversed])->assertOk();

        $this->assertSame($reversed, $this->orderOf($playlist));
    }

    public function test_reorder_with_mismatched_list_is_rejected_and_changes_nothing(): void
    {
        $user     = User::factory()->create();
        $playlist = $this->playlistFor($user, 3);
        $before   = $this->orderOf($playlist);
        Sanctum::actingAs($user);

        // Kurang satu lagu
        $this->putJson("/api/v1/playlists/{$playlist->id}/songs/order", ['song_ids' => array_slice($before, 0, 2)])
            ->assertUnprocessable();
        // Ada id asing
        $this->putJson("/api/v1/playlists/{$playlist->id}/songs/order", ['song_ids' => [ ...array_slice($before, 0, 2), 999999]])
            ->assertUnprocessable();
        // Id ganda
        $this->putJson("/api/v1/playlists/{$playlist->id}/songs/order", ['song_ids' => [$before[0], $before[0], $before[1]]])
            ->assertUnprocessable();

        $this->assertSame($before, $this->orderOf($playlist));
    }

    public function test_removing_a_song_closes_the_gap_in_positions(): void
    {
        $user                    = User::factory()->create();
        $playlist                = $this->playlistFor($user, 3);
        [$first, $middle, $last] = $this->orderOf($playlist);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/v1/playlists/{$playlist->id}/songs/{$middle}")->assertOk();

        $this->assertSame([$first, $last], $this->orderOf($playlist));
        $this->assertEquals([1, 2], DB::table('playlist_song')->where('playlist_id', $playlist->id)
                ->orderBy('position')->pluck('position')->all());
    }

    public function test_deleting_a_playlist_removes_its_songs_links(): void
    {
        $user     = User::factory()->create();
        $playlist = $this->playlistFor($user, 2);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/v1/playlists/{$playlist->id}")->assertOk();

        $this->assertSame(0, DB::table('playlist_song')->where('playlist_id', $playlist->id)->count());
        $this->assertSame(2, Song::count()); // lagunya sendiri tetap ada
    }
}
