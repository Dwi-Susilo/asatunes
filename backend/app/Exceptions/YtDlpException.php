<?php
namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

class YtDlpException extends RuntimeException
{
    public function render(): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => 'Layanan musik sedang tidak tersedia. Coba lagi nanti.',
        ], 503);
    }
}
