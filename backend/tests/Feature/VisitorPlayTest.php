<?php
namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongPlay;
use App\Models\User;
use App\Services\YtDlp;
use App\Support\IpHash;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class VisitorPlayTest extends TestCase
{
    use RefreshDatabase;

    private function playAs(string $ip, Song $song, int $sec = 45)
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson("/api/v1/music/{$song->id}/play", ['listened_sec' => $sec]);
    }

    public function test_stream_works_without_a_token(): void
    {
        $this->mock(YtDlp::class, function (MockInterface $m) {
            $m->shouldReceive('extract')->once()->andReturn([
                'metadata'   => ['title' => 'Judul', 'artist' => 'Artis', 'album' => null,
                                 'thumbnail' => null, 'duration_sec' => 200],
                'stream_url' => 'https://rr1.googlevideo.com/audio',
            ]);
        });

        $this->getJson('/api/v1/music/stream?query=abcdefghijk')
            ->assertOk()
            ->assertJsonStructure(['data' => ['song_id', 'play_url', 'expires_at']]);
    }

    public function test_a_visitor_play_is_recorded_with_hashed_ip_and_no_user(): void
    {
        $song = Song::factory()->create();

        $this->playAs('203.0.113.7', $song)->assertCreated()->assertJsonPath('data.counted', true);

        $play = SongPlay::firstOrFail();
        $this->assertNull($play->user_id);
        $this->assertSame(IpHash::of('203.0.113.7'), $play->ip_address);
        $this->assertSame(64, strlen($play->ip_address));
        $this->assertNotSame('203.0.113.7', $play->ip_address);
    }

    public function test_the_same_ip_and_song_within_cooldown_is_a_duplicate(): void
    {
        $song = Song::factory()->create();

        $this->playAs('203.0.113.7', $song)->assertCreated();
        $this->playAs('203.0.113.7', $song)->assertOk()->assertJsonPath('data.reason', 'duplicate');

        $this->assertSame(1, SongPlay::count());
    }

    public function test_another_ip_or_another_song_is_counted_separately(): void
    {
        [$a, $b] = Song::factory()->count(2)->create();

        $this->playAs('203.0.113.7', $a)->assertCreated();
        $this->playAs('203.0.113.8', $a)->assertCreated();
        $this->playAs('203.0.113.7', $b)->assertCreated();

        $this->assertSame(3, SongPlay::count());
    }

    public function test_a_short_visitor_listen_is_not_counted(): void
    {
        $song = Song::factory()->create();

        $this->playAs('203.0.113.7', $song, 10)->assertOk()->assertJsonPath('data.reason', 'too_short');

        $this->assertSame(0, SongPlay::count());
    }

    public function test_a_user_play_keeps_user_id_and_has_no_ip(): void
    {
        $song  = Song::factory()->create();
        $user  = User::factory()->create();
        $token = $user->createToken('uji')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/music/{$song->id}/play", ['listened_sec' => 45])
            ->assertCreated();

        $play = SongPlay::firstOrFail();
        $this->assertSame($user->id, $play->user_id);
        $this->assertNull($play->ip_address);
    }

    public function test_command_clears_ip_older_than_one_day_only(): void
    {
        $song = Song::factory()->create();
        $old  = SongPlay::create(['ip_address' => IpHash::of('1.1.1.1'), 'song_id' => $song->id,
                                  'played_at' => now()->subDay()->subMinute()]);
        $new  = SongPlay::create(['ip_address' => IpHash::of('2.2.2.2'), 'song_id' => $song->id,
                                  'played_at' => now()->subHours(23)]);

        $this->artisan('song-plays:clear-ip')->assertSuccessful();

        $this->assertNull($old->fresh()->ip_address);
        $this->assertNotNull($new->fresh()->ip_address);
        $this->assertSame(2, SongPlay::count());
    }

    public function test_the_ip_clearing_command_is_scheduled_hourly(): void
    {
        $events = collect(app(Schedule::class)->events())
            ->filter(fn ($e) => str_contains($e->command, 'song-plays:clear-ip'));

        $this->assertCount(1, $events);
        $this->assertSame('0 * * * *', $events->first()->expression);
    }
}
