<?php
namespace App\Policies;

use App\Models\Playlist;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class PlaylistPolicy
{
    public function view(User $user, Playlist $playlist): Response
    {
        return $this->owner($user, $playlist);
    }

    public function update(User $user, Playlist $playlist): Response
    {
        return $this->owner($user, $playlist);
    }

    public function delete(User $user, Playlist $playlist): Response
    {
        return $this->owner($user, $playlist);
    }

    private function owner(User $user, Playlist $playlist): Response
    {
        return (int) $user->id === (int) $playlist->user_id
            ? Response::allow()
            : Response::deny('Anda tidak memiliki akses ke playlist ini.');
    }
}
