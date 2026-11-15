<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Identitas opsional untuk endpoint musik yang terbuka (SRS 4.1, keputusan K1).
 *
 * - Token Sanctum valid dan akun tidak diblokir: permintaan dikenali sebagai Pengguna.
 * - Tanpa token, token tidak valid, kedaluwarsa, atau milik akun diblokir:
 *   permintaan diperlakukan sebagai Pengunjung. Tidak pernah menjawab 401 atau 403.
 *
 * Guard bawaan aplikasi adalah "web", jadi $request->user() tidak terisi untuk
 * pemegang Bearer token pada rute tanpa auth:sanctum. Middleware ini memakai guard
 * "sanctum" secara eksplisit lalu mengisi pengenal pengguna pada request.
 */
class IdentifyUserIfPresent
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('sanctum')->user();

        if ($user && ! $user->isBlocked()) {
            $request->setUserResolver(fn () => $user);
        } else {
            $request->setUserResolver(fn () => null);
        }

        return $next($request);
    }
}
