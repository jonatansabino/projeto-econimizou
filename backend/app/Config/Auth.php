<?php

namespace Config;

use CodeIgniter\Shield\Config\Auth as ShieldAuth;

class Auth extends ShieldAuth
{
    // Cadastro REST usa o UserModel oficial. As rotas HTML do Shield não são usadas.
    public bool $allowRegistration = true;
}
