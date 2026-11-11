<?php

namespace Tests\Feature;

use CodeIgniter\I18n\Time;
use CodeIgniter\Shield\Models\UserModel;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

class AuthApiTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = null;
    protected $refresh = true;

    private function credentials(): array
    {
        return ['name' => 'Jonatan Teste', 'email' => 'jonatan@example.test', 'password' => 'RioVerde!7824#', 'password_confirmation' => 'RioVerde!7824#'];
    }

    private function requestJson(string $method, string $path, array $data = [], array $headers = [])
    {
        return $this->withHeaders(['Accept' => 'application/json'] + $headers)->withBodyFormat('json')->call($method, $path, $data);
    }

    private function registerUser(): array
    {
        $result = $this->requestJson('POST', '/api/auth/register', $this->credentials());
        $result->assertStatus(201);
        return json_decode($result->getJSON(), true);
    }

    public function testRegistrationUsesShieldIdentityAndReturnsOnlySafeFields(): void
    {
        $result = $this->registerUser();
        $this->assertSame('Jonatan Teste', $result['user']['name']);
        $this->assertSame('jonatan@example.test', $result['user']['email']);
        $this->assertNotEmpty($result['expires_at']);
        $this->assertArrayNotHasKey('password', $result['user']);
        $identity = $this->db->table('auth_identities')->where('type', 'email_password')->get()->getRowArray();
        $this->assertNotSame($this->credentials()['password'], $identity['secret2']);
        $this->assertTrue(service('passwords')->verify($this->credentials()['password'], $identity['secret2']));
        $token = $this->db->table('auth_identities')->where('type', 'access_token')->get()->getRowArray();
        $this->assertNotSame($result['access_token'], $token['secret']);
        $this->assertSame(1, $this->db->table('user_preferences')->countAllResults());
    }

    public function testInvalidRegistrationAndDuplicateEmailDoNotCreateExtraUsers(): void
    {
        foreach ([[], ['email' => 'inválido'], array_replace($this->credentials(), ['password_confirmation' => 'outra']), array_replace($this->credentials(), ['password' => ['não']])] as $invalid) {
            $this->requestJson('POST', '/api/auth/register', $invalid)->assertStatus(422);
        }
        $this->registerUser();
        $this->requestJson('POST', '/api/auth/register', array_replace($this->credentials(), ['email' => ' JONATAN@example.test ']))->assertStatus(409);
        $this->assertSame(1, $this->db->table('users')->countAllResults());
    }

    public function testLoginAndBearerMe(): void
    {
        $this->registerUser();
        $this->requestJson('POST', '/api/auth/login', ['email' => 'jonatan@example.test', 'password' => 'errada123'])->assertStatus(401);
        $login = $this->requestJson('POST', '/api/auth/login', $this->credentials());
        $login->assertStatus(200);
        $token = json_decode($login->getJSON(), true)['access_token'];
        $me = $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer ' . $token]);
        $me->assertStatus(200);
        $this->assertSame('Jonatan Teste', json_decode($me->getJSON(), true)['user']['name']);
        $this->assertSame(2, $this->db->table('auth_logins')->countAllResults());
    }

    public function testMissingBadExpiredAndWrongScopeTokensAreRejected(): void
    {
        $this->requestJson('GET', '/api/auth/me')->assertStatus(401);
        $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer invalido'])->assertStatus(401);
        $data = $this->registerUser();
        $user = (new UserModel())->findById($data['user']['id']);
        $expired = $user->generateAccessToken('expired', ['api'], Time::now()->subSeconds(2));
        $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer ' . $expired->raw_token])->assertStatus(401);
        $wrong = $user->generateAccessToken('wrong-scope', ['another'], Time::now()->addMinutes(5));
        $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer ' . $wrong->raw_token])->assertStatus(401);
    }

    public function testLogoutRevokesOnlyCurrentToken(): void
    {
        $data = $this->registerUser();
        $other = json_decode($this->requestJson('POST', '/api/auth/login', $this->credentials())->getJSON(), true)['access_token'];
        $headers = ['Authorization' => 'Bearer ' . $data['access_token']];
        $this->requestJson('POST', '/api/auth/logout', [], $headers)->assertStatus(200);
        $this->requestJson('GET', '/api/auth/me', [], $headers)->assertStatus(401);
        $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer ' . $other])->assertStatus(200);
    }

    public function testLoginRateLimitReturnsRetryAfter(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->requestJson('POST', '/api/auth/login', $this->credentials())->assertStatus(401);
        }
        $result = $this->requestJson('POST', '/api/auth/login', $this->credentials());
        $result->assertStatus(429);
        $this->assertGreaterThan(0, (int) $result->response()->getHeaderLine('Retry-After'));
    }

    public function testWebCsrfAndHttpOnlySessionDoNotExposeBearerInJson(): void
    {
        $headers = ['X-Auth-Client' => 'web', 'Origin' => 'http://127.0.0.1:8097'];
        $this->requestJson('POST', '/api/auth/register', $this->credentials(), $headers)->assertStatus(403);
        $csrfResult = $this->requestJson('GET', '/api/auth/csrf', [], $headers);
        $csrfResult->assertStatus(200);
        $csrf = json_decode($csrfResult->getJSON(), true)['csrf_token'];
        $_COOKIE['economizou_csrf'] = $csrf;
        service('superglobals')->setCookie('economizou_csrf', $csrf);
        $response = $this->requestJson('POST', '/api/auth/register', $this->credentials(), $headers + ['X-CSRF-Token' => $csrf]);
        $response->assertStatus(201);
        $this->assertArrayNotHasKey('access_token', json_decode($response->getJSON(), true));
        $cookie = $response->response()->getCookie('economizou_session');
        $this->assertTrue($cookie->isHTTPOnly());
        $_COOKIE['economizou_session'] = $cookie->getValue();
        service('superglobals')->setCookie('economizou_session', $cookie->getValue());
        $this->requestJson('GET', '/api/auth/me', [], $headers)->assertStatus(200);
        $this->requestJson('POST', '/api/auth/logout', [], $headers)->assertStatus(403);
        $this->requestJson('GET', '/api/auth/me', [], array_replace($headers, ['Origin' => 'https://untrusted.example']))->assertStatus(403);
        unset($_COOKIE['economizou_csrf'], $_COOKIE['economizou_session']);
        service('superglobals')->unsetCookie('economizou_csrf')->unsetCookie('economizou_session');
    }

    public function testProfileUpdatesNameAndAvatarForCurrentAccount(): void
    {
        $data = $this->registerUser();
        $headers = ['Authorization' => 'Bearer ' . $data['access_token']];
        $response = $this->requestJson('PATCH', '/api/auth/profile', ['name' => 'Nome novo', 'avatar' => 'dicebear:adventurer:2'], $headers);
        $response->assertStatus(200);
        $this->assertSame('Nome novo', json_decode($response->getJSON(), true)['user']['name']);
        $this->assertSame('dicebear:adventurer:2', json_decode($response->getJSON(), true)['user']['avatar']);
        $this->requestJson('PATCH', '/api/auth/profile', ['name' => '', 'avatar' => 'inválido'], $headers)->assertStatus(422);
    }

    public function testInactiveUserCannotLoginOrUseAnExistingToken(): void
    {
        $data = $this->registerUser();
        $this->db->table('users')->where('id', $data['user']['id'])->update(['active' => 0]);
        $this->requestJson('POST', '/api/auth/login', $this->credentials())->assertStatus(401);
        $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer ' . $data['access_token']])->assertStatus(401);
    }

    public function testRegistrationCanBeDisabledThroughShieldConfiguration(): void
    {
        config('Auth')->allowRegistration = false;
        $this->requestJson('POST', '/api/auth/register', $this->credentials())->assertStatus(403);
        $this->assertSame(0, $this->db->table('users')->countAllResults());
    }
}
