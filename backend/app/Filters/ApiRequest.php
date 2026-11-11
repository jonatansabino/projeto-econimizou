<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ApiRequest implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (ENVIRONMENT === 'production' && ! $request->isSecure()) {
            return service('response')->setStatusCode(400)->setJSON(['message' => 'Utilize HTTPS para acessar a API.']);
        }
        if ($request->getHeaderLine('X-Auth-Client') === 'web') {
            if (! in_array($request->getHeaderLine('Origin'), config('AuthApi')->origins(), true)) {
                return service('response')->setStatusCode(403)->setJSON(['message' => 'Origem não autorizada.']);
            }
            if (! in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
                $cookie = $request->getCookie('economizou_csrf');
                $header = $request->getHeaderLine('X-CSRF-Token');
                if (! is_string($cookie) || strlen($cookie) !== 64 || ! hash_equals($cookie, $header)) {
                    return service('response')->setStatusCode(403)->setJSON(['message' => 'Não foi possível validar esta solicitação. Recarregue e tente novamente.', 'code' => 'csrf_invalid']);
                }
            }
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null): void
    {
        $response->setHeader('Cache-Control', 'no-store, private')->setHeader('Pragma', 'no-cache');
    }
}
