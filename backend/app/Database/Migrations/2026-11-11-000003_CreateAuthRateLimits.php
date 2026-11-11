<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAuthRateLimits extends Migration
{
    public function up(): void
    {
        $this->forge->addField([
            'key_hash' => ['type' => 'VARCHAR', 'constraint' => 64],
            'hits' => ['type' => 'INT', 'unsigned' => true],
            'window_start' => ['type' => 'BIGINT', 'unsigned' => true],
        ]);
        $this->forge->addPrimaryKey('key_hash');
        $this->forge->addKey('window_start');
        $this->forge->createTable('auth_rate_limits');
    }

    public function down(): void
    {
        $this->forge->dropTable('auth_rate_limits', true);
    }
}
