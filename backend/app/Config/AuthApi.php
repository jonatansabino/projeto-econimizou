<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class AuthApi extends BaseConfig
{
    public int $tokenLifetime = 86400;
    public string $webOrigins = 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:8097,http://127.0.0.1:8097';
    public int $testRateMultiplier = 1;

    public function origins(): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $this->webOrigins)), static fn ($origin) => $origin !== '' && $origin !== '*' && (ENVIRONMENT !== 'production' || str_starts_with($origin, 'https://'))));
    }
}
