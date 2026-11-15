<?php
namespace Tests\Feature;

use App\Models\Song;
use App\Models\User;
use App\Services\Lyrics;
use App\Services\SmartQueue;
use App\Services\Trending;
use App\Services\YtDlp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class OpenMusicRoutesTest extends TestCase
{
    use RefreshDatabase;

    private function fakeServices(): Song
    {
        $song = Song::factory()->create();

        $this->mock(Trending::class, fn (MockInterface $m) => $m->shouldReceive('get')->andReturn([]));
        $this->mock(Lyrics::class, fn (MockInterface $m) => $m->shouldReceive('find')
            ->andReturn(['synced' => null, 'plain' => 'la la', 'instrumental' => false]));
        $this->mock(YtDlp::class, fn (MockInterface $m) => $m->shouldReceive('search')->andReturn([]));
        $this->mock(SmartQueue::class, fn (MockInterface $m) => $m->shouldReceive('for')->andReturn([]));

        return $song;
    }

    private function openEndpoints(Song $song): array
    {
        return [
            '/api/v1/music/trending',
            '/api/v1/music/search?q=tulus',
            '/api/v1/music/lyrics?title=Judul&artist=Artis',
            "/api/v1/music/{$song->youtube_id}/recommendations",
        ];
    }

    public function test_read_endpoints_answer_200_without_a_token(): void
    {
        $song = $this->fakeServices();

        foreach ($this->openEndpoints($song) as $url) {
            $this->getJson($url)->assertOk();
        }
    }

    public function test_read_endpoints_ignore_an_invalid_token(): void
    {
        $song = $this->fakeServices();

        foreach ($this->openEndpoints($song) as $url) {
            $this->withToken('9999|tokenpalsu')->getJson($url)->assertOk();
        }
    }

    public function test_read_endpoints_do_not_reject_a_blocked_account(): void
    {
        $song  = $this->fakeServices();
        $token = User::factory()->create(['status' => 'blocked'])->createToken('uji')->plainTextToken;

        foreach ($this->openEndpoints($song) as $url) {
            $this->withToken($token)->getJson($url)->assertOk();
        }
    }

    public function test_account_endpoints_stay_closed_without_a_token(): void
    {
        $this->getJson('/api/v1/favorites')->assertUnauthorized();
        $this->getJson('/api/v1/playlists')->assertUnauthorized();
        $this->getJson('/api/v1/profile')->assertUnauthorized();
        $this->getJson('/api/v1/admin/stats')->assertUnauthorized();
    }
}
