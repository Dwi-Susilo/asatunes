<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated())->fresh();

        return response()->json([
            'status' => 'success',
            'data'   => $user,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email atau kata sandi salah.',
            ], 401);
        }

        if ($user->isBlocked()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun Anda telah diblokir.',
            ], 403);
        }

        $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user'  => $user,
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Berhasil logout.',
        ]);
    }

    /**
     * Lupa password (SRS 3.1, keputusan D13). Jawabannya selalu sama, baik email terdaftar
     * maupun tidak, supaya orang tidak bisa menebak siapa yang punya akun. Akun blocked
     * tidak dikirimi email.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if ($user && ! $user->isBlocked()) {
            Password::sendResetLink(['email' => $user->email]);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Jika email terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if ($user && $user->isBlocked()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Akun Anda telah diblokir.',
            ], 403);
        }

        $status = Password::reset(
            $request->only('email', 'token', 'password'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete(); // semua perangkat harus login ulang
                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Token tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Kata sandi berhasil diatur ulang.',
        ]);
    }
}
