<?php
namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongPlay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlayTest extends TestCase
{
    use RefreshDatabase;

    public function test_short_listens_are_not_counted(): void
    {
        $song = Song::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/music/{$song->id}/play", ['listened_sec' => 10])
            ->assertOk()
            ->assertJsonPath('data.counted', false)
            ->assertJsonPath('data.reason', 'too_short');

        $this->assertSame(0, SongPlay::count());
    }

    public function test_a_long_enough_listen_is_counted_once_within_cooldown(): void
    {
        $song = Song::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/music/{$song->id}/play", ['listened_sec' => 45])
            ->assertCreated()
            ->assertJsonPath('data.counted', true);

        $this->postJson("/api/v1/music/{$song->id}/play", ['listened_sec' => 45])
            ->assertOk()
            ->assertJsonPath('data.reason', 'duplicate');

        $this->assertSame(1, SongPlay::count());
    }

    public function test_listened_seconds_is_required(): void
    {
        $song = Song::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/v1/music/{$song->id}/play", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['listened_sec']);
    }
}
