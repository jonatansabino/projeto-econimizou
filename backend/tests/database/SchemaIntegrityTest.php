<?php

namespace Tests\Database;

use App\Database\Migrations\CreateFinancialTables;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use RuntimeException;

class SchemaIntegrityTest extends CIUnitTestCase
{
    use DatabaseTestTrait;

    protected $namespace = null;
    protected $refresh = true;
    private const TABLES = ['categories', 'transactions', 'goals', 'category_budgets', 'notifications', 'user_preferences', 'chat_messages', 'saving_recommendations'];

    public function testFinancialTablesHaveOwnersAuditAndBigIntMoney(): void
    {
        $this->assertSame('economizou_test', $this->db->query('SELECT DATABASE() AS name')->getRowArray()['name']);
        $this->assertStringStartsWith('11.4.', $this->db->query('SELECT VERSION() AS version')->getRowArray()['version']);
        foreach (self::TABLES as $table) {
            $fields = $this->db->getFieldNames($table);
            foreach (['id', 'user_id', 'created_at', 'updated_at'] as $field) {
                $this->assertContains($field, $fields);
            }
            $ownerKey = $this->db->query('SELECT COUNT(*) AS total FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = ?', [$table, 'user_id', 'users'])->getRowArray();
            $this->assertSame(1, (int) $ownerKey['total']);
        }
        $columns = $this->db->query("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME LIKE '%\\_cents'")->getResultArray();
        $this->assertCount(5, $columns);
        foreach ($columns as $column) {
            $this->assertSame('bigint', $column['DATA_TYPE']);
        }
    }

    public function testReapplyingMigrationDoesNotRecreateExistingTables(): void
    {
        $this->expectException(RuntimeException::class);
        $migration = new CreateFinancialTables(\Config\Database::forge('tests'));
        $migration->up();
    }

    public function testFullRollbackAndReapplyOnlyInIsolatedDatabase(): void
    {
        $this->assertSame('economizou_test', $this->db->query('SELECT DATABASE() AS name')->getRowArray()['name']);
        $this->migrations->setNamespace(null)->regress(0, 'tests');
        $this->db->resetDataCache();
        foreach ([...self::TABLES, 'users', 'auth_identities', 'settings'] as $table) {
            $this->assertFalse($this->db->tableExists($table));
        }
        $this->migrations->setNamespace(null)->latest('tests');
        $this->db->resetDataCache();
        foreach ([...self::TABLES, 'users', 'auth_identities', 'settings'] as $table) {
            $this->assertTrue($this->db->tableExists($table));
        }
    }
}
