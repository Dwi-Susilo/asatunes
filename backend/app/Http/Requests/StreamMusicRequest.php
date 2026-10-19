<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StreamMusicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'query' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{11}$/'],
        ];
    }
}
