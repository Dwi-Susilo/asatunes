<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * ip_address menyimpan hash IP Pengunjung (64 karakter, mis. SHA-256 heksadesimal),
     * bukan IP mentah (keputusan D9). Kosong untuk pemutaran Pengguna.
     */
    public function up(): void
    {
        Schema::table('song_plays', function (Blueprint $table) {
            $table->string('ip_address', 64)->nullable()->after('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('song_plays', function (Blueprint $table) {
            $table->dropColumn('ip_address');
        });
    }
};
