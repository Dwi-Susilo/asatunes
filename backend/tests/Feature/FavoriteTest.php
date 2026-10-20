<?php
namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FavoriteTest extends TestCase
{
    use RefreshDatabase;

    public function test_adding_a_favorite_is_idempotent(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/v1/favorites/{$song->id}")->assertCreated();
        $this->postJson("/api/v1/favorites/{$song->id}")->assertOk();

        $this->assertSame(1, Favorite::where('user_id', $user->id)->count());
    }

    public function test_favorites_list_contains_the_song(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();
        Favorite::create(['user_id' => $user->id, 'song_id' => $song->id]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/favorites')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $song->id);
    }

    public function test_removing_a_favorite_twice_is_safe(): void
    {
        $user = User::factory()->create();
        $song = Song::factory()->create();
        Favorite::create(['user_id' => $user->id, 'song_id' => $song->id]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/v1/favorites/{$song->id}")->assertOk();
        $this->deleteJson("/api/v1/favorites/{$song->id}")->assertOk();

        $this->assertSame(0, Favorite::count());
    }

    public function test_favorites_are_private_to_each_user(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $song  = Song::factory()->create();
        Favorite::create(['user_id' => $owner->id, 'song_id' => $song->id]);

        Sanctum::actingAs($other);

        $this->getJson('/api/v1/favorites')->assertOk()->assertJsonPath('meta.total', 0);
        $this->deleteJson("/api/v1/favorites/{$song->id}")->assertOk();

        // Milik pemilik tetap utuh
        $this->assertDatabaseHas('favorites', ['user_id' => $owner->id, 'song_id' => $song->id]);
    }
}
