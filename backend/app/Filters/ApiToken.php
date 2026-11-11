<?php

namespace App\Filters;

use CodeIgniter\Shield\Filters\TokenAuth;
use CodeIgniter\HTTP\RequestInterface;

class ApiToken extends TokenAuth
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if ($request->getHeaderLine('Authorization') === '' && $request->getHeaderLine('X-Auth-Client') === 'web') {
            $cookie = $request->getCookie('economizou_session');
            if (is_string($cookie) && preg_match('/^[a-zA-Z0-9]+$/D', $cookie)) {
                $request->setHeader('Authorization', 'Bearer ' . $cookie);
            }
        }
        try {
            $response = parent::before($request, ['api']);
        } catch (\CodeIgniter\Database\Exceptions\DatabaseException) {
            return service('response')->setStatusCode(503)->setJSON(['message' => 'O serviço está indisponível. Tente novamente.']);
        } catch (\Throwable) {
            // Identidade revogada/usuário removido: não expor detalhes internos.
            $response = service('response')->setStatusCode(401);
        }
        if ($response === null && ! auth('tokens')->user()?->active) {
            $response = service('response')->setStatusCode(401);
        }
        if ($response !== null) {
            return $response->setStatusCode(401)->setJSON(['message' => 'Sua sessão expirou ou não é válida. Entre novamente.', 'code' => 'unauthenticated']);
        }
    }
}
