<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_user_cannot_access_admin_endpoints(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->getJson('/api/v1/admin/stats')->assertForbidden();
    }

    public function test_admin_can_see_stats(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/v1/admin/stats')
            ->assertOk()
            ->assertJsonStructure(['data' => ['total_users', 'total_playlists', 'top_songs']]);
    }

    public function test_admin_can_block_a_user(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $target = User::factory()->create();

        $this->postJson("/api/v1/admin/users/{$target->id}/block")->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'blocked']);
    }
}
