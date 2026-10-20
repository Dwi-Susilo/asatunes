<?php

use App\Http\Controllers\Api\V1\Admin\StatsController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\FavoriteController;
use App\Http\Controllers\Api\V1\MusicController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\SongPlayController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'not.blocked'])->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('profile', [ProfileController::class, 'show']);
        Route::patch('profile', [ProfileController::class, 'update']);
        Route::put('profile/password', [ProfileController::class, 'updatePassword']);

        Route::prefix('music')->group(function () {
            Route::get('search', [MusicController::class, 'search'])->middleware('throttle:ytdlp');
            Route::get('stream', [MusicController::class, 'stream'])->middleware('throttle:ytdlp');
            Route::get('proxy-audio', [MusicController::class, 'proxyAudio']);
            Route::get('trending', [MusicController::class, 'trending']);
            Route::get('lyrics', [MusicController::class, 'lyrics']);

            Route::get('{youtubeId}/recommendations', [MusicController::class, 'recommendations'])
                ->where('youtubeId', '[A-Za-z0-9_-]{11}')
                ->middleware('throttle:ytdlp');

            Route::post('{song}/play', [SongPlayController::class, 'store'])
                ->whereNumber('song')
                ->middleware('throttle:play');
        });

        Route::prefix('favorites')->group(function () {
            Route::get('/', [FavoriteController::class, 'index']);
            Route::post('{song}', [FavoriteController::class, 'store'])->whereNumber('song');
            Route::delete('{song}', [FavoriteController::class, 'destroy'])->whereNumber('song');
        });

        Route::middleware('admin')->prefix('admin')->group(function () {
            Route::get('users', [AdminUserController::class, 'index']);
            Route::post('users/{user}/block', [AdminUserController::class, 'block']);
            Route::post('users/{user}/unblock', [AdminUserController::class, 'unblock']);
            Route::patch('users/{user}/role', [AdminUserController::class, 'updateRole']);
            Route::delete('users/{user}', [AdminUserController::class, 'destroy']);
            Route::get('stats', [StatsController::class, 'index']);
        });

    });

});
