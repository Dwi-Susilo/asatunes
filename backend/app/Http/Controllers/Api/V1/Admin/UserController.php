<?php
namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $users = User::query()
            ->latest()
            ->paginate($validated['per_page'] ?? 15);

        return response()->json([
            'status' => 'success',
            'data'   => $users->items(),
            'meta'   => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    public function block(Request $request, User $user): JsonResponse
    {
        if ($r = $this->guardSelf($request, $user, 'memblokir')) {
            return $r;
        }

        $user->update(['status' => 'blocked']);
        $user->tokens()->delete();

        return $this->ok('Akun berhasil diblokir.', $user);
    }

    public function unblock(User $user): JsonResponse
    {
        $user->update(['status' => 'active']);

        return $this->ok('Blokir akun dibuka.', $user);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'in:admin,user'],
        ]);

        if ($validated['role'] === 'user') {
            if ($r = $this->guardSelf($request, $user, 'menurunkan role')) {
                return $r;
            }
            if ($r = $this->guardLastAdmin($user, 'menurunkan role')) {
                return $r;
            }
        }

        $user->update(['role' => $validated['role']]);

        return $this->ok('Role berhasil diubah.', $user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($r = $this->guardSelf($request, $user, 'menghapus')) {
            return $r;
        }
        if ($r = $this->guardLastAdmin($user, 'menghapus')) {
            return $r;
        }

        $avatar = $user->getRawOriginal('avatar_url');

        $user->tokens()->delete();
        $user->delete();

        if ($avatar) {
            Storage::disk('public')->delete($avatar);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Akun berhasil dihapus.',
        ]);
    }

    private function ok(string $message, User $user): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => $user->fresh(),
        ]);
    }

    private function guardSelf(Request $request, User $user, string $aksi): ?JsonResponse
    {
        if ($request->user()->is($user)) {
            return response()->json([
                'status'  => 'error',
                'message' => "Anda tidak dapat {$aksi} akun Anda sendiri.",
            ], 422);
        }

        return null;
    }

    private function guardLastAdmin(User $user, string $aksi): ?JsonResponse
    {
        if ($user->isAdmin() && User::where('role', 'admin')->count() <= 1) {
            return response()->json([
                'status'  => 'error',
                'message' => "Tidak dapat {$aksi} admin terakhir.",
            ], 422);
        }

        return null;
    }
}
