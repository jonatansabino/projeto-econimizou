<?php

require dirname(__DIR__) . '/vendor/codeigniter4/framework/system/Test/bootstrap.php';

// Nenhum teste de migration/rollback pode apontar para o banco da aplicação.
$config = config(\Config\Database::class);
if (ENVIRONMENT !== 'testing' || $config->defaultGroup !== 'tests'
    || $config->tests['hostname'] !== 'db-test' || $config->tests['database'] !== 'economizou_test'
    || $config->tests['username'] !== 'economizou_test' || $config->tests['DBDriver'] !== 'MySQLi'
    || $config->tests['database'] === $config->default['database']) {
    throw new RuntimeException('Testes permitidos apenas no MariaDB isolado db-test/economizou_test.');
}

$connection = \Config\Database::connect('tests');
$row = $connection->query('SELECT DATABASE() AS name')->getRowArray();
if ($row['name'] !== 'economizou_test') {
    throw new RuntimeException('Conexão de teste inválida.');
}

// Ordem explícita; não executa migrations de fixtures no banco da aplicação.
$runner = service('migrations', null, $connection, false);
foreach (['CodeIgniter\\Settings', 'CodeIgniter\\Shield', 'App'] as $namespace) {
    $runner->setNamespace($namespace)->latest('tests');
    $connection->resetDataCache();
}
