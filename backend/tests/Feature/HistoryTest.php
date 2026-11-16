<?php
namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongPlay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HistoryTest extends TestCase
{
    use RefreshDatabase;

    private function play(?User $user, Song $song, $at, ?string $ip = null): SongPlay
    {
        return SongPlay::create([
            'user_id' => $user?->id, 'ip_address' => $ip, 'song_id' => $song->id, 'played_at' => $at,
        ]);
    }

    public function test_a_visitor_gets_401(): void
    {
        $this->getJson('/api/v1/history')->assertUnauthorized();
    }

    public function test_history_lists_only_own_plays_newest_first_with_played_at(): void
    {
        $me    = User::factory()->create();
        $other = User::factory()->create();
        [$a, $b] = Song::factory()->count(2)->create();

        $this->play($me, $a, now()->subHours(2));
        $this->play($me, $b, now()->subHour());
        $this->play($other, $a, now());
        $this->play(null, $b, now(), str_repeat('a', 64)); // Pengunjung

        Sanctum::actingAs($me);

        $res = $this->getJson('/api/v1/history')->assertOk();

        $res->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $b->id)
            ->assertJsonPath('data.1.id', $a->id)
            ->assertJsonStructure(['data' => [['id', 'youtube_id', 'title', 'artist', 'album', 'thumbnail', 'duration_sec', 'played_at']]])
            ->assertJsonPath('meta.total', 2);
    }

    public function test_history_is_paginated_20_per_page(): void
    {
        $me   = User::factory()->create();
        $song = Song::factory()->create();
        foreach (range(1, 25) as $i) {
            $this->play($me, $song, now()->subMinutes($i));
        }
        Sanctum::actingAs($me);

        $this->getJson('/api/v1/history')->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.last_page', 2);
        $this->getJson('/api/v1/history?page=2')->assertOk()->assertJsonCount(5, 'data');
    }

    public function test_a_blocked_account_cannot_read_history(): void
    {
        $user = User::factory()->create(['status' => 'blocked']);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/history')->assertForbidden();
    }

    public function test_a_play_made_through_the_api_shows_up_in_history(): void
    {
        $me   = User::factory()->create();
        $song = Song::factory()->create();

        $this->withToken($me->createToken('uji')->plainTextToken)
            ->postJson("/api/v1/music/{$song->id}/play", ['listened_sec' => 45])->assertCreated();

        $this->withToken($me->createToken('uji2')->plainTextToken)
            ->getJson('/api/v1/history')->assertOk()->assertJsonPath('data.0.id', $song->id);
    }
}
