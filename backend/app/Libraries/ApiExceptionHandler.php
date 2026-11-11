<?php

namespace App\Libraries;

use CodeIgniter\Debug\ExceptionHandlerInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class ApiExceptionHandler implements ExceptionHandlerInterface
{
    public function handle(Throwable $exception, RequestInterface $request, ResponseInterface $response, int $statusCode, int $exitCode): void
    {
        $response->setStatusCode($statusCode)->setHeader('Cache-Control', 'no-store')
            ->setJSON(['message' => $statusCode === 404 ? 'Recurso não encontrado.' : 'Não foi possível concluir a solicitação. Tente novamente.'])->send();
    }
}
