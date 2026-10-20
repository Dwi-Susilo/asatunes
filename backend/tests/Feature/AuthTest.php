<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_a_regular_user(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi', 'email' => 'budi@example.com', 'password' => 'rahasia123',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'budi@example.com', 'role' => 'user', 'status' => 'active']);
    }

    public function test_register_cannot_assign_admin_role_or_status(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Jahat', 'email'  => 'jahat@example.com', 'password' => 'rahasia123',
            'role' => 'admin', 'status' => 'blocked',
        ]);

        $this->assertDatabaseHas('users', ['email' => 'jahat@example.com', 'role' => 'user', 'status' => 'active']);
    }

    public function test_register_requires_valid_data(): void
    {
        $this->postJson('/api/v1/auth/register', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_login_returns_a_token(): void
    {
        User::factory()->create(['email' => 'budi@example.com', 'password' => 'rahasia123']);

        $this->postJson('/api/v1/auth/login', ['email' => 'budi@example.com', 'password' => 'rahasia123'])
            ->assertOk()
            ->assertJsonStructure(['status', 'data' => ['user', 'token']]);
    }

    public function test_login_with_wrong_password_gives_no_token(): void
    {
        User::factory()->create(['email' => 'budi@example.com', 'password' => 'rahasia123']);

        $response = $this->postJson('/api/v1/auth/login', ['email' => 'budi@example.com', 'password' => 'salah']);

        $this->assertContains($response->status(), [401, 422]);
        $response->assertJsonMissingPath('data.token');
    }

    public function test_unauthenticated_request_without_accept_header_gets_json_401(): void
    {
        // Regresi untuk bug "Route [login] not defined" di Langkah 20
        $this->get('/api/v1/profile')
            ->assertUnauthorized()
            ->assertJson(['status' => 'error']);
    }

    public function test_blocked_user_is_rejected_and_tokens_are_revoked(): void
    {
        $user  = User::factory()->create(['status' => 'blocked']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/profile')->assertForbidden();

        $this->assertSame(0, $user->tokens()->count());
    }
}
