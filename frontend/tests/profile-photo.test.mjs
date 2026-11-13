import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFinanceRepository } from '../src/data/finance-repository.ts';
import { createMockData } from '../src/data/mock-data.ts';
import { PHOTO_INPUT_LIMIT, PhotoError, validatePhotoBytes, validPhotoRef } from '../src/domain/profile-photo.ts';
import { saveProfilePhoto } from '../src/services/save-profile-photo.ts';
import { createFinanceStore } from '../src/state/finance-store.ts';

const jpeg = new Uint8Array([255,216,255,224]);
test('valida bytes, tamanho e formatos reais, sem confiar na extensão', () => {
  validatePhotoBytes(10, jpeg, false);
  validatePhotoBytes(10, new Uint8Array([137,80,78,71,13,10,26,10]), false);
  validatePhotoBytes(20, new TextEncoder().encode('RIFF0000WEBP'), false);
  validatePhotoBytes(20, new TextEncoder().encode('0000ftypheic'), true);
  for (const [size, bytes, native] of [[0,jpeg,false], [PHOTO_INPUT_LIMIT+1,jpeg,true], [20,new TextEncoder().encode('<svg/>'),false], [20,new TextEncoder().encode('0000ftypheic'),false]]) assert.throws(()=>validatePhotoBytes(size, bytes, native), PhotoError);
  assert.equal(validPhotoRef('../other/photo.jpg'), false); assert.equal(validPhotoRef('photo-old-12345'), true);
});
function fixture() {
  const previous = { name: 'Ana', avatar: 'dicebear:adventurer:2', photoRef: 'photo-old-12345' };
  const next = { ...previous, photoRef: null };
  const staged = { id: 'photo-new-12345', uri: 'file://preview', scope: 'account-a' };
  const calls = []; let local = previous;
  const repository = { commit: async () => { calls.push('commit'); return staged.id; }, remove: async id => { calls.push(`remove:${id}`); } };
  const saveLocal = async profile => { calls.push('local'); local = profile; };
  const saveRemote = async avatar => { calls.push('remote'); assert.equal(avatar, previous.avatar); };
  return { previous, next, staged, repository, saveLocal, saveRemote, calls, local:()=>local };
}
test('só envia DiceBear à API e persiste imagem local antes de concluir', async () => {
  const f=fixture(); await saveProfilePhoto(f);
  assert.deepEqual(f.calls,['commit','local','remote']); assert.equal(f.local().photoRef,f.staged.id);
});
test('API falha: reverte apenas perfil e limpa só a nova imagem', async () => {
  const f=fixture(); f.saveRemote=async()=>{f.calls.push('remote');throw Error('offline')};
  await assert.rejects(saveProfilePhoto(f), /offline/); assert.deepEqual(f.local(),f.previous);
  assert.deepEqual(f.calls,['commit','local','remote','local','remove:photo-new-12345']);
});
test('quota ou gravação local falha: não anuncia sucesso nem altera imagem anterior', async () => {
  const f=fixture(); f.repository.commit=async()=>{throw Error('quota')};
  await assert.rejects(saveProfilePhoto(f),/quota/);assert.deepEqual(f.local(),f.previous);assert.deepEqual(f.calls,[]);
  const g=fixture();g.saveLocal=async()=>{throw Error('disk')};await assert.rejects(saveProfilePhoto(g),/disk/);assert.deepEqual(g.calls,['commit','remove:photo-new-12345']);
});
test('rollback falha: preserva arquivos para recuperação e não publica sucesso', async () => {
  const f=fixture();let writes=0;f.saveLocal=async()=>{if(++writes>1)throw Error('disk')};f.saveRemote=async()=>{throw Error('offline')};
  await assert.rejects(saveProfilePhoto(f),/restaurar/);assert.deepEqual(f.calls,['commit']);
});
test('troca de sessão durante a seleção não grava nem chama API', async()=>{
  const f=fixture();let checks=0;await assert.rejects(saveProfilePhoto({...f,isCurrent:()=>++checks===1}),/sessão/);
  assert.deepEqual(f.calls,['commit','remove:photo-new-12345']);assert.deepEqual(f.local(),f.previous);
});
test('metadado opcional preserva legado, dados financeiros e a foto ao editar só nome', async()=>{
  const initial=createMockData();initial.profile.photoRef='photo-old-12345';let raw=JSON.stringify(initial);
  const repository=createFinanceRepository({getItem:async()=>raw,setItem:async(_key,value)=>{raw=value}});
  const store=createFinanceStore(repository);await store.initialize();await store.updateProfile({name:'Nome novo',avatar:initial.profile.avatar});
  assert.equal(store.getSnapshot().data.profile.photoRef,'photo-old-12345');
  await store.updateProfile({...store.getSnapshot().data.profile,photoRef:null});const reload=createFinanceStore(repository);await reload.initialize();
  assert.equal(reload.getSnapshot().data.profile.photoRef,null);assert.deepEqual(reload.getSnapshot().data.transactions,initial.transactions);assert.deepEqual(reload.getSnapshot().data.goals,initial.goals);
  await assert.rejects(store.updateProfile({...initial.profile,photoRef:'../other'}));
});

test('falha remota reverte o perfil sem reverter Transação criada durante o salvamento', async () => {
  const initial = createMockData(); let raw = JSON.stringify(initial);
  const repository = createFinanceRepository({ getItem: async () => raw, setItem: async (_key, value) => { raw = value; } });
  const store = createFinanceStore(repository); await store.initialize();
  const added = { type: 'expense', amountCents: 4500, categoryId: initial.categories.find(c => c.type === 'expense').id, description: 'Durante o salvamento', date: '2026-11-13' };
  const f = fixture();
  await assert.rejects(saveProfilePhoto({ ...f, previous: initial.profile, next: { ...initial.profile, name: 'Rascunho' }, saveLocal: store.updateProfile, saveRemote: async () => { await store.addTransaction(added); throw Error('offline'); } }), /offline/);
  assert.equal(store.getSnapshot().data.profile.name, initial.profile.name);
  assert.equal(store.getSnapshot().data.transactions.length, initial.transactions.length + 1);
  assert.equal(store.getSnapshot().data.transactions.at(-1).description, added.description);
});
