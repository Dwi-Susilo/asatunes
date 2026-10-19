<?php
namespace App\Console\Commands;

use App\Services\Trending;
use Illuminate\Console\Command;

class RefreshTrending extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'trending:refresh';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perbarui daftar lagu trending.';

    /**
     * Execute the console command.
     */
    public function handle(Trending $trending): int
    {
        $items = $trending->refresh();

        if ($items === null) {
            $this->error('Gagal memperbarui trending. Cek storage/logs/laravel.log');
            return self::FAILURE;
        }

        $this->info('Trending diperbarui: ' . count($items) . ' lagu.');
        return self::SUCCESS;
    }
}
