<?php
namespace App\Http\Requests;

use App\Support\GoogleVideoUrl;
use Illuminate\Foundation\Http\FormRequest;

class ProxyAudioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'url' => [
                'required',
                'string',
                'max:4096',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (! GoogleVideoUrl::isValid($value)) {
                        $fail('URL audio tidak diizinkan.');
                    }
                },
            ],
        ];
    }
}
