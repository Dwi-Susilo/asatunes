<?php

return [
    'binary'         => env('YTDLP_BINARY', 'yt-dlp'),
    'js_runtime'     => env('YTDLP_JS_RUNTIME', 'node'),
    'timeout'        => (int) env('YTDLP_TIMEOUT', 30),
    'max_concurrent' => (int) env('YTDLP_MAX_CONCURRENT', 3),
];
