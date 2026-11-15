<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class OptionalIdentityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Rute uji: mengikuti urutan middleware pada rute musik terbuka
        Route::middleware(['auth.optional', 'throttle:api'])
            ->get('/api/v1/_uji/siapa', fn (Request $request) => response()->json([
                'id' => $request->user()?->id,
            ]));
    }

    public function test_without_token_the_request_is_a_visitor(): void
    {
        $this->getJson('/api/v1/_uji/siapa')->assertOk()->assertJsonPath('id', null);
    }

    public function test_a_valid_bearer_token_is_recognised_as_the_user(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('uji')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/_uji/siapa')
            ->assertOk()
            ->assertJsonPath('id', $user->id);
    }

    public function test_an_invalid_token_is_treated_as_a_visitor_not_401(): void
    {
        $this->withToken('9999|tokenpalsu')->getJson('/api/v1/_uji/siapa')
            ->assertOk()
            ->assertJsonPath('id', null);
    }

    public function test_an_expired_token_is_treated_as_a_visitor_not_401(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('uji', ['*'], now()->subMinute())->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/_uji/siapa')
            ->assertOk()
            ->assertJsonPath('id', null);
    }

    public function test_a_token_of_a_blocked_account_is_treated_as_a_visitor(): void
    {
        $user  = User::factory()->create(['status' => 'blocked']);
        $token = $user->createToken('uji')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/_uji/siapa')
            ->assertOk()
            ->assertJsonPath('id', null);
    }

    public function test_the_rate_limiter_is_keyed_by_user_when_a_valid_token_is_sent(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('uji')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/_uji/siapa')->assertOk();

        $this->assertSame(1, RateLimiter::attempts(md5('api' . $user->id)));
    }

    public function test_the_rate_limiter_is_keyed_by_ip_for_a_visitor(): void
    {
        $this->getJson('/api/v1/_uji/siapa')->assertOk();

        $this->assertSame(1, RateLimiter::attempts(md5('api' . '127.0.0.1')));
    }
}
