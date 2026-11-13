<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserPreferenceModel;
use CodeIgniter\I18n\Time;
use CodeIgniter\Shield\Entities\User;
use CodeIgniter\Shield\Models\LoginModel;
use CodeIgniter\Shield\Models\UserModel;
use Throwable;

class AuthController extends BaseController
{
    private function payload(): ?array
    {
        try {
            $value = $this->request->getJSON(true);
            return is_array($value) && ! array_is_list($value) ? $value : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function failure(string $message, int $status = 422, array $errors = [])
    {
        return $this->response->setStatusCode($status)->setJSON(['message' => $message, 'errors' => $errors]);
    }

    private function validateCredentials(array &$data, bool $register): bool
    {
        foreach ($register ? ['name', 'email', 'password', 'password_confirmation'] : ['email', 'password'] as $field) {
            if (! is_string($data[$field] ?? null)) {
                return false;
            }
        }
        if (is_string($data['email'] ?? null)) {
            $data['email'] = strtolower(trim($data['email']));
        }
        if ($register && is_string($data['name'] ?? null)) {
            $data['name'] = trim($data['name']);
        }
        $rules = ['email' => 'required|valid_email|max_length[254]', 'password' => 'required|min_length[8]|max_byte[72]'];
        if ($register) {
            $rules += ['name' => 'required|max_length[60]', 'password_confirmation' => 'required|matches[password]'];
        }
        return $this->validateData($data, $rules, [
            'name' => ['required' => 'Informe seu nome.', 'max_length' => 'Use até 60 caracteres no nome.'],
            'email' => ['required' => 'Informe seu e-mail.', 'valid_email' => 'Informe um e-mail válido.'],
            'password' => ['required' => 'Informe sua senha.', 'min_length' => 'Use pelo menos 8 caracteres.', 'max_byte' => 'A senha ultrapassa o limite de 72 bytes.'],
            'password_confirmation' => ['required' => 'Confirme sua senha.', 'matches' => 'As senhas precisam ser iguais.'],
        ]);
    }

    private function userData(User $user): array
    {
        $profile = db_connect()->table('user_preferences')->where('user_id', $user->id)->get()->getRowArray();
        return [
            'id' => (string) $user->id,
            'name' => $profile['display_name'] ?? $user->username ?? 'Você',
            'email' => $user->email,
            'avatar' => $profile['avatar'] ?? 'dicebear:adventurer:1',
            'personalization' => [
                'birth_date' => $profile['birth_date'] ?? null,
                'financial_objective' => $profile['financial_objective'] ?? null,
                'monthly_income_cents' => isset($profile['monthly_income_cents']) ? (int) $profile['monthly_income_cents'] : null,
                'completed' => (bool) ($profile['personalization_completed'] ?? true),
            ],
        ];
    }

    private function authenticated(User $user, int $status = 200)
    {
        $expires = Time::now()->addSeconds(config('AuthApi')->tokenLifetime);
        $token = $user->generateAccessToken('economizou-app', ['api'], $expires);
        $data = ['user' => $this->userData($user), 'expires_at' => $expires->format(DATE_ATOM)];
        if ($this->request->getHeaderLine('X-Auth-Client') === 'web') {
            $this->cookie('economizou_session', $token->raw_token, config('AuthApi')->tokenLifetime);
        } else {
            $data['access_token'] = $token->raw_token;
            $data['token_type'] = 'Bearer';
        }
        return $this->response->setStatusCode($status)->setJSON($data);
    }

    private function cookie(string $name, string $value, int $seconds): void
    {
        $this->response->setCookie(['name' => $name, 'value' => $value, 'expire' => $seconds,
            'path' => '/api', 'secure' => ENVIRONMENT === 'production' || $this->request->isSecure(), 'httponly' => true, 'samesite' => 'Lax']);
    }

    public function csrf()
    {
        if ($this->request->getHeaderLine('X-Auth-Client') !== 'web') {
            return $this->failure('Solicitação inválida.', 400);
        }
        $token = $this->request->getCookie('economizou_csrf');
        if (! is_string($token) || ! preg_match('/^[a-f0-9]{64}$/D', $token)) {
            $token = bin2hex(random_bytes(32));
        }
        $this->cookie('economizou_csrf', $token, config('AuthApi')->tokenLifetime);
        return $this->response->setJSON(['csrf_token' => $token]);
    }

    public function register()
    {
        if (! setting('Auth.allowRegistration')) {
            return $this->failure('Cadastro temporariamente indisponível.', 403);
        }
        $data = $this->payload();
        if ($data === null || ! $this->validateCredentials($data, true)) {
            return $this->failure('Confira os dados informados.', 422, $this->validator?->getErrors() ?? []);
        }
        $users = new UserModel();
        if ($users->findByCredentials(['email' => $data['email']]) !== null) {
            return $this->failure('Este e-mail já está cadastrado.', 409, ['email' => 'Este e-mail já está cadastrado.']);
        }
        $db = db_connect();
        $db->transBegin();
        try {
            $user = new User(['email' => $data['email'], 'password' => $data['password'], 'active' => 1]);
            $passwordCheck = service('passwords')->check($data['password'], $user);
            if (! $passwordCheck->isOK()) {
                $db->transRollback();
                return $this->failure('Escolha uma senha mais forte.', 422, ['password' => 'Evite dados pessoais, sequências e senhas comuns.']);
            }
            if (! $users->save($user)) {
                $db->transRollback();
                return $this->failure('Não foi possível criar a conta.', 422);
            }
            $user = $users->findById($users->getInsertID());
            $db->table('user_preferences')->insert(['user_id' => $user->id, 'display_name' => $data['name'], 'avatar' => 'dicebear:adventurer:1', 'personalization_completed' => 0]);
            $response = $this->authenticated($user, 201);
            if (! $db->transStatus()) {
                throw new \RuntimeException('registration_failed');
            }
            $db->transCommit();
            return $response;
        } catch (Throwable) {
            $db->transRollback();
            // Não registrar payloads, credenciais ou tokens, nem em desenvolvimento.
            return $this->failure('Não foi possível criar a conta. Verifique o e-mail e tente novamente.', 409);
        }
    }

    public function login()
    {
        $data = $this->payload();
        if ($data === null || ! $this->validateCredentials($data, false)) {
            return $this->failure('Informe um e-mail e uma senha válidos.', 422, $this->validator?->getErrors() ?? []);
        }
        $result = auth('session')->getAuthenticator()->check(['email' => $data['email'], 'password' => $data['password']]);
        $user = $result->isOK() ? $result->extraInfo() : null;
        $valid = $user !== null && $user->active && $user->isActivated() && ! $user->isBanned();
        (new LoginModel())->recordLoginAttempt('email_password', $data['email'], $valid, $this->request->getIPAddress(), (string) $this->request->getUserAgent(), $valid ? $user->id : null);
        if (! $valid) {
            return $this->failure('E-mail ou senha incorretos.', 401);
        }
        return $this->authenticated($user);
    }

    public function me()
    {
        $user = auth('tokens')->user();
        return $this->response->setJSON(['user' => $this->userData($user), 'expires_at' => $user->currentAccessToken()?->expires?->format(DATE_ATOM)]);
    }

    public function logout()
    {
        $user = auth('tokens')->user();
        $token = $user->currentAccessToken();
        $user->revokeAccessTokenBySecret($token->secret);
        $this->cookie('economizou_session', '', -3600);
        return $this->response->setJSON(['message' => 'Sessão encerrada.']);
    }

    public function profile()
    {
        $data = $this->payload();
        $allowed = ['name', 'avatar', 'birth_date', 'financial_objective', 'monthly_income_cents', 'personalization_completed'];
        if ($data === null || $data === [] || array_diff(array_keys($data), $allowed) !== []) {
            return $this->failure('Informe apenas os campos do seu perfil.', 422);
        }
        $errors = \App\Libraries\ProfilePersonalization::errors($data);
        if (array_key_exists('name', $data) && (! is_string($data['name']) || trim($data['name']) === '' || mb_strlen(trim($data['name'])) > 60)) $errors['name'] = 'Informe seu nome, com até 60 caracteres.';
        if (array_key_exists('avatar', $data) && (! is_string($data['avatar']) || ! preg_match('/^dicebear:adventurer:(?:[1-9]|1[0-2])$/D', $data['avatar']))) $errors['avatar'] = 'Escolha um avatar válido.';
        if ($errors !== []) return $this->failure('Confira os dados do perfil.', 422, $errors);
        $model = new UserPreferenceModel();
        $current = $model->first();
        $row = $data;
        if (isset($row['name'])) { $row['display_name'] = trim($row['name']); unset($row['name']); }
        $result = $current ? $model->update($current['id'], $row) : $model->insert($row);
        if ($result === false) {
            return $this->failure('Não foi possível salvar o perfil.', 422);
        }
        return $this->me();
    }
}
