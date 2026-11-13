<?php
namespace App\Controllers\Api;
use App\Controllers\BaseController;
use App\Libraries\FinancialState;
use App\Models\CategoryModel;
use App\Models\TransactionModel;
use Throwable;
class FinanceController extends BaseController
{
    private function fail(string $message,int $status=422) { return $this->response->setStatusCode($status)->setJSON(['message'=>$message]); }
    private function ownerChanged(): bool { $id=$this->request->getHeaderLine('X-Account-ID');return $id!=='' && $id!==(string)auth()->id(); }
    public function index()
    {
        if($this->ownerChanged())return $this->fail('A conta mudou. Recarregue o aplicativo.',409);
        $db=db_connect();$db->transBegin();
        try { $state=FinancialState::lock($db,(int)auth()->id());$result=FinancialState::snapshot($state);$db->transCommit();return $this->response->setJSON($result); }
        catch(Throwable){$db->transRollback();return $this->fail('Não foi possível consultar os dados financeiros.',503);}
    }
    public function apply()
    {
        if($this->ownerChanged())return $this->fail('A conta mudou. Recarregue o aplicativo.',409);
        try{$body=$this->request->getJSON(true);}catch(Throwable){return $this->fail('JSON inválido.');}
        if(!is_array($body)||array_diff(array_keys($body),['reset_key','revision','operation_id','changes'])||!is_string($body['reset_key']??null)||!is_int($body['revision']??null)||!is_string($body['operation_id']??null)||!preg_match('/^[a-zA-Z0-9:_-]{1,128}$/D',$body['operation_id'])||!is_array($body['changes']??null)||!array_is_list($body['changes'])||count($body['changes'])<1||count($body['changes'])>100)return $this->fail('Solicitação financeira inválida.');
        $db=db_connect();$db->transBegin();
        try{
            $owner=(int)auth()->id();$state=FinancialState::lock($db,$owner);$hash=hash('sha256',json_encode($body['changes'],JSON_THROW_ON_ERROR));
            if(!hash_equals($state['reset_key'],$body['reset_key'])){$db->transRollback();return $this->fail('Os dados foram reiniciados. Atualize antes de continuar.',409);}
            if($state['last_operation']===$body['operation_id']){
                if($state['last_hash']!==$hash){$db->transRollback();return $this->fail('Identificador de operação já utilizado.',409);}
                $result=FinancialState::snapshot($state);$db->transCommit();return $this->response->setJSON($result);
            }
            if((int)$state['revision']!==$body['revision']){$db->transRollback();return $this->fail('Os dados mudaram. Atualize, revise e confirme novamente.',409);}
            $model=new TransactionModel();$categories=new CategoryModel();$keys=[];
            foreach($body['changes'] as $change){
                if(!is_array($change)||!is_string($change['client_key']??null)||!preg_match('/^[a-zA-Z0-9:_-]{1,128}$/D',$change['client_key'])||isset($keys[$change['client_key']]))throw new \InvalidArgumentException('Identificador de lançamento inválido ou repetido.');
                $keys[$change['client_key']]=true;$old=$model->byClientKey($change['client_key']);
                if(($change['op']??null)==='delete'){
                    if(array_diff(array_keys($change),['op','client_key']))throw new \InvalidArgumentException('Campos inválidos.');
                    if($old)$model->delete($old['id']);continue;
                }
                if(($change['op']??null)!=='put'||array_diff(array_keys($change),['op','client_key','category_id','type','description','amount_cents','transaction_date']))throw new \InvalidArgumentException('Campos inválidos.');
                if(!is_string($change['category_id']??null)||!ctype_digit($change['category_id'])||!is_string($change['description']??null)||!is_string($change['transaction_date']??null)||!is_string($change['type']??null)||!is_int($change['amount_cents']??null)||$change['amount_cents']<1||$change['amount_cents']>9007199254740991)throw new \InvalidArgumentException('Confira valor, descrição, data e categoria.');
                $category=$categories->withDeleted()->find($change['category_id']);
                if(!$category||$category['type']!==$change['type']||($category['deleted_at']!==null&&(!$old||(string)$old['category_id']!==$change['category_id'])))throw new \InvalidArgumentException('Categoria indisponível para este usuário.');
                $row=$change;unset($row['op']);
                $ok=$old?$model->update($old['id'],$row):$model->insert($row);
                if(!$ok)throw new \InvalidArgumentException('Confira os dados obrigatórios do lançamento.');
            }
            $sum=0;foreach($model->findAll() as $tx){$sum+=(int)$tx['amount_cents'];if($sum>9007199254740991)throw new \InvalidArgumentException('Total fora do limite suportado.');}
            $state['revision']=(int)$state['revision']+1;$state['last_operation']=$body['operation_id'];$state['last_hash']=$hash;
            $db->table('financial_state')->where('user_id',$owner)->update(['revision'=>$state['revision'],'last_operation'=>$state['last_operation'],'last_hash'=>$hash]);
            if(!$db->transStatus())throw new \RuntimeException('write_failed');
            $result=FinancialState::snapshot($state);$db->transCommit();return $this->response->setJSON($result);
        }catch(\InvalidArgumentException $error){$db->transRollback();return $this->fail($error->getMessage());}
        catch(Throwable){$db->transRollback();return $this->fail('Não foi possível salvar os lançamentos. Nenhuma confirmação parcial foi publicada.',503);}
    }
}
