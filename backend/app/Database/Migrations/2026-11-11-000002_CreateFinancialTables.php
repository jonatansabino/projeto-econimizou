<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;
use RuntimeException;

class CreateFinancialTables extends Migration
{
    private const TABLES = ['categories', 'goals', 'transactions', 'category_budgets', 'notifications', 'user_preferences', 'chat_messages', 'saving_recommendations'];

    public function up(): void
    {
        $this->db->resetDataCache();
        if ($this->db->DBDriver !== 'MySQLi') {
            throw new RuntimeException('Esta migration requer MariaDB/MySQLi. Use o MariaDB isolado para testes.');
        }
        $usersName = config('Auth')->tables['users'];
        if (! $this->db->tableExists($usersName)) {
            throw new RuntimeException('Execute primeiro as migrations oficiais do Shield.');
        }
        foreach (self::TABLES as $table) {
            if ($this->db->tableExists($table)) {
                throw new RuntimeException("Tabela {$table} já existe: nenhuma tabela existente será recriada.");
            }
        }
        $users = $this->db->protectIdentifiers($usersName, true);
        $audit = 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP';
        $owner = "user_id INT UNSIGNED NOT NULL, FOREIGN KEY (user_id) REFERENCES {$users}(id) ON DELETE RESTRICT ON UPDATE RESTRICT";
        $id = 'id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY';
        $max = '9007199254740991'; // Mesmo limite exato de inteiros do aplicativo TypeScript.

        $this->create('categories', "$id, $owner,
            name VARCHAR(100) NOT NULL, type ENUM('income','expense') NOT NULL,
            $audit,
            UNIQUE KEY uq_category_name (user_id, type, name),
            UNIQUE KEY uq_category_owner_type (id, user_id, type),
            CONSTRAINT ck_category_name CHECK (CHAR_LENGTH(TRIM(name)) > 0 AND name = TRIM(name))
        ");
        $this->create('goals', "$id, $owner,
            name VARCHAR(100) NOT NULL, target_cents BIGINT UNSIGNED NOT NULL,
            saved_cents BIGINT UNSIGNED NOT NULL DEFAULT 0, $audit,
            UNIQUE KEY uq_goal_owner (id, user_id), INDEX ix_goals_user_created (user_id, created_at),
            CONSTRAINT ck_goal_target CHECK (target_cents BETWEEN 1 AND $max),
            CONSTRAINT ck_goal_saved CHECK (saved_cents BETWEEN 0 AND $max),
            CONSTRAINT ck_goal_name CHECK (CHAR_LENGTH(TRIM(name)) > 0)
        ");
        $categories = $this->db->protectIdentifiers('categories', true);
        $goals = $this->db->protectIdentifiers('goals', true);
        $this->create('transactions', "$id, $owner,
            category_id BIGINT UNSIGNED NOT NULL, type ENUM('income','expense') NOT NULL,
            description VARCHAR(120) NOT NULL, amount_cents BIGINT UNSIGNED NOT NULL,
            transaction_date DATE NOT NULL, $audit,
            UNIQUE KEY uq_transaction_owner (id, user_id),
            INDEX ix_transactions_user_date (user_id, transaction_date, id),
            INDEX ix_transactions_user_type_date (user_id, type, transaction_date),
            INDEX ix_transactions_user_category_date (user_id, category_id, transaction_date),
            CONSTRAINT fk_transaction_category FOREIGN KEY (category_id, user_id, type)
                REFERENCES $categories(id, user_id, type) ON DELETE RESTRICT ON UPDATE RESTRICT,
            CONSTRAINT ck_transaction_amount CHECK (amount_cents BETWEEN 1 AND $max),
            CONSTRAINT ck_transaction_description CHECK (CHAR_LENGTH(TRIM(description)) > 0),
            CONSTRAINT ck_transaction_date CHECK (transaction_date >= '1900-01-01')
        ");
        $this->create('category_budgets', "$id, $owner,
            category_id BIGINT UNSIGNED NOT NULL,
            category_type ENUM('income','expense') NOT NULL DEFAULT 'expense',
            period_month DATE NOT NULL, limit_cents BIGINT UNSIGNED NOT NULL, $audit,
            UNIQUE KEY uq_budget_month (user_id, category_id, period_month),
            INDEX ix_budgets_user_month (user_id, period_month),
            CONSTRAINT fk_budget_category FOREIGN KEY (category_id, user_id, category_type)
                REFERENCES $categories(id, user_id, type) ON DELETE RESTRICT ON UPDATE RESTRICT,
            CONSTRAINT ck_budget_type CHECK (category_type = 'expense'),
            CONSTRAINT ck_budget_month CHECK (DAY(period_month) = 1 AND period_month >= '1900-01-01'),
            CONSTRAINT ck_budget_limit CHECK (limit_cents BETWEEN 1 AND $max)
        ");
        $this->create('notifications', "$id, $owner,
            title VARCHAR(160) NOT NULL, body TEXT NOT NULL, notification_date DATE NOT NULL,
            is_read TINYINT UNSIGNED NOT NULL DEFAULT 0, $audit,
            INDEX ix_notifications_user_read_date (user_id, is_read, notification_date, id),
            CONSTRAINT ck_notification_read CHECK (is_read IN (0,1)),
            CONSTRAINT ck_notification_text CHECK (CHAR_LENGTH(TRIM(title)) > 0 AND CHAR_LENGTH(TRIM(body)) > 0),
            CONSTRAINT ck_notification_date CHECK (notification_date >= '1900-01-01')
        ");
        $this->create('user_preferences', "$id, $owner,
            display_name VARCHAR(60) NULL, avatar VARCHAR(100) NULL,
            hide_amounts TINYINT UNSIGNED NOT NULL DEFAULT 0,
            notifications_enabled TINYINT UNSIGNED NOT NULL DEFAULT 1,
            animations_enabled TINYINT UNSIGNED NOT NULL DEFAULT 1,
            onboarding_completed TINYINT UNSIGNED NOT NULL DEFAULT 0, $audit,
            UNIQUE KEY uq_preferences_user (user_id),
            CONSTRAINT ck_preference_flags CHECK (hide_amounts IN (0,1) AND notifications_enabled IN (0,1) AND animations_enabled IN (0,1) AND onboarding_completed IN (0,1))
        ");
        $transactions = $this->db->protectIdentifiers('transactions', true);
        $this->create('chat_messages', "$id, $owner,
            role ENUM('user','assistant') NOT NULL, text TEXT NOT NULL,
            proposal_type ENUM('transaction','goal') NULL, proposal JSON NULL, request JSON NULL,
            status ENUM('pending','confirmed','cancelled') NULL,
            transaction_id BIGINT UNSIGNED NULL, goal_id BIGINT UNSIGNED NULL, $audit,
            INDEX ix_chat_user_created (user_id, created_at, id),
            INDEX ix_chat_user_status (user_id, status),
            CONSTRAINT fk_chat_transaction FOREIGN KEY (transaction_id, user_id) REFERENCES $transactions(id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
            CONSTRAINT fk_chat_goal FOREIGN KEY (goal_id, user_id) REFERENCES $goals(id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
            CONSTRAINT ck_chat_text CHECK (CHAR_LENGTH(TRIM(text)) > 0),
            CONSTRAINT ck_chat_proposal CHECK (
                (proposal_type IS NULL AND proposal IS NULL AND status IS NULL) OR
                (role = 'assistant' AND proposal_type IS NOT NULL AND proposal IS NOT NULL AND status IS NOT NULL AND JSON_TYPE(proposal) = 'OBJECT')),
            CONSTRAINT ck_chat_request CHECK (request IS NULL OR (role = 'assistant' AND proposal IS NULL AND JSON_TYPE(request) = 'OBJECT')),
            CONSTRAINT ck_chat_transaction_link CHECK (transaction_id IS NULL OR (status IS NOT NULL AND status = 'confirmed' AND proposal_type IS NOT NULL AND proposal_type = 'transaction' AND goal_id IS NULL)),
            CONSTRAINT ck_chat_goal_link CHECK (goal_id IS NULL OR (status IS NOT NULL AND status = 'confirmed' AND proposal_type IS NOT NULL AND proposal_type = 'goal' AND transaction_id IS NULL))
        ");
        $this->create('saving_recommendations', "$id, $owner,
            title VARCHAR(160) NOT NULL, description TEXT NOT NULL,
            status ENUM('pending','accepted','ignored') NOT NULL DEFAULT 'pending',
            goal_id BIGINT UNSIGNED NULL, $audit,
            INDEX ix_recommendations_user_status (user_id, status, id),
            CONSTRAINT fk_recommendation_goal FOREIGN KEY (goal_id, user_id) REFERENCES $goals(id, user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
            CONSTRAINT ck_recommendation_text CHECK (CHAR_LENGTH(TRIM(title)) > 0 AND CHAR_LENGTH(TRIM(description)) > 0)
        ");
    }

    private function create(string $table, string $definition): void
    {
        $name = $this->db->protectIdentifiers($table, true);
        $this->db->query("CREATE TABLE $name ($definition) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $this->db->resetDataCache();
    }

    public function down(): void
    {
        foreach (array_reverse(self::TABLES) as $table) {
            $this->forge->dropTable($table, true);
        }
    }
}
