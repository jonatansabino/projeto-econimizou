import { useState } from 'react';
import { Text, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Button, ConfirmDelete, Empty, ErrorText, Field, IconButton, Sheet, ui, useTask } from '@/components/ui';
import { inputMoney, parseMoney, type Recommendation } from '@/domain/features';
import { formatMoney, type Goal } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export default function GoalsScreen() {
  const { data, deleteGoal } = useFinance();
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const money = (amount: number) => data.preferences.hideAmounts ? '••••••' : formatMoney(amount);
  const recommendations = data.recommendations.filter((item) => item.status === 'pending' || showReviewed);
  return <Screen title="Cada sonho, um plano." description="Dê um destino ao que você guarda, no seu ritmo.">
    <Button label="Nova Meta" icon="add" onPress={() => setEditing('new')} />
    <Text style={ui.text}>Reservas demonstrativas, atualizadas por você. Criar ou editar metas não movimenta o saldo do extrato.</Text>
    {!data.goals.length && <Empty text="Qual é sua próxima conquista? Crie sua primeira meta." />}
    {data.goals.map((goal) => {
      const percent = Math.min(100, goal.savedCents / goal.targetCents * 100);
      return <View style={ui.card} key={goal.id}>
        <View style={ui.between}><Text style={ui.title}>{goal.name}</Text><IconButton label={`Editar meta: ${goal.name}`} icon="create-outline" onPress={() => setEditing(goal)} /></View>
        <Text style={ui.success}>{percent.toFixed(0)}% {percent >= 100 ? '· Meta alcançada! 🎉' : 'do caminho percorrido'}</Text>
        <ProgressBar value={percent} label={`Progresso de ${goal.name}`} />
        <Text style={ui.text}>{money(goal.savedCents)} de {money(goal.targetCents)}</Text>
        <Text style={ui.text}>Faltam {money(Math.max(0, goal.targetCents - goal.savedCents))} para sua conquista.</Text>
        <Button label={`Excluir meta: ${goal.name}`} secondary danger onPress={() => setDeleting(goal)} />
      </View>;
    })}
    <Text style={ui.title}>Ideias para economizar</Text>
    <Text style={ui.text}>Sugestões simuladas. Aceitar adiciona ao seu plano, sem transferir dinheiro ou alterar suas reservas.</Text>
    {recommendations.length ? recommendations.map((item) => <RecommendationCard key={item.id} recommendation={item} />) : <Empty text="Você já avaliou todas as sugestões. Veja as avaliadas para consultar seu plano." />}
    <Button label={showReviewed ? 'Ocultar sugestões avaliadas' : 'Ver sugestões avaliadas'} secondary onPress={() => setShowReviewed(!showReviewed)} />
    {editing && <GoalEditor goal={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    {deleting && <ConfirmDelete title={deleting.name} onCancel={() => setDeleting(null)} onConfirm={() => deleteGoal(deleting.id)} />}
  </Screen>;
}
function GoalEditor({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { saveGoal } = useFinance();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? inputMoney(goal.targetCents) : '');
  const [saved, setSaved] = useState(goal ? inputMoney(goal.savedCents) : '0,00');
  const task = useTask();
  return <Sheet title={goal ? 'Editar meta' : 'Criar meta'} onClose={onClose}>
    <Field label="Nome da meta" placeholder="Ex.: viagem de férias" value={name} onChangeText={setName} maxLength={100} />
    <Field label="Valor desejado (R$)" placeholder="0,00" keyboardType="decimal-pad" value={target} onChangeText={setTarget} />
    <Field label="Já guardado (R$)" placeholder="0,00" keyboardType="decimal-pad" value={saved} onChangeText={setSaved} />
    <Text style={ui.text}>Informe o total reservado até agora. Este acompanhamento não cria uma Transação.</Text>
    <ErrorText error={task.error} />
    <Button label="Salvar meta" loading={task.busy} onPress={() => { void task.run(() => saveGoal({ name, targetCents: parseMoney(target), savedCents: parseMoney(saved, true) }, goal?.id)).then((ok) => { if (ok) onClose(); }); }} />
  </Sheet>;
}
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { decideRecommendation } = useFinance();
  const task = useTask();
  return <View style={ui.card}>
    <Text style={ui.label}>{recommendation.title}</Text><Text style={ui.text}>{recommendation.description}</Text>
    {recommendation.status === 'pending' ? <View style={ui.gap}>
      <Button label={`Aceitar: ${recommendation.title}`} loading={task.busy} onPress={() => { void task.run(() => decideRecommendation(recommendation.id, 'accepted')); }} />
      <Button label={`Ignorar: ${recommendation.title}`} secondary disabled={task.busy} onPress={() => { void task.run(() => decideRecommendation(recommendation.id, 'ignored')); }} />
    </View> : <Text style={recommendation.status === 'accepted' ? ui.success : ui.text}>{recommendation.status === 'accepted' ? '✓ No seu plano' : 'Sugestão ignorada'}</Text>}
    <ErrorText error={task.error} />
  </View>;
}
