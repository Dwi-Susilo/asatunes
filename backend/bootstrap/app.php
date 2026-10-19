<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'not.blocked' => \App\Http\Middleware\EnsureUserIsNotBlocked::class,
            'admin'       => \App\Http\Middleware\EnsureUserIsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Semua request ke /api/* selalu dijawab JSON, walau tanpa header Accept
        $exceptions->shouldRenderJsonWhen(
            fn(Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson()
        );

        $error = fn(string $message, int $status, array $extra = [], array $headers = []) =>
        response()->json(['status' => 'error', 'message' => $message] + $extra, $status, $headers);

        // 422: validasi gagal
        $exceptions->render(function (ValidationException $e, Request $request) use ($error) {
            if ($request->is('api/*')) {
                return $error('Data yang dikirim tidak valid.', 422, ['errors' => $e->errors()]);
            }
        });

        // 401: belum login / token tidak valid
        $exceptions->render(function (AuthenticationException $e, Request $request) use ($error) {
            if ($request->is('api/*')) {
                return $error('Anda belum login atau token tidak valid.', 401);
            }
        });

        // 403, 404, 405, 429, dan error HTTP lainnya
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($error) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status  = $e->getStatusCode();
            $message = match ($status) {
                403     => 'Anda tidak memiliki akses ke sumber daya ini.',
                404     => 'Sumber daya tidak ditemukan.',
                405     => 'Metode HTTP tidak diizinkan.',
                429     => 'Terlalu banyak permintaan. Coba lagi nanti.',
                default => 'Terjadi kesalahan pada permintaan.',
            };

            return $error($message, $status, [], $e->getHeaders());
        });

        // 500: error tak terduga. Detail hanya di log, bukan di respons
        $exceptions->render(function (Throwable $e, Request $request) use ($error) {
            if ($request->is('api/*') && ! config('app.debug')) {
                return $error('Terjadi kesalahan pada server.', 500);
            }
        });
    })->create();
