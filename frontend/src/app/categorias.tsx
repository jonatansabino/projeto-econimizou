import { useRef, useState } from 'react';
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
    <Button label="Nova Categoria" icon="add" onPress={() => setEditing('new')} />
    {/* <View style={ui.card}><Text style={ui.label}>Categorias da sua conta no banco</Text><Text style={ui.text}>Novos cadastros, alterações e exclusões são confirmados pela API. Sem conexão, você pode consultar a cópia salva neste aparelho.</Text><ErrorText error={categoryError ?? sync.error} /><Button label="Atualizar categorias do banco" loading={sync.busy} secondary onPress={() => { if (!sync.busy) void sync.run(refreshCategories); }} />
      {sync.success && <Text style={ui.success}>{sync.success}</Text>}
    </View> */}
    {/* <Text style={ui.text}>Categorias em uso podem ser renomeadas. Para excluir, ajuste primeiro os registros vinculados. O tipo de uma categoria salva no banco é fixo; crie outra para usar um tipo diferente.</Text> */}
    {!data.categories.some(c => !c.archived) && <Empty text="Crie categorias de receita e despesa para começar." />}
    {(['expense', 'income'] as const).map((type) => <View key={type} style={ui.card}>
      <Text style={ui.title}>{type === 'expense' ? 'Despesas' : 'Receitas'}</Text>
      {data.categories.filter((item) => item.type === type && !item.archived).map((category) => <View key={category.id} style={ui.between}>
        <View style={{ flex: 1 }}><Text style={ui.label}>{category.name}</Text><Text style={ui.text}>Salva no banco</Text></View>
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
  const task = useTask(); const locked = useRef(false);
  return <Sheet title={category ? 'Editar categoria' : 'Criar categoria'} onClose={() => { if (!locked.current) onClose(); }}>
    <Field label="Nome da categoria" placeholder="Ex.: educação" value={name} editable={!task.busy} onChangeText={setName} maxLength={60} />
    {category?.remoteId ? <Text style={ui.text}>Tipo: {type === 'income' ? 'Receita' : 'Despesa'}. Para mudar o tipo, crie outra categoria.</Text> : <Chips label="Tipo da categoria" value={type} onChange={(next) => { if (!task.busy) setType(next as TransactionType); }} options={[{ label: 'Despesa', value: 'expense' }, { label: 'Receita', value: 'income' }]} />}
    <ErrorText error={task.error} />
    <Button label="Salvar categoria" loading={task.busy} onPress={() => { if (locked.current) return; locked.current = true; void task.run(() => saveCategory({ name, type }, category?.id)).then(ok => { if (ok) onClose(); else locked.current = false; }); }} />
  </Sheet>;
}
