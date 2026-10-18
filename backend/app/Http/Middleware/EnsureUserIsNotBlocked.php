<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsNotBlocked
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isBlocked()) {
            $user->tokens()->delete();

            return response()->json([
                'status'  => 'error',
                'message' => 'Akun Anda telah diblokir.',
            ], 403);
        }

        return $next($request);

    }
}
