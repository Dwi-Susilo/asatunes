<?php
namespace Tests\Feature;

use App\Exceptions\YtDlpException;
use App\Models\Song;
use App\Services\YtDlp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Mockery\MockInterface;
use Tests\TestCase;

/** Tahap B10: API di belakang tunnel (Tailscale Funnel, Cloudflare Tunnel). */
class TrustedProxiesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::get('/__who', fn (Request $r) => ['ip' => $r->ip(), 'secure' => $r->isSecure()]);
    }

    private function viaTunnel(string $remote = '127.0.0.1')
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $remote])
            ->withHeaders(['X-Forwarded-For' => '203.0.113.9', 'X-Forwarded-Proto' => 'https']);
    }

    public function test_by_default_forwarded_headers_are_ignored(): void
    {
        $this->viaTunnel()->getJson('/__who')
            ->assertOk()
            ->assertJson(['ip' => '127.0.0.1', 'secure' => false]);
    }

    public function test_a_trusted_proxy_gives_the_real_client_ip_and_scheme(): void
    {
        config(['trustedproxy.proxies' => '127.0.0.1']);

        $this->viaTunnel()->getJson('/__who')
            ->assertOk()
            ->assertJson(['ip' => '203.0.113.9', 'secure' => true]);
    }

    public function test_headers_from_an_untrusted_sender_cannot_spoof_the_ip(): void
    {
        config(['trustedproxy.proxies' => '127.0.0.1']);

        $this->viaTunnel('192.168.100.50')->getJson('/__who')
            ->assertOk()
            ->assertJson(['ip' => '192.168.100.50', 'secure' => false]);
    }

    public function test_signed_audio_url_is_valid_behind_an_https_tunnel_only_when_proxy_is_trusted(): void
    {
        $this->mock(YtDlp::class, fn (MockInterface $m) => $m->shouldReceive('extract')->andThrow(new YtDlpException('x')));
        $song = Song::factory()->create();

        URL::forceRootUrl('https://api.example.test');
        URL::forceScheme('https');
        $signed = URL::signedRoute('music.audio', ['song' => $song->id]);
        $path   = parse_url($signed, PHP_URL_PATH) . '?' . parse_url($signed, PHP_URL_QUERY);

        // Tunnel meneruskan permintaan ke Nginx lokal lewat http, dengan X-Forwarded-Proto: https
        $call = fn () => $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders(['X-Forwarded-Proto' => 'https'])
            ->get('http://api.example.test' . $path);

        // Tanpa proxy tepercaya: tampak http, tanda tangan ditolak
        $call()->assertStatus(403);

        // Dengan proxy tepercaya: tanda tangan sah (jawaban berikutnya soal yt-dlp, bukan 403)
        config(['trustedproxy.proxies' => '127.0.0.1']);
        $this->assertNotSame(403, $call()->getStatusCode());
    }
}
