<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => $request->user(),
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user      = $request->user();
        $data      = $request->safe()->only(['name']);
        $oldAvatar = $user->getRawOriginal('avatar_url');

        if ($request->hasFile('avatar')) {
            $data['avatar_url'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($data);

        if (isset($data['avatar_url']) && $oldAvatar) {
            Storage::disk('public')->delete($oldAvatar);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $user->fresh(),
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Kata sandi lama salah.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        // Keluarkan perangkat lain; token yang sedang dipakai tetap berlaku
        $user->tokens()
            ->where('id', '!=', $user->currentAccessToken()->id)
            ->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Kata sandi berhasil diubah.',
        ]);
    }
}
