<?php
namespace App\Libraries;
use App\Models\CategoryModel;
use App\Models\TransactionModel;
class FinancialState
{
    public static function lock($db,int $user): array
    {
        $table=$db->protectIdentifiers('financial_state',true);
        $db->query("INSERT INTO $table (user_id,reset_key,revision) VALUES (?,?,0) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)",[$user,bin2hex(random_bytes(16))]);
        return $db->query("SELECT * FROM $table WHERE user_id=? FOR UPDATE",[$user])->getRowArray();
    }
    public static function snapshot(array $state): array
    {
        return ['resetKey'=>$state['reset_key'],'revision'=>(int)$state['revision'],
            'categories'=>array_map(static fn($c)=>['id'=>(string)$c['id'],'name'=>$c['name'],'type'=>$c['type'],'client_key'=>$c['client_key'],'archived'=>$c['deleted_at']!==null],(new CategoryModel())->withDeleted()->findAll()),
            'transactions'=>array_map(static fn($t)=>['id'=>(string)$t['id'],'client_key'=>$t['client_key'],'category_id'=>(string)$t['category_id'],'type'=>$t['type'],'description'=>$t['description'],'amount_cents'=>(int)$t['amount_cents'],'transaction_date'=>$t['transaction_date']],(new TransactionModel())->listForSnapshot())];
    }
}
