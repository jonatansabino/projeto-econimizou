<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthRateLimit implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $action = $arguments[0] ?? 'login';
        $window = 900;
        $factor = ENVIRONMENT === 'testing' ? max(1, config('AuthApi')->testRateMultiplier) : 1;
        $limits = [[$action . ':ip:' . $request->getIPAddress(), ($action === 'login' ? 30 : 10) * $factor]];
        try {
            $payload = $request->getJSON(true) ?? [];
        } catch (\Throwable) {
            $payload = [];
        }
        if ($action === 'login') {
            $email = is_array($payload) && is_string($payload['email'] ?? null) ? strtolower(trim($payload['email'])) : '';
            $limits[] = ['login:email:' . $email, 5 * $factor];
        }
        $db = db_connect();
        $now = time();
        $start = (int) (floor($now / $window) * $window);
        foreach ($limits as [$key, $maximum]) {
            $hash = hash('sha256', $key);
            $db->query('INSERT INTO auth_rate_limits (key_hash,hits,window_start) VALUES (?,1,?) ON DUPLICATE KEY UPDATE hits=IF(window_start=VALUES(window_start),hits+1,1),window_start=VALUES(window_start)', [$hash, $start]);
            $row = $db->table('auth_rate_limits')->where('key_hash', $hash)->get()->getRowArray();
            if ((int) $row['hits'] > $maximum) {
                return service('response')->setStatusCode(429)->setHeader('Retry-After', (string) ($start + $window - $now))->setJSON(['message' => 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.']);
            }
        }
        $db->table('auth_rate_limits')->where('window_start <', $start - 86400)->delete();
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
    }
}
