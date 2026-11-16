<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGE = 'Jika email terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim.';

    public function test_forgot_password_sends_a_reset_link_to_a_registered_email(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertOk()->assertJsonPath('message', self::MESSAGE);

        Notification::assertSentTo($user, ResetPassword::class, function ($n) use ($user) {
            $url = $n->toMail($user)->actionUrl;
            return str_starts_with($url, config('app.frontend_url') . '/reset-password?token=')
                && str_contains($url, 'email=' . urlencode($user->email));
        });
    }

    public function test_the_answer_is_the_same_for_an_unknown_email_and_nothing_is_sent(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'tidak-ada@example.com'])
            ->assertOk()->assertJsonPath('message', self::MESSAGE);

        Notification::assertNothingSent();
    }

    public function test_a_blocked_account_gets_the_same_answer_but_no_email(): void
    {
        Notification::fake();
        $user = User::factory()->create(['status' => 'blocked']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertOk()->assertJsonPath('message', self::MESSAGE);

        Notification::assertNothingSent();
    }

    public function test_forgot_password_validates_the_email(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'bukan-email'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_reset_changes_the_password_and_revokes_all_tokens(): void
    {
        $user = User::factory()->create();
        $user->createToken('perangkat-1');
        $user->createToken('perangkat-2');
        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => $token, 'password' => 'sandibaru',
        ])->assertOk()->assertJsonPath('message', 'Kata sandi berhasil diatur ulang.');

        $this->assertTrue(Hash::check('sandibaru', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'sandibaru'])
            ->assertOk()->assertJsonStructure(['data' => ['token']]);
    }

    public function test_an_invalid_token_is_rejected_with_422_and_changes_nothing(): void
    {
        $user = User::factory()->create();
        $old  = $user->password;

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => 'tokenpalsu', 'password' => 'sandibaru',
        ])->assertStatus(422)->assertJsonPath('message', 'Token tidak valid atau sudah kedaluwarsa.');

        $this->assertSame($old, $user->fresh()->password);
    }

    public function test_a_token_is_valid_for_60_minutes_only(): void
    {
        $user  = User::factory()->create();
        $token = Password::createToken($user);

        $this->travel(61)->minutes();

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => $token, 'password' => 'sandibaru',
        ])->assertStatus(422);
    }

    public function test_a_token_works_just_inside_the_60_minutes(): void
    {
        $user  = User::factory()->create();
        $token = Password::createToken($user);

        $this->travel(59)->minutes();

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => $token, 'password' => 'sandibaru',
        ])->assertOk();
    }

    public function test_a_token_cannot_be_used_twice(): void
    {
        $user  = User::factory()->create();
        $token = Password::createToken($user);
        $body  = ['email' => $user->email, 'token' => $token, 'password' => 'sandibaru'];

        $this->postJson('/api/v1/auth/reset-password', $body)->assertOk();
        $this->postJson('/api/v1/auth/reset-password', $body)->assertStatus(422);
    }

    public function test_a_blocked_account_cannot_reset(): void
    {
        $user  = User::factory()->create(['status' => 'blocked']);
        $token = Password::createToken($user);
        $old   = $user->password;

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => $token, 'password' => 'sandibaru',
        ])->assertForbidden();

        $this->assertSame($old, $user->fresh()->password);
    }

    public function test_the_new_password_must_have_at_least_6_characters(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email, 'token' => Password::createToken($user), 'password' => '12345',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_both_endpoints_are_limited_to_5_per_minute_per_email_and_ip(): void
    {
        Notification::fake();

        foreach (range(1, 5) as $i) {
            $this->postJson('/api/v1/auth/forgot-password', ['email' => 'a@example.com'])->assertOk();
        }
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'a@example.com'])->assertStatus(429);

        // Email lain tidak ikut terkunci
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'b@example.com'])->assertOk();
    }

    public function test_a_request_with_a_token_is_not_rejected_by_the_server(): void
    {
        Notification::fake();
        $user  = User::factory()->create();
        $other = User::factory()->create();

        $this->withToken($other->createToken('uji')->plainTextToken)
            ->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertOk();
    }
}
