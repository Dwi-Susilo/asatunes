<?php
namespace Database\Factories;

use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Song>
 */
class SongFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'youtube_id'   => Str::random(11),
            'title'        => fake()->sentence(3),
            'artist'       => fake()->name(),
            'album'        => null,
            'duration_sec' => 200,
        ];
    }
}
