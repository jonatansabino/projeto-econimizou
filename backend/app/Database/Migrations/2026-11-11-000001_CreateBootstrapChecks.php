<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateBootstrapChecks extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
            'name' => ['type' => 'VARCHAR', 'constraint' => 100],
            'created_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('bootstrap_checks');
    }

    public function down()
    {
        $this->forge->dropTable('bootstrap_checks', true);
    }
}
