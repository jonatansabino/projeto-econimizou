<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Throwable;

class Health extends BaseController
{
    public function index(): ResponseInterface
    {
        try {
            Database::connect()->query('SELECT 1');
        } catch (Throwable $exception) {
            log_message('error', 'Falha na verificação de conexão do health check: {message}', [
                'message' => $exception->getMessage(),
            ]);

            return $this->response->setStatusCode(503)->setJSON([
                'status'   => 'error',
                'service'  => 'economizou-api',
                'database' => 'unavailable',
            ]);
        }

        return $this->response->setJSON([
            'status'   => 'ok',
            'service'  => 'economizou-api',
            'database' => 'connected',
        ]);
    }
}
