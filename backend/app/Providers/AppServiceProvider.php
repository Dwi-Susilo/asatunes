<?php
namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Tautan di email reset menuju frontend (API ini tidak punya halaman web)
        ResetPassword::createUrlUsing(fn ($user, string $token) =>
            rtrim(config('app.frontend_url'), '/') . '/reset-password?token=' . $token
                . '&email=' . urlencode($user->getEmailForPasswordReset())
        );

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(5)
                ->by('pw:' . strtolower((string) $request->input('email')) . '|' . $request->ip());
        });

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')) . '|' . $request->ip());
        });

        RateLimiter::for('ytdlp', function (Request $request) {
            return Limit::perMinute(20)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('play', fn(Request $request) =>
            Limit::perMinute(30)->by($request->user()?->id ?: $request->ip())
        );

        RateLimiter::for('api', fn(Request $request) =>
            Limit::perMinute(60)->by($request->user()?->id ?: $request->ip())
        );

        RateLimiter::for('audio', fn(Request $request) =>
            Limit::perMinute(300)->by('audio:' . $request->ip())
        );
    }
}
