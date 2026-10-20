<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class UpdateYtDlp extends Command
{
    protected $signature = 'ytdlp:update';

    protected $description = 'Perbarui yt-dlp dan catat versinya';

    public function handle(): int
    {
        $binary = (string) config('ytdlp.binary');
        $before = $this->version($binary);

        $result = Process::timeout(180)->run([$binary, '-U']);
        $after  = $this->version($binary);

        if ($result->failed()) {
            Log::warning('ytdlp:update gagal', [
                'before' => $before,
                'output' => trim($result->output() . ' ' . $result->errorOutput()),
            ]);

            $this->error("Pembaruan gagal (versi saat ini: {$before}).");
            $this->line(trim($result->output() . "\n" . $result->errorOutput()));
            $this->line('Kalau yt-dlp dipasang lewat pip/pipx/apt, perbarui dengan pengelola paket itu.');

            return self::FAILURE;
        }

        Log::info('ytdlp:update selesai', ['before' => $before, 'after' => $after]);

        $this->info($before === $after
                ? "Sudah versi terbaru ({$after})."
                : "Diperbarui: {$before} → {$after}");

        return self::SUCCESS;
    }

    private function version(string $binary): string
    {
        $result = Process::timeout(15)->run([$binary, '--version']);

        return $result->successful() ? trim($result->output()) : 'tidak diketahui';
    }
}
