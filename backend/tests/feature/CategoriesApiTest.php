<?php

namespace Tests\Feature;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

class CategoriesApiTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;
    protected $namespace = null;
    protected $refresh = true;

    private function json(string $method, string $path, array $data = [], array $headers = [])
    {
        if (isset($headers['Authorization']) && str_starts_with($path, '/api/categories') && in_array($method, ['POST','PATCH','DELETE'], true)) {
            $finance = $this->withHeaders(['Accept'=>'application/json','Authorization'=>$headers['Authorization']])->call('GET','/api/finance');
            $headers['X-Finance-Reset'] = json_decode($finance->getJSON(), true)['resetKey'];
        }
        return $this->withHeaders(['Accept' => 'application/json'] + $headers)->withBodyFormat('json')->call($method, $path, $data);
    }
    private function account(string $email): array
    {
        $r = $this->json('POST', '/api/auth/register', ['name' => 'Teste', 'email' => $email, 'password' => 'RioVerde!7824#', 'password_confirmation' => 'RioVerde!7824#']);
        $r->assertStatus(201); return json_decode($r->getJSON(), true);
    }
    private function headers(array $account): array { return ['Authorization' => 'Bearer ' . $account['access_token'], 'X-Account-ID' => $account['user']['id']]; }
    private function create(array $account, string $key = 'category-one', string $name = 'Educação'): array
    {
        $r = $this->json('POST', '/api/categories', ['name' => $name, 'type' => 'expense', 'client_key' => $key], $this->headers($account));
        $r->assertStatus(201); return json_decode($r->getJSON(), true)['category'];
    }
    public function testAuthenticationValidationAndOwnerInjection(): void
    {
        $this->json('GET', '/api/categories')->assertStatus(401);
        $this->json('POST', '/api/categories')->assertStatus(401);
        $a = $this->account('a@example.test');
        foreach ([[], ['name' => [], 'type' => 'expense', 'client_key' => 'x'], ['name' => 'Teste', 'type' => 'bad', 'client_key' => 'x'], ['name' => 'Teste', 'type' => 'expense', 'client_key' => 'x', 'user_id' => 123]] as $invalid) $this->json('POST', '/api/categories', $invalid, $this->headers($a))->assertStatus(422);
        $this->assertSame(0, $this->db->table('categories')->countAllResults());
    }
    public function testCategoriesAreIsolatedForReadUpdateAndDelete(): void
    {
        $a = $this->account('a@example.test'); $cat = $this->create($a);
        $b = $this->account('b@example.test');
        $list = $this->json('GET', '/api/categories', [], $this->headers($b)); $list->assertStatus(200);
        $this->assertSame([], json_decode($list->getJSON(), true)['categories']);
        $this->json('PATCH', '/api/categories/' . $cat['id'], ['name' => 'Ataque', 'type' => 'expense'], $this->headers($b))->assertStatus(404);
        $this->json('DELETE', '/api/categories/' . $cat['id'], [], $this->headers($b))->assertStatus(404);
        $own = $this->create($b); $this->assertNotSame($cat['id'], $own['id']);
        $this->assertSame(2, $this->db->table('categories')->countAllResults());
    }
    public function testIdempotenceNameUniquenessAndFixedType(): void
    {
        $a = $this->account('a@example.test'); $cat = $this->create($a);
        foreach (['category-one', 'another-key'] as $key) {
            $r = $this->json('POST', '/api/categories', ['name' => 'Educação', 'type' => 'expense', 'client_key' => $key], $this->headers($a)); $r->assertStatus(200);
            $this->assertSame($cat['id'], json_decode($r->getJSON(), true)['category']['id']);
        }
        $this->assertSame(1, $this->db->table('categories')->countAllResults());
        $this->json('PATCH', '/api/categories/' . $cat['id'], ['name' => 'Educação', 'type' => 'income'], $this->headers($a))->assertStatus(422);
        $this->json('PATCH', '/api/categories/' . $cat['id'], ['name' => 'Cursos', 'type' => 'expense'], $this->headers($a))->assertStatus(200);
    }
    public function testDeleteKeepsTombstoneAndAllowsExplicitRecreation(): void
    {
        $a = $this->account('a@example.test'); $cat = $this->create($a);
        $this->json('DELETE', '/api/categories/' . $cat['id'], [], $this->headers($a))->assertStatus(200);
        $this->json('DELETE', '/api/categories/' . $cat['id'], [], $this->headers($a))->assertStatus(200);
        $this->assertSame(1, $this->db->table('categories')->countAllResults());
        $list = json_decode($this->json('GET', '/api/categories', [], $this->headers($a))->getJSON(), true)['categories'];
        $this->assertTrue($list[0]['archived']);
        $r = $this->json('POST', '/api/categories', ['name' => 'Educação', 'type' => 'expense', 'client_key' => 'new-intent'], $this->headers($a)); $r->assertStatus(200);
        $this->assertFalse(json_decode($r->getJSON(), true)['category']['archived']);
    }
    public function testAccountBindingRejectsStaleBrowserSessionAndCorsAllowsDelete(): void
    {
        $a = $this->account('a@example.test'); $headers = $this->headers($a); $headers['X-Account-ID'] = '999999';
        $this->json('POST', '/api/categories', ['name' => 'Não gravar', 'type' => 'expense', 'client_key' => 'x'], $headers)->assertStatus(409);
        $this->assertSame(0, $this->db->table('categories')->countAllResults());
        $r = $this->withHeaders(['Origin' => 'http://localhost:8081', 'Access-Control-Request-Method' => 'DELETE', 'Access-Control-Request-Headers' => 'x-account-id,x-csrf-token'])->call('OPTIONS', '/api/categories/1');
        $r->assertStatus(204);
    }
}
