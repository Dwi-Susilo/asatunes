<?php
namespace Tests\Feature;

use App\Models\Song;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AudioUrlTest extends TestCase
{
    use RefreshDatabase;

    private function signedUrl(Song $song, $expires = null): string
    {
        return URL::temporarySignedRoute('music.audio', $expires ?? now()->addHour(), [
            'song' => $song->id,
        ]);
    }

    public function test_unsigned_url_is_rejected(): void
    {
        $song = Song::factory()->create();

        $this->get("/api/v1/music/audio/{$song->id}")->assertForbidden();
    }

    public function test_expired_signed_url_is_rejected(): void
    {
        $song = Song::factory()->create();

        $this->get($this->signedUrl($song, now()->subMinute()))->assertForbidden();
    }

    public function test_changing_the_song_in_a_signed_url_is_rejected(): void
    {
        [$a, $b] = Song::factory()->count(2)->create();

        $url = str_replace("/audio/{$a->id}?", "/audio/{$b->id}?", $this->signedUrl($a));

        $this->get($url)->assertForbidden();
    }
}
