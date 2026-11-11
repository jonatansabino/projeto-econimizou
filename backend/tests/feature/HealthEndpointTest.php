<?php

namespace Tests\Feature;

use CodeIgniter\Exceptions\PageNotFoundException;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

final class HealthEndpointTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;

    protected $namespace = null;

    public function testHealthReturnsJsonWhenDatabaseIsAvailable(): void
    {
        $result = $this->get('/health');
        $result->assertStatus(200);
        $result->assertHeader('Content-Type', 'application/json; charset=UTF-8');
        $result->assertJSONExact([
            'status' => 'ok', 'service' => 'economizou-api', 'database' => 'connected',
        ]);
    }

    public function testRootAlsoIdentifiesTheApi(): void
    {
        $result = $this->get('/');
        $result->assertStatus(200);
        $result->assertJSONFragment(['service' => 'economizou-api']);
    }

    public function testHealthDoesNotAcceptWrites(): void
    {
        $this->expectException(PageNotFoundException::class);
        $this->post('/health');
    }

    public function testUndeclaredRoutesAreNotAutomaticallyExposed(): void
    {
        $this->expectException(PageNotFoundException::class);
        $this->get('/health/index');
    }
}
