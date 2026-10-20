<?php
namespace App\Http\Resources;

use App\Services\YtDlp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SongResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'youtube_id'   => $this->youtube_id,
            'title'        => $this->title,
            'artist'       => $this->artist,
            'album'        => $this->album,
            'thumbnail'    => YtDlp::thumbnailFor($this->youtube_id),
            'duration_sec' => (int) $this->duration_sec,
        ];
    }
}
