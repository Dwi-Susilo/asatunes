<?php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
}
