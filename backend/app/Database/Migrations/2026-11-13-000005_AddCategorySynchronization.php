<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCategorySynchronization extends Migration
{
    public function up()
    {
        $this->forge->addColumn('categories', [
            'client_key' => ['type' => 'VARCHAR', 'constraint' => 128, 'null' => true],
            'deleted_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $table = $this->db->protectIdentifiers('categories', true);
        $this->db->query("ALTER TABLE $table ADD UNIQUE KEY uq_category_client (user_id, client_key)");
    }

    public function down()
    {
        $table = $this->db->protectIdentifiers('categories', true);
        $this->db->query("ALTER TABLE $table DROP INDEX uq_category_client");
        $this->forge->dropColumn('categories', ['client_key', 'deleted_at']);
    }
}
