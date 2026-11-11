<?php

namespace Tests\Database;

use App\Database\Migrations\CreateBootstrapChecks;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use Config\Database;

final class BootstrapMigrationTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $namespace = null;
    protected $refresh = true;

    public function testInitialTableCanStoreAndReadARecord(): void
    {
        $this->assertTrue($this->db->tableExists('bootstrap_checks'));
        $this->db->table('bootstrap_checks')->insert([
            'name' => 'migration-test', 'created_at' => '2026-11-11 12:00:00',
        ]);
        $row = $this->db->table('bootstrap_checks')->where('name', 'migration-test')->get()->getRowArray();
        $this->assertNotNull($row);
        $this->assertGreaterThan(0, (int) $row['id']);
        $this->assertSame('2026-11-11 12:00:00', $row['created_at']);
    }

    public function testInitialMigrationCanBeReversed(): void
    {
        $migration = new CreateBootstrapChecks(Database::forge('tests'));
        $migration->down();
        $this->assertFalse($this->db->tableExists('bootstrap_checks'));
        $migration->up();
        $this->assertTrue($this->db->tableExists('bootstrap_checks'));
    }
}
