<?php
namespace Tests\Feature;

use App\Exceptions\YtDlpException;
use App\Models\Song;
use App\Services\Trending;
use App\Services\YtDlp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Mockery\MockInterface;
use Tests\TestCase;

/** Tab Terkait (21 Nov 2026): artis lain, acak, minimal 15, tanpa token. */
class RelatedTest extends TestCase
{
    use RefreshDatabase;

    private function item(int $i, string $artist, string $title = null, int $dur = 200): array
    {
        return [
            'youtube_id'   => sprintf('id%09d', $i),
            'title'        => $title ?? "Lagu nomor {$i}",
            'artist'       => $artist,
            'thumbnail'    => "https://i.ytimg.com/vi/x{$i}/hqdefault.jpg",
            'duration_sec' => $dur,
        ];
    }

    private function fake(array $search, array $trending, bool $searchFails = false): Song
    {
        $seed = Song::factory()->create(['artist' => 'Dewa 19', 'title' => 'Kirana']);

        $this->mock(YtDlp::class, function (MockInterface $m) use ($search, $searchFails) {
            $exp = $m->shouldReceive('search');
            $searchFails ? $exp->andThrow(new YtDlpException('gagal')) : $exp->andReturn($search);
        });
        $this->mock(Trending::class, fn (MockInterface $m) => $m->shouldReceive('get')->andReturn($trending));

        return $seed;
    }

    public function test_unknown_song_answers_404(): void
    {
        $this->getJson('/api/v1/music/abcdefghijk/related')->assertNotFound();
    }

    public function test_returns_at_least_15_songs_by_other_artists_without_a_token(): void
    {
        $search = [];
        for ($i = 1; $i <= 10; $i++) {
            $search[] = $this->item($i, "Artis {$i}");
        }
        $search[] = $this->item(50, 'Dewa 19 - Topic');            // artis yang sama: dibuang
        $search[] = $this->item(51, 'Artis X', 'Mix karaoke');      // disaring SongFilter
        $search[] = $this->item(52, 'Artis Y', 'Terlalu panjang', 5000);

        $trending = [];
        for ($i = 100; $i < 112; $i++) {
            $trending[] = $this->item($i, "Penyanyi {$i}");
        }
        $trending[] = $this->item(1, 'Artis 1');                   // id kembar dengan hasil pencarian

        $seed = $this->fake($search, $trending);

        $data = $this->getJson("/api/v1/music/{$seed->youtube_id}/related")->assertOk()->json('data');

        $this->assertGreaterThanOrEqual(15, count($data));
        $ids = array_column($data, 'youtube_id');
        $this->assertSame(count($ids), count(array_unique($ids)), 'tidak boleh ada lagu kembar');
        $this->assertNotContains($seed->youtube_id, $ids);
        $this->assertNotContains(sprintf('id%09d', 50), $ids);
        $this->assertNotContains(sprintf('id%09d', 51), $ids);
        $this->assertNotContains(sprintf('id%09d', 52), $ids);
        foreach ($data as $row) {
            $this->assertNotSame('Dewa 19 - Topic', $row['artist']);
            $this->assertContains($row['source'], ['related', 'trending']);
        }
    }

    public function test_order_is_random_on_every_request(): void
    {
        $search = [];
        for ($i = 1; $i <= 18; $i++) {
            $search[] = $this->item($i, "Artis {$i}");
        }
        $seed = $this->fake($search, []);

        $a = array_column($this->getJson("/api/v1/music/{$seed->youtube_id}/related")->json('data'), 'youtube_id');
        $b = array_column($this->getJson("/api/v1/music/{$seed->youtube_id}/related")->json('data'), 'youtube_id');

        $this->assertNotSame($a, $b);
        $this->assertEqualsCanonicalizing($a, $b);
    }

    public function test_limit_is_respected_and_capped(): void
    {
        $search = [];
        for ($i = 1; $i <= 25; $i++) {
            $search[] = $this->item($i, "Artis {$i}");
        }
        $seed = $this->fake($search, []);

        $this->assertCount(5, $this->getJson("/api/v1/music/{$seed->youtube_id}/related?limit=5")->json('data'));
        $this->assertLessThanOrEqual(30, count($this->getJson("/api/v1/music/{$seed->youtube_id}/related?limit=999")->json('data')));
    }

    public function test_falls_back_to_trending_when_search_fails_and_does_not_cache_the_degraded_result(): void
    {
        $trending = [];
        for ($i = 100; $i < 125; $i++) {
            $trending[] = $this->item($i, "Penyanyi {$i}");
        }
        $seed = $this->fake([], $trending, searchFails: true);

        $data = $this->getJson("/api/v1/music/{$seed->youtube_id}/related")->assertOk()->json('data');

        $this->assertGreaterThanOrEqual(15, count($data));
        $this->assertNull(Cache::get("related:{$seed->youtube_id}"));
    }
}
