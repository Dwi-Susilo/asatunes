<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SavePlaylistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Buat baru: wajib. Ubah (PATCH): hanya divalidasi kalau dikirim.
            'title'       => [$this->isMethod('POST') ? 'required' : 'sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
