<?php
namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongPlay;
use App\Models\User;
use App\Services\Trending;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TrendingTest extends TestCase
{
    use RefreshDatabase;

    private function youtubeFake(): void
    {
        config(['services.youtube.key' => 'test-key']);
        Http::fake(['www.googleapis.com/*' => Http::response(['items' => [
            ['id' => 'aaaaaaaaaaa', 'snippet' => ['title' => 'Lagu A', 'channelTitle' => 'Penyanyi A - Topic'], 'contentDetails' => ['duration' => 'PT3M30S']],
            ['id' => 'bbbbbbbbbbb', 'snippet' => ['title' => 'Terlalu pendek', 'channelTitle' => 'B'], 'contentDetails' => ['duration' => 'PT20S']],
            ['id' => 'ccccccccccc', 'snippet' => ['title' => 'Terlalu panjang', 'channelTitle' => 'C'], 'contentDetails' => ['duration' => 'PT2H']],
        ]])]);
    }

    private function play(Song $song, ?User $user = null, ?string $ip = null, $at = null): void
    {
        SongPlay::create([
            'user_id'    => $user?->id,
            'ip_address' => $ip,
            'song_id'    => $song->id,
            'played_at'  => $at ?? now(),
        ]);
    }

    public function test_local_ranking_orders_by_unique_listeners_and_skips_youtube(): void
    {
        Http::fake();
        $popular = Song::factory()->create(['duration_sec' => 200]);
        $loud    = Song::factory()->create(['duration_sec' => 200]);

        // $popular: 3 pendengar unik (1 user + 2 IP tamu), $loud: 1 pendengar yang memutar 5 kali
        $user = User::factory()->create();
        $this->play($popular, $user);
        $this->play($popular, null, 'ip-1');
        $this->play($popular, null, 'ip-2');
        $this->play($popular, null, 'ip-2'); // IP yang sama dihitung satu pendengar
        for ($i = 0; $i < 5; $i++) {
            $this->play($loud, null, 'ip-3');
        }

        $data = app(Trending::class)->get();

        $this->assertSame([$popular->youtube_id, $loud->youtube_id], array_column($data, 'youtube_id'));
        Http::assertNothingSent();
    }

    public function test_local_ranking_ignores_old_plays_and_out_of_range_durations(): void
    {
        config(['services.youtube.key' => null]);
        $old  = Song::factory()->create(['duration_sec' => 200]);
        $long = Song::factory()->create(['duration_sec' => 3600]);
        $this->play($old, null, 'ip-1', now()->subDays(8));
        $this->play($long, null, 'ip-1');

        $this->assertSame([], app(Trending::class)->get());
    }

    public function test_falls_back_to_youtube_when_there_are_no_plays(): void
    {
        $this->youtubeFake();
        Song::factory()->create(['duration_sec' => 200]); // ada lagu, tapi tidak pernah diputar

        $data = app(Trending::class)->get();

        $this->assertCount(1, $data);
        $this->assertSame('aaaaaaaaaaa', $data[0]['youtube_id']);
        $this->assertSame('Lagu A', $data[0]['title']);
        $this->assertSame(210, $data[0]['duration_sec']);
        $this->assertArrayNotHasKey('id', $data[0]);
    }

    public function test_youtube_result_is_cached_and_not_requested_again(): void
    {
        $this->youtubeFake();
        $trending = app(Trending::class);

        $trending->get();
        Cache::forget('trending:local');
        $trending->get();

        Http::assertSentCount(1);
    }

    public function test_uses_stale_copy_when_youtube_fails(): void
    {
        config(['services.youtube.key' => 'test-key']);
        Http::fake(['www.googleapis.com/*' => Http::response([], 500)]);
        Cache::forever('trending:stale', [['youtube_id' => 'zzzzzzzzzzz', 'title' => 'Lama']]);

        $data = app(Trending::class)->get();

        $this->assertSame('zzzzzzzzzzz', $data[0]['youtube_id']);
    }

    public function test_returns_empty_list_when_nothing_is_available(): void
    {
        config(['services.youtube.key' => null]);

        $this->assertSame([], app(Trending::class)->get());
    }

    public function test_refresh_returns_null_without_api_key(): void
    {
        config(['services.youtube.key' => null]);

        $this->assertNull(app(Trending::class)->refresh());
    }

    public function test_trending_endpoint_returns_youtube_list_when_no_plays(): void
    {
        $this->youtubeFake();

        $this->getJson('/api/v1/music/trending')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.0.youtube_id', 'aaaaaaaaaaa');
    }
}
