<?php
namespace App\Http\Resources;

use App\Services\YtDlp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlaylistResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'title'            => $this->title,
            'description'      => $this->description,
            'songs_count'      => $this->whenCounted('songs'),
            'cover_thumbnails' => $this->whenLoaded('songs', fn() => $this->songs
                    ->take(4)
                    ->map(fn($song) => YtDlp::thumbnailFor($song->youtube_id))
                    ->values()),
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
