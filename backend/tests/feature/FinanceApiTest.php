<?php
namespace Tests\Feature;
use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;
use App\Libraries\FinancialReset;
class FinanceApiTest extends CIUnitTestCase
{
    use DatabaseTestTrait;
    use FeatureTestTrait;
    protected $namespace=null;
    protected $refresh=true;
    private function callJson(string $method,string $path,array $data=[],array $headers=[]){return $this->withHeaders(['Accept'=>'application/json']+$headers)->withBodyFormat('json')->call($method,$path,$data);}
    private function account(string $email):array{
        $r=$this->callJson('POST','/api/auth/register',['name'=>'Perfil preservado','email'=>$email,'password'=>'RioVerde!7824#','password_confirmation'=>'RioVerde!7824#']);$r->assertStatus(201);return json_decode($r->getJSON(),true);
    }
    private function headers(array $a):array{return ['Authorization'=>'Bearer '.$a['access_token'],'X-Account-ID'=>$a['user']['id']];}
    private function read(array $a):array{$r=$this->callJson('GET','/api/finance',[],$this->headers($a));$r->assertStatus(200);return json_decode($r->getJSON(),true);}
    private function category(array $a):array{$state=$this->read($a);$r=$this->callJson('POST','/api/categories',['name'=>'Pessoal','type'=>'expense','client_key'=>'personal'],$this->headers($a)+['X-Finance-Reset'=>$state['resetKey']]);$r->assertStatus(201);return json_decode($r->getJSON(),true)['category'];}
    private function change(string $category,string $id='tx-one'):array{return ['op'=>'put','client_key'=>$id,'category_id'=>$category,'type'=>'expense','description'=>'Despesa real','amount_cents'=>4500,'transaction_date'=>'2026-11-13'];}
    private function body(array $state,array $changes,string $op='operation-one'):array{return ['reset_key'=>$state['resetKey'],'revision'=>$state['revision'],'operation_id'=>$op,'changes'=>$changes];}
    public function testUnauthenticatedRequestsAndEmptyNewAccounts():void{
        $this->callJson('GET','/api/finance')->assertStatus(401);$this->callJson('POST','/api/finance/transactions')->assertStatus(401);
        $a=$this->account('a@example.test');$s=$this->read($a);$this->assertSame([],$s['categories']);$this->assertSame([],$s['transactions']);
    }
    public function testCreateReadEditDeleteAndIdempotence():void{
        $a=$this->account('a@example.test');$cat=$this->category($a);$s=$this->read($a);$body=$this->body($s,[$this->change($cat['id'])]);
        $r=$this->callJson('POST','/api/finance/transactions',$body,$this->headers($a));$r->assertStatus(200);$after=json_decode($r->getJSON(),true);$this->assertSame(1,$after['revision']);$this->assertSame(4500,$after['transactions'][0]['amount_cents']);
        $this->callJson('POST','/api/finance/transactions',$body,$this->headers($a))->assertStatus(200);$this->assertSame(1,$this->db->table('transactions')->countAllResults());
        $change=$this->change($cat['id']);$change['amount_cents']=6000;$r=$this->callJson('POST','/api/finance/transactions',$this->body($after,[$change],'edit-one'),$this->headers($a));$r->assertStatus(200);$this->assertSame(6000,$this->read($a)['transactions'][0]['amount_cents']);
        $current=$this->read($a);$this->callJson('POST','/api/finance/transactions',$this->body($current,[['op'=>'delete','client_key'=>'tx-one']],'delete-one'),$this->headers($a))->assertStatus(200);$this->assertSame([],$this->read($a)['transactions']);
    }
    public function testInvalidBatchRollsBackEveryChange():void{
        $a=$this->account('a@example.test');$cat=$this->category($a);$s=$this->read($a);$bad=$this->change($cat['id'],'tx-bad');$bad['amount_cents']=-1;
        $this->callJson('POST','/api/finance/transactions',$this->body($s,[$this->change($cat['id']),$bad]),$this->headers($a))->assertStatus(422);$this->assertSame([],$this->read($a)['transactions']);$this->assertSame(0,$this->read($a)['revision']);
    }
    public function testOtherOwnersAndStaleRevisionsAreRejected():void{
        $a=$this->account('a@example.test');$cat=$this->category($a);$s=$this->read($a);$b=$this->account('b@example.test');$bs=$this->read($b);
        $this->callJson('POST','/api/finance/transactions',$this->body($bs,[$this->change($cat['id'])]),$this->headers($b))->assertStatus(422);
        $this->callJson('POST','/api/finance/transactions',$this->body($s,[$this->change($cat['id'])]),$this->headers($a))->assertStatus(200);
        $this->callJson('POST','/api/finance/transactions',$this->body($s,[$this->change($cat['id'],'another')],'different'),$this->headers($a))->assertStatus(409);
        $this->assertSame([],$this->read($b)['transactions']);
    }
    public function testResetAllPreservesProfilesAndBlocksOldWrites():void{
        $a=$this->account('a@example.test');$cat=$this->category($a);$s=$this->read($a);$body=$this->body($s,[$this->change($cat['id'])]);$this->callJson('POST','/api/finance/transactions',$body,$this->headers($a))->assertStatus(200);
        $this->account('b@example.test');$users=$this->db->table('users')->orderBy('id')->get()->getResultArray();$identities=$this->db->table('auth_identities')->orderBy('id')->get()->getResultArray();$profiles=$this->db->table('user_preferences')->orderBy('id')->get()->getResultArray();
        $reset=FinancialReset::all($this->db);$this->assertSame(2,$reset['users']);$this->assertSame($users,$this->db->table('users')->orderBy('id')->get()->getResultArray());$this->assertSame($identities,$this->db->table('auth_identities')->orderBy('id')->get()->getResultArray());$this->assertSame($profiles,$this->db->table('user_preferences')->orderBy('id')->get()->getResultArray());
        $this->assertSame([],$this->read($a)['categories']);$this->assertSame([],$this->read($a)['transactions']);$this->assertNotSame($s['resetKey'],$this->read($a)['resetKey']);
        $this->callJson('POST','/api/finance/transactions',$body,$this->headers($a))->assertStatus(409);
        $this->callJson('POST','/api/categories',['name'=>'Não ressuscitar','type'=>'expense','client_key'=>'old-key'],$this->headers($a)+['X-Finance-Reset'=>$s['resetKey']])->assertStatus(409);
    }
}
