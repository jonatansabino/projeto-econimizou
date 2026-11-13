import { DatePicker } from '@/components/date-picker';
import type { InputHandle } from '@/components/keyboard-scroll';
import { Button, Chips, ErrorText, Field, Sheet, ui, useTask } from '@/components/ui';
import { transactionType, type CommitmentInput, type CommitmentType } from '@/domain/commitments';
import { displayDate, inputMoney, parseDate, parseMoney } from '@/domain/features';
import { localDate } from '@/domain/finance';
import { categoryIcon, maskMoney } from '@/domain/transaction-form';
import { useFinance } from '@/state/finance-context';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

export function CommitmentForm({ initial, type, editing = false, recurrence = false, onSave, onClose }: { initial?: CommitmentInput; type: CommitmentType; editing?: boolean; recurrence?: boolean; onSave(input: CommitmentInput, monthly: boolean): Promise<unknown>; onClose(): void }) {
  const { data, today } = useFinance();
  const [description, setDescription] = useState(initial?.description ?? '');
  const [value, setValue] = useState(initial ? maskMoney(inputMoney(initial.amountCents)) : '');
  const [date, setDate] = useState(displayDate(initial?.dueDate ?? today));
  const [categoryId, setCategory] = useState(initial?.categoryId ?? data.categories.find(c => c.type === transactionType(type) && !c.archived)?.id ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [monthly, setMonthly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendar, setCalendar] = useState(false);
  const [discard, setDiscard] = useState(false);
  const locked = useRef(false); const task = useTask();
  const descriptionRef = useRef<InputHandle>(null); const valueRef = useRef<InputHandle>(null); const dateRef = useRef<InputHandle>(null);
  const dirty = description !== (initial?.description ?? '') || value !== (initial ? maskMoney(inputMoney(initial.amountCents)) : '') || date !== displayDate(initial?.dueDate ?? today) || notes !== (initial?.notes ?? '') || categoryId !== (initial?.categoryId ?? data.categories.find(c => c.type === transactionType(type) && !c.archived)?.id ?? '') || monthly;
  function close() { if (locked.current) return; if (dirty) setDiscard(true); else onClose(); }
  async function save() {
    if (locked.current) return;
    const errors: Record<string, string> = {}; let cents = 0, civil = '';
    if (!description.trim()) errors.description = 'Informe a descrição.';
    try { cents = parseMoney(value); } catch { errors.value = 'Informe um valor maior que zero.'; }
    try { civil = parseDate(date); } catch { errors.date = 'Informe uma data válida (DD/MM/AAAA).'; }
    if (!data.categories.some(c => c.id === categoryId && c.type === transactionType(type))) errors.category = 'Selecione uma categoria compatível.';
    setErrors(errors);
    if (Object.keys(errors).length) { if (errors.description) descriptionRef.current?.focus(); else if (errors.value) valueRef.current?.focus(); else if (errors.date) dateRef.current?.focus(); return; }
    locked.current = true;
    const ok = await task.run(() => onSave({ type, description: description.trim(), categoryId, amountCents: cents, dueDate: civil, notes: notes.trim() }, monthly));
    if (ok) onClose(); else locked.current = false;
  }
  if (calendar) return <DatePicker value={date} onSelect={civil => { setDate(displayDate(civil)); setCalendar(false); }} onClose={() => setCalendar(false)} />;
  if (discard) return <Sheet title="Descartar alterações?" onClose={() => setDiscard(false)}><Text style={ui.text}>As alterações deste formulário ainda não foram salvas.</Text><Button label="Continuar editando" onPress={() => setDiscard(false)} /><Button label="Descartar E Sair" danger secondary onPress={onClose} /></Sheet>;
  return <Sheet title={recurrence ? 'Editar recorrência' : editing ? 'Editar previsão' : type === 'payable' ? 'Nova conta a pagar' : 'Nova conta a receber'} onClose={close} footer={<><ErrorText error={task.error} /><Button label="Salvar compromisso" loading={task.busy} onPress={() => { void save(); }} /></>}>
    {recurrence && <Text style={ui.text}>Altera a regra e as ocorrências pendentes futuras. Pagamentos/recebimentos e vencimentos anteriores ficam preservados. Mantenha o mês e ano da data inicial; ajuste o dia se desejar.</Text>}
    <Field ref={descriptionRef} label="Descrição do compromisso" value={description} onChangeText={setDescription} error={errors.description} maxLength={120} editable={!task.busy} />
    <Field ref={valueRef} label="Valor previsto (R$)" keyboardType="number-pad" value={value} onChangeText={v => setValue(maskMoney(v))} error={errors.value} editable={!task.busy} />
    <Field ref={dateRef} label="Vencimento (DD/MM/AAAA)" value={date} onChangeText={setDate} error={errors.date} maxLength={10} editable={!task.busy} />
    <Button label="Escolher vencimento no calendário" secondary disabled={task.busy} onPress={() => setCalendar(true)} />
    <Chips label="Categoria do compromisso" value={categoryId} onChange={v => { if (!task.busy) setCategory(v); }} options={data.categories.filter(c => c.type === transactionType(type) && (!c.archived || c.id === initial?.categoryId)).map(c => ({ label: c.name, value: c.id, icon: categoryIcon(c.name, c.type) }))} />
    <ErrorText error={errors.category ?? null} />
    <Field label="Observações (opcional)" value={notes} onChangeText={setNotes} multiline maxLength={1000} editable={!task.busy} />
    {!editing && !recurrence && <><Chips label="Repetição" value={monthly ? 'monthly' : 'none'} onChange={v => { if (!task.busy) setMonthly(v === 'monthly'); }} options={[{ label: 'Não repetir', value: 'none' }, { label: 'Mensalmente', value: 'monthly' }]} />{monthly && <Text style={ui.text}>Cria previsões mensais, nunca transações. Os próximos 12 meses são preparados e ampliados ao abrir o app. Vencimentos no dia 31 se ajustam ao último dia de meses menores.</Text>}</>}
    <Text style={ui.text}>Esta previsão não altera seu saldo atual.</Text><Button label="Cancelar" secondary disabled={task.busy} onPress={close} />
  </Sheet>;
}

export function CommitmentSettlement({ description, amountCents, initialDate, correction, onConfirm, onClose }: { description: string; amountCents: number; initialDate?: string; correction: boolean; onConfirm(date: string, cents: number): Promise<unknown>; onClose(): void }) {
  const [date, setDate] = useState(displayDate(initialDate ?? localDate())); const [value, setValue] = useState(maskMoney(inputMoney(amountCents)));
  const [errors, setErrors] = useState<Record<string, string>>({}); const [calendar, setCalendar] = useState(false);
  const task = useTask(); const locked = useRef(false); const dateRef = useRef<InputHandle>(null); const valueRef = useRef<InputHandle>(null);
  async function confirm() {
    if (locked.current) return;
    const errors: Record<string, string> = {}; let civil = '', cents = 0;
    try { civil = parseDate(date); if (civil > localDate()) throw Error(); } catch { errors.date = 'Informe a data efetiva, até hoje.'; }
    try { cents = parseMoney(value); } catch { errors.value = 'Informe um valor maior que zero.'; }
    setErrors(errors); if (Object.keys(errors).length) { if (errors.date) dateRef.current?.focus(); else valueRef.current?.focus(); return; }
    locked.current = true; if (await task.run(() => onConfirm(civil, cents))) onClose(); else locked.current = false;
  }
  if (calendar) return <DatePicker value={date} maximumDate={localDate()} onClose={() => setCalendar(false)} onSelect={civil => { setDate(displayDate(civil)); setCalendar(false); }} />;
  return <Sheet title={correction ? 'Corrigir lançamento efetivo' : 'Confirmar movimentação'} onClose={() => { if (!locked.current) onClose(); }} footer={<><ErrorText error={task.error} /><Button label={correction ? 'Confirmar correção' : 'Confirmar pagamento ou recebimento'} loading={task.busy} onPress={() => { void confirm(); }} /></>}>
    <Text style={ui.label}>{description}</Text><Text style={ui.text}>{correction ? 'Atualiza o lançamento vinculado, sem criar outro.' : 'Confira os dados. A confirmação registra uma Transação no Extrato e altera seu saldo.'}</Text>
    <Field ref={dateRef} label="Data efetiva (DD/MM/AAAA)" value={date} onChangeText={setDate} error={errors.date} maxLength={10} editable={!task.busy} />
    <Button label="Escolher data efetiva no calendário" secondary disabled={task.busy} onPress={() => setCalendar(true)} />
    <Field ref={valueRef} label="Valor efetivo (R$)" keyboardType="number-pad" value={value} onChangeText={v => setValue(maskMoney(v))} error={errors.value} editable={!task.busy} />
    <Button label="Cancelar" secondary disabled={task.busy} onPress={onClose} />
  </Sheet>;
}
