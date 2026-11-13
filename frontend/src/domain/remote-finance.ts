import { ApiError } from './auth.ts';
import { mergeCategories, validateRemoteCategory, type RemoteCategory } from './categories.ts';
import { isCivilDate, type FinanceData, type Transaction } from './finance.ts';
export type RemoteTransaction = {id:string;client_key:string|null;category_id:string;type:'income'|'expense';description:string;amount_cents:number;transaction_date:string};
export type BankSnapshot = {resetKey:string;revision:number;categories:RemoteCategory[];transactions:RemoteTransaction[]};
export type BankChange = {op:'delete';client_key:string}|{op:'put';client_key:string;category_id:string;type:'income'|'expense';description:string;amount_cents:number;transaction_date:string};
export type BankWrite = {reset_key:string;revision:number;operation_id:string;changes:BankChange[]};
export interface FinancialApi {read():Promise<BankSnapshot>;apply(input:BankWrite):Promise<BankSnapshot>}
export function validateBankSnapshot(value:unknown):asserts value is BankSnapshot {
  const data=value as BankSnapshot;
  if(!data||typeof data.resetKey!=='string'||!/^[a-f0-9]{32}$/.test(data.resetKey)||!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.categories)||!Array.isArray(data.transactions))throw new ApiError('Resposta financeira inválida.');
  data.categories.forEach(validateRemoteCategory);
  for(const t of data.transactions)if(!t||typeof t.id!=='string'||typeof t.category_id!=='string'||!(t.client_key===null||typeof t.client_key==='string')||!['income','expense'].includes(t.type)||typeof t.description!=='string'||!t.description.trim()||!Number.isSafeInteger(t.amount_cents)||t.amount_cents<1||!isCivilDate(t.transaction_date))throw new ApiError('Lançamento retornado pelo banco inválido.');
}
export function emptyFinancialRecords(data:FinanceData):FinanceData {
  return {...data,categories:[],transactions:[],goals:[],commitments:[],commitmentRecurrences:[],chatMessages:[],notifications:[],recommendations:[]};
}
export function applyBankSnapshot(data:FinanceData,bank:BankSnapshot):FinanceData {
  validateBankSnapshot(bank);
  const base=data.financeResetKey===bank.resetKey?data:emptyFinancialRecords(data);
  const categories=mergeCategories(base.categories.filter(c=>c.remoteId),bank.categories,true);
  const transactions:Transaction[]=bank.transactions.map(t=>{
    const category=categories.find(c=>c.remoteId===t.category_id&&c.type===t.type);if(!category)throw new ApiError('Categoria do lançamento não encontrada.');
    const id=t.client_key??`api-tx:${t.id}`;
    const bill=base.commitments?.find(b=>b.transactionId===id||`commitment-tx:${b.id}`===id);
    return {id,description:t.description,amountCents:t.amount_cents,type:t.type,categoryId:category.id,date:t.transaction_date,...(bill?{commitmentId:bill.id}:{})};
  });
  const commitments=base.commitments?.map(b=>{
    const tx=transactions.find(t=>t.commitmentId===b.id);
    if(tx)return {...b,status:'settled' as const,transactionId:tx.id,actualDate:tx.date,actualAmountCents:tx.amountCents};
    if(b.status!=='settled')return b;
    const {transactionId:_id,actualDate:_date,actualAmountCents:_amount,...rest}=b;
    return {...rest,status:'pending' as const};
  });
  return {...base,categories,transactions,...(commitments?{commitments}:{}),financeResetKey:bank.resetKey,financeRevision:bank.revision};
}
export function bankChanges(previous:FinanceData,next:FinanceData):BankChange[] {
  const encode=(t:Transaction,data:FinanceData)=>{
    const category=data.categories.find(c=>c.id===t.categoryId);if(!category?.remoteId)throw new ApiError('Cadastre uma categoria no banco antes de registrar o lançamento.');
    return {client_key:t.id,category_id:category.remoteId,type:t.type,description:t.description,amount_cents:t.amountCents,transaction_date:t.date};
  };
  const changes:BankChange[]=[];
  for(const old of previous.transactions)if(!next.transactions.some(t=>t.id===old.id))changes.push({op:'delete',client_key:old.id});
  for(const tx of next.transactions){const old=previous.transactions.find(t=>t.id===tx.id);if(!old||JSON.stringify(encode(old,previous))!==JSON.stringify(encode(tx,next)))changes.push({op:'put',...encode(tx,next)});}
  return changes;
}
