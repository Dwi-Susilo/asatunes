<?php
namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email    = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command->error('ADMIN_EMAIL dan ADMIN_PASSWORD belum diisi di .env');

            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name'     => env('ADMIN_NAME', 'Administrator'),
                'password' => $password,
                'role'     => 'admin',
                'status'   => 'active',
            ]
        );

        $this->command->info("Akun admin siap: {$email}");
    }
}
