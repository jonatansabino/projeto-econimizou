<?php
namespace App\Database\Migrations;
use CodeIgniter\Database\Migration;
class AddFinancialSynchronization extends Migration
{
    public function up()
    {
        $this->forge->addColumn('transactions', ['client_key' => ['type'=>'VARCHAR','constraint'=>128,'null'=>true]]);
        $transactions=$this->db->protectIdentifiers('transactions',true);
        $users=$this->db->protectIdentifiers('users',true);
        $state=$this->db->protectIdentifiers('financial_state',true);
        $this->db->query("ALTER TABLE $transactions ADD UNIQUE KEY uq_transaction_client (user_id,client_key)");
        $this->db->query("CREATE TABLE $state (user_id INT UNSIGNED PRIMARY KEY, reset_key CHAR(32) NOT NULL, revision BIGINT UNSIGNED NOT NULL DEFAULT 0, last_operation VARCHAR(128) NULL, last_hash CHAR(64) NULL, FOREIGN KEY(user_id) REFERENCES $users(id) ON DELETE RESTRICT) ENGINE=InnoDB");
    }
    public function down()
    {
        $this->forge->dropTable('financial_state');
        $this->db->query('ALTER TABLE '.$this->db->protectIdentifiers('transactions',true).' DROP INDEX uq_transaction_client');
        $this->forge->dropColumn('transactions','client_key');
    }
}
