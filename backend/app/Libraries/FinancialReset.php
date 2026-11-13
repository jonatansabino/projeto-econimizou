<?php
namespace App\Libraries;
class FinancialReset
{
    // Operação administrativa: somente o comando confirmado e testes isolados a invocam.
    public static function all($db): array
    {
        $db->transBegin();
        try {
            $users=$db->query('SELECT id FROM '.$db->protectIdentifiers('users',true).' ORDER BY id FOR UPDATE')->getResultArray();
            foreach($users as $user)FinancialState::lock($db,(int)$user['id']);
            $removed=[];
            foreach(['chat_messages','saving_recommendations','notifications','category_budgets','transactions','goals','categories'] as $table){$removed[$table]=$db->table($table)->countAllResults();$db->table($table)->emptyTable();}
            foreach($users as $user)$db->table('financial_state')->where('user_id',$user['id'])->update(['reset_key'=>bin2hex(random_bytes(16)),'revision'=>0,'last_operation'=>null,'last_hash'=>null]);
            if(!$db->transStatus())throw new \RuntimeException('reset_failed');
            $db->transCommit();return ['users'=>count($users),'removed'=>$removed];
        }catch(\Throwable $error){$db->transRollback();throw $error;}
    }
}
