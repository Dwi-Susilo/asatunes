<?php
namespace App\Console\Commands;

use App\Models\SongPlay;
use Illuminate\Console\Command;

class ClearOldPlayIps extends Command
{
    protected $signature = 'song-plays:clear-ip';

    protected $description = 'Kosongkan ip_address pada pemutaran yang lebih lama dari 1 hari (keputusan D9).';

    public function handle(): int
    {
        $cleared = SongPlay::whereNotNull('ip_address')
            ->where('played_at', '<', now()->subDay())
            ->update(['ip_address' => null]);

        $this->info("ip_address dikosongkan pada {$cleared} baris.");

        return self::SUCCESS;
    }
}
