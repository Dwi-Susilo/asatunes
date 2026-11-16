<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Indeks untuk Riwayat Lagu Diputar (keputusan D14): pemutaran milik satu pengguna, terbaru dulu.
     */
    public function up(): void
    {
        Schema::table('song_plays', function (Blueprint $table) {
            $table->index(['user_id', 'played_at'], 'song_plays_user_id_played_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('song_plays', function (Blueprint $table) {
            $table->dropIndex('song_plays_user_id_played_at_index');
        });
    }
};
