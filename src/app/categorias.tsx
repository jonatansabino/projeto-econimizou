import { useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Chips, ConfirmDelete, Empty, ErrorText, Field, IconButton, Sheet, ui, useTask } from '@/components/ui';
import { type Category, type TransactionType } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export default function CategoriesScreen() {
  const { data, deleteCategory } = useFinance();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  return <Screen title="Categorias" description="Organize cada movimento de um jeito que faça sentido para você." back>
    <Button label="Nova categoria" icon="add" onPress={() => setEditing('new')} />
    <Text style={ui.text}>Categorias em uso podem ser renomeadas. Para excluir ou mudar o tipo, primeiro ajuste as transações e as propostas pendentes do chat.</Text>
    {!data.categories.length && <Empty text="Crie categorias de receita e despesa para começar." />}
    {(['expense', 'income'] as const).map((type) => <View key={type} style={ui.card}>
      <Text style={ui.title}>{type === 'expense' ? 'Despesas' : 'Receitas'}</Text>
      {data.categories.filter((item) => item.type === type).map((category) => <View key={category.id} style={ui.between}>
        <Text style={[ui.label, { flex: 1 }]}>{category.name}</Text>
        <IconButton label={`Editar categoria: ${category.name}`} icon="create-outline" onPress={() => setEditing(category)} />
        <IconButton label={`Excluir categoria: ${category.name}`} icon="trash-outline" onPress={() => setDeleting(category)} />
      </View>)}
    </View>)}
    {editing && <CategoryEditor category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    {deleting && <ConfirmDelete title={deleting.name} onCancel={() => setDeleting(null)} onConfirm={() => deleteCategory(deleting.id)} />}
  </Screen>;
}
function CategoryEditor({ category, onClose }: { category?: Category; onClose: () => void }) {
  const { saveCategory } = useFinance();
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<TransactionType>(category?.type ?? 'expense');
  const task = useTask();
  return <Sheet title={category ? 'Editar categoria' : 'Criar categoria'} onClose={onClose}>
    <Field label="Nome da categoria" placeholder="Ex.: educação" value={name} onChangeText={setName} maxLength={60} />
    <Chips label="Tipo da categoria" value={type} onChange={(next) => setType(next as TransactionType)} options={[{ label: 'Despesa', value: 'expense' }, { label: 'Receita', value: 'income' }]} />
    <ErrorText error={task.error} />
    <Button label="Salvar categoria" loading={task.busy} onPress={() => { void task.run(() => saveCategory({ name, type }, category?.id)).then((ok) => { if (ok) onClose(); }); }} />
  </Sheet>;
}
