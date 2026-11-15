<?php
namespace Tests\Feature;

use App\Models\Song;
use App\Models\SongPlay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SongPlayIpAddressTest extends TestCase
{
    use RefreshDatabase;

    public function test_song_plays_has_ip_address_column(): void
    {
        $this->assertTrue(Schema::hasColumn('song_plays', 'ip_address'));
    }

    public function test_ip_address_stores_a_64_char_hash_and_is_nullable(): void
    {
        $song = Song::factory()->create();
        $hash = hash('sha256', '203.0.113.7');

        $guest = SongPlay::create([
            'user_id' => null,
            'ip_address' => $hash,
            'song_id' => $song->id,
            'played_at' => now(),
        ]);
        $member = SongPlay::create([
            'user_id' => User::factory()->create()->id,
            'song_id' => $song->id,
            'played_at' => now(),
        ]);

        $this->assertSame(64, strlen($guest->fresh()->ip_address));
        $this->assertNull($member->fresh()->ip_address);
    }
}
