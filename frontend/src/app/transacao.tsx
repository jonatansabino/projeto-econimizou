import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import { DatePicker } from '@/components/date-picker';
import type { InputHandle } from '@/components/keyboard-scroll';
import { Screen } from '@/components/screen';
import { Button, Chips, ConfirmDelete, Empty, ErrorText, Field, Sheet, ui, useTask, type TouchHandle } from '@/components/ui';
import { displayDate, inputMoney } from '@/domain/features';
import { localDate, type TransactionType } from '@/domain/finance';
import { categoryIcon, maskMoney, validateDraft, type DraftErrors, type TransactionDraft } from '@/domain/transaction-form';
import { useFinance } from '@/state/finance-context';

export default function TransactionRoute() {
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const { data } = useFinance();
  const id = typeof params.id === 'string' ? params.id : undefined;
  const transaction = data.transactions.find((item) => item.id === id);
  if (id && !transaction) return <Screen title="Transação indisponível" description="Ela pode ter sido excluída." back><Empty text="Volte ao extrato para consultar seus movimentos." /></Screen>;
  return <TransactionForm key={id ?? `new-${params.type}`} id={id} initialType={params.type === 'income' ? 'income' : 'expense'} />;
}
function TransactionForm({ id, initialType }: { id?: string; initialType: TransactionType }) {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const existing = data.transactions.find((item) => item.id === id);
  const [initial] = useState<TransactionDraft>(() => ({
    type: existing?.type ?? initialType, description: existing?.description ?? '', value: existing ? maskMoney(inputMoney(existing.amountCents)) : '',
    date: displayDate(existing?.date ?? localDate()), categoryId: existing?.categoryId ?? data.categories.find((item) => item.type === initialType && !item.archived)?.id ?? '',
  }));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [deleting, setDeleting] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);
  const [discard, setDiscard] = useState<(() => void) | null>(null);
  const locked = useRef(false);
  const requestId = useRef<string | null>(null);
  const descriptionRef = useRef<InputHandle>(null);
  const valueRef = useRef<InputHandle>(null);
  const categoryRef = useRef<TouchHandle>(null);
  const dateRef = useRef<InputHandle>(null);
  const task = useTask();
  const dirty = !saved && !allowLeave && JSON.stringify(draft) !== JSON.stringify(initial);
  const disablePrevention = usePreventRemove(dirty, ({ repeat }) => setDiscard(() => repeat));
  function leave() { if (router.canGoBack()) router.back(); else router.replace('/extrato'); }
  function change<K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) { setDraft((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: undefined })); }
  function cancel() { if (task.busy) return; if (dirty) setDiscard(() => leave); else leave(); }
  async function save() {
    if (locked.current || saved) return;
    const result = validateDraft(draft, data.categories);
    setErrors(result.errors);
    if (!result.input) {
      requestAnimationFrame(() => {
        if (result.errors.description) descriptionRef.current?.focus();
        else if (result.errors.value) valueRef.current?.focus();
        else if (result.errors.date) dateRef.current?.focus();
        else { Keyboard.dismiss(); categoryRef.current?.focus(); }
      });
      return;
    }
    locked.current = true;
    const input = result.input;
    requestId.current ??= `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
    const ok = await task.run(() => id ? updateTransaction(id, input) : addTransaction(input, requestId.current ?? undefined));
    if (ok) { disablePrevention(); Keyboard.dismiss(); setSaved(true); } else locked.current = false;
  }
  return <Screen title={id ? 'Editar Transação' : 'Nova Transação'} description="Um registro de cada vez. Seus totais serão atualizados ao salvar." back onBack={cancel}>
    {existing?.commitmentId && <View style={ui.card}><Text style={ui.text}>Transação vinculada a um compromisso. Alterar valor ou data atualiza também a conta confirmada. Para desfazer ou excluir, use o fluxo de Contas.</Text><Button label="Gerenciar compromisso vinculado" secondary onPress={() => router.push('/contas')} /></View>}
    <View style={ui.card}>
      <Chips label="Tipo da Transação" value={draft.type} onChange={(next) => { if (task.busy || saved) return; change('type', next as TransactionType); change('categoryId', data.categories.find((item) => item.type === next && !item.archived)?.id ?? ''); }} options={[{ label: 'Despesa', value: 'expense', icon: 'arrow-up-circle-outline' }, { label: 'Receita', value: 'income', icon: 'arrow-down-circle-outline' }]} />
      <Field ref={descriptionRef} label="Descrição" placeholder="Ex.: almoço" maxLength={120} value={draft.description} editable={!task.busy && !saved} onChangeText={(value) => change('description', value)} error={errors.description} returnKeyType="next" onSubmitEditing={() => valueRef.current?.focus()} />
      <Field ref={valueRef} label="Valor (R$)" placeholder="R$ 0,00" keyboardType="number-pad" value={draft.value} editable={!task.busy && !saved} onChangeText={(value) => change('value', maskMoney(value))} error={errors.value} />
      <Text style={ui.text}>Digite os números em centavos: 4500 corresponde a R$ 45,00.</Text>
      <Field ref={dateRef} label="Data (DD/MM/AAAA)" placeholder="DD/MM/AAAA" value={draft.date} editable={!task.busy && !saved} onChangeText={(value) => change('date', value)} maxLength={10} error={errors.date} />
      <Button label="Selecionar data no calendário" icon="calendar-outline" secondary disabled={task.busy || saved} onPress={() => { Keyboard.dismiss(); setCalendar(true); }} />
      <Chips focusRef={categoryRef} label="Categoria Da Transação" value={draft.categoryId} onChange={(value) => { if (!task.busy && !saved) change('categoryId', value); }} options={data.categories.filter((item) => item.type === draft.type && (!item.archived || item.id === existing?.categoryId)).map((item) => ({ label: item.name, value: item.id, icon: categoryIcon(item.name, item.type) }))} />
      {errors.categoryId && <Text accessibilityRole="alert" style={ui.error}>{errors.categoryId}</Text>}
      {!data.categories.some((item) => item.type === draft.type) && <Button focusRef={categoryRef} label="Gerenciar Categorias" secondary onPress={() => router.push('/categorias')} />}
      <ErrorText error={task.error} />
      <Button label={id ? 'Salvar alterações' : 'Salvar Transação'} icon="checkmark" disabled={saved} loading={task.busy} onPress={() => { void save(); }} />
      <Button label="Cancelar" secondary disabled={task.busy} onPress={cancel} />
      {id && <Button label="Excluir Transação" secondary danger disabled={task.busy || saved} onPress={() => setDeleting(true)} />}
    </View>
    {calendar && <DatePicker value={draft.date} onClose={() => setCalendar(false)} onSelect={(value) => { change('date', displayDate(value)); setCalendar(false); }} />}
    {discard && <Sheet title="Descartar alterações?" onClose={() => setDiscard(null)}><Text style={ui.text}>Você tem alterações não salvas. Deseja sair do formulário?</Text><Button label="Continuar editando" onPress={() => setDiscard(null)} /><Button label="Descartar E Sair" secondary danger onPress={() => { setAllowLeave(true); disablePrevention(); const action = discard; setDiscard(null); action(); }} /></Sheet>}
    {saved && <Sheet title="Transação salva" onClose={leave}><Text accessibilityRole="alert" style={ui.success}>{id ? 'Alterações salvas com sucesso.' : 'Transação registrada com sucesso.'} Home, Extrato e Relatórios já foram atualizados.</Text><Button label="Concluir" icon="checkmark-circle-outline" onPress={leave} /></Sheet>}
    {deleting && id && <ConfirmDelete title={draft.description} onCancel={() => setDeleting(false)} onConfirm={async () => { await deleteTransaction(id); disablePrevention(); leave(); }} />}
  </Screen>;
}
