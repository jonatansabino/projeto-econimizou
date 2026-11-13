<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProfilePersonalization extends Migration
{
    public function up()
    {
        $this->forge->addColumn('user_preferences', [
            'birth_date' => ['type' => 'DATE', 'null' => true],
            'financial_objective' => ['type' => 'VARCHAR', 'constraint' => 30, 'null' => true],
            'monthly_income_cents' => ['type' => 'BIGINT', 'null' => true],
            // Usuários anteriores não precisam repetir o fluxo inicial.
            'personalization_completed' => ['type' => 'TINYINT', 'constraint' => 1, 'unsigned' => true, 'default' => 1],
        ]);
        $table = $this->db->protectIdentifiers('user_preferences', true);
        $this->db->query("ALTER TABLE $table ADD CONSTRAINT ck_profile_income CHECK (monthly_income_cents IS NULL OR monthly_income_cents BETWEEN 0 AND 9007199254740991), ADD CONSTRAINT ck_profile_objective CHECK (financial_objective IS NULL OR financial_objective IN ('organize','save','debt_free','achievement')), ADD CONSTRAINT ck_profile_completed CHECK (personalization_completed IN (0,1))");
    }

    public function down()
    {
        $table = $this->db->protectIdentifiers('user_preferences', true);
        foreach (['ck_profile_income', 'ck_profile_objective', 'ck_profile_completed'] as $constraint) {
            $this->db->query("ALTER TABLE $table DROP CONSTRAINT $constraint");
        }
        $this->forge->dropColumn('user_preferences', ['birth_date', 'financial_objective', 'monthly_income_cents', 'personalization_completed']);
    }
}
