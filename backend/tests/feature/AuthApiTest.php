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
    public function testPersonalizationIsOptionalPersistentAndScopedToCurrentUser(): void
    {
        $first = $this->registerUser();
        $this->assertFalse($first['user']['personalization']['completed']);
        $this->assertNull($first['user']['personalization']['monthly_income_cents']);
        $headers = ['Authorization' => 'Bearer ' . $first['access_token']];
        $second = json_decode($this->requestJson('POST', '/api/auth/register', array_replace($this->credentials(), ['email' => 'other@example.test']))->getJSON(), true);
        $patch = ['birth_date' => '2000-02-29', 'financial_objective' => 'achievement', 'monthly_income_cents' => 520000, 'personalization_completed' => true];
        $saved = $this->requestJson('PATCH', '/api/auth/profile', $patch, $headers);
        $saved->assertStatus(200);
        $profile = json_decode($saved->getJSON(), true)['user']['personalization'];
        $this->assertSame('2000-02-29', $profile['birth_date']);
        $this->assertSame(520000, $profile['monthly_income_cents']);
        $this->assertTrue($profile['completed']);
        $other = $this->requestJson('GET', '/api/auth/me', [], ['Authorization' => 'Bearer ' . $second['access_token']]);
        $this->assertNull(json_decode($other->getJSON(), true)['user']['personalization']['birth_date']);
        $this->requestJson('PATCH', '/api/auth/profile', ['user_id' => $second['user']['id'], 'monthly_income_cents' => 1], $headers)->assertStatus(422);
        $again = $this->requestJson('GET', '/api/auth/me', [], $headers);
        $this->assertSame($profile, json_decode($again->getJSON(), true)['user']['personalization']);
        $clear = $this->requestJson('PATCH', '/api/auth/profile', ['birth_date' => null, 'financial_objective' => null, 'monthly_income_cents' => null], $headers);
        $clear->assertStatus(200);
        $this->assertNull(json_decode($clear->getJSON(), true)['user']['personalization']['monthly_income_cents']);
        $this->assertSame(0, $this->db->table('transactions')->countAllResults());
    }

    public function testInvalidPersonalizationCannotReplaceSavedData(): void
    {
        $data = $this->registerUser();
        $headers = ['Authorization' => 'Bearer ' . $data['access_token']];
        foreach ([['birth_date' => "2000-01-01\0"], ['birth_date' => '2001-02-29'], ['birth_date' => date('Y-m-d', strtotime('+1 day'))], ['birth_date' => ['2000-01-01']], ['financial_objective' => 'unknown'], ['monthly_income_cents' => -1], ['monthly_income_cents' => 1.5], ['monthly_income_cents' => '520000'], ['monthly_income_cents' => 9007199254740992], ['personalization_completed' => 'yes']] as $invalid) {
            $result = $this->requestJson('PATCH', '/api/auth/profile', $invalid, $headers);
            $result->assertStatus(422);
            $this->assertNotEmpty(json_decode($result->getJSON(), true)['errors']);
        }
        $this->requestJson('PATCH', '/api/auth/profile', ['personalization_completed' => true], $headers)->assertStatus(200);
        $me = $this->requestJson('GET', '/api/auth/me', [], $headers);
        $this->assertTrue(json_decode($me->getJSON(), true)['user']['personalization']['completed']);
        $this->assertNull(json_decode($me->getJSON(), true)['user']['personalization']['birth_date']);
    }

    public function testLegacyPreferencesDefaultToCompletedAndShieldRejectsCommonPassword(): void
    {
        $weak = array_replace($this->credentials(), ['password' => '12345678', 'password_confirmation' => '12345678']);
        $this->requestJson('POST', '/api/auth/register', $weak)->assertStatus(422);
        $this->assertSame(0, $this->db->table('users')->countAllResults());
        $users = new UserModel();
        $users->save(new \CodeIgniter\Shield\Entities\User(['email' => 'legacy@example.test', 'password' => 'RioVerde!7824#', 'active' => 1]));
        $id = $users->getInsertID();
        $this->db->table('user_preferences')->insert(['user_id' => $id, 'display_name' => 'Perfil antigo', 'avatar' => 'dicebear:adventurer:1']);
        $row = $this->db->table('user_preferences')->where('user_id', $id)->get()->getRowArray();
        $this->assertSame(1, (int) $row['personalization_completed']);
    }

}
