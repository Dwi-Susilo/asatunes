<?php
namespace Tests\Feature;

use App\Exceptions\YtDlpException;
use App\Models\Song;
use App\Models\User;
use App\Services\YtDlp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class PlayUrlNotBoundToUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_play_url_from_stream_has_no_user_parameter(): void
    {
        $this->mock(YtDlp::class, function (MockInterface $mock) {
            $mock->shouldReceive('extract')->once()->andReturn([
                'metadata'   => ['title' => 'Judul', 'artist' => 'Artis', 'album' => null,
                                 'thumbnail' => null, 'duration_sec' => 200],
                'stream_url' => 'https://rr1.googlevideo.com/audio',
            ]);
        });
        Sanctum::actingAs(User::factory()->create());

        $playUrl = $this->getJson('/api/v1/music/stream?query=abcdefghijk')
            ->assertOk()
            ->json('data.play_url');

        parse_str((string) parse_url($playUrl, PHP_URL_QUERY), $query);

        $this->assertArrayNotHasKey('u', $query);
        $this->assertArrayHasKey('signature', $query);
    }

    public function test_signed_url_without_a_user_passes_the_signature_check(): void
    {
        $song = Song::factory()->create();

        // Sumber tidak valid dan ekstraksi gagal => 502, artinya tidak berhenti di 403
        Cache::put("stream:{$song->youtube_id}", 'https://example.com/bukan-googlevideo');
        $this->mock(YtDlp::class, function (MockInterface $mock) {
            $mock->shouldReceive('extract')->andThrow(new YtDlpException('gagal'));
            $mock->shouldReceive('extractFromSearch')->andThrow(new YtDlpException('gagal'));
        });

        $url = URL::temporarySignedRoute('music.audio', now()->addHour(), ['song' => $song->id]);

        $this->get($url)->assertStatus(502);
    }
}
