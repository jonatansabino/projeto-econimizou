<?php
namespace App\Commands;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
class ResetFinance extends BaseCommand
{
    protected $group='Economizou';
    protected $name='finance:reset';
    protected $description='Limpa registros financeiros, preservando usuários, autenticação e perfis.';
    protected $options=['--all-users'=>'Todas as contas','--confirm'=>'Confirma a exclusão financeira'];
    public function run(array $params)
    {
        if(!CLI::getOption('all-users')||!CLI::getOption('confirm')){CLI::error('Use --all-users --confirm para executar.');return EXIT_ERROR;}
        try {
            $result=\App\Libraries\FinancialReset::all(db_connect());
            CLI::write('Limpeza financeira concluída. Usuários e perfis preservados: '.$result['users']);
            foreach($result['removed'] as $table=>$count)CLI::write($table.': '.$count.' registros removidos.');return EXIT_SUCCESS;
        }catch(\Throwable){CLI::error('A limpeza falhou e foi revertida.');return EXIT_ERROR;}
    }
}
