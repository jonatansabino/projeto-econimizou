import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorText, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { displayDate, type ChatMessage } from '@/domain/features';
import { formatMoney } from '@/domain/finance';
import { useFinance } from '@/state/finance-context';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const { data, sendMessage } = useFinance();
  const [text, setText] = useState('');
  const task = useTask();
  const list = useRef<FlatList<ChatMessage>>(null);
  async function send(value = text) {
    if (task.busy || !value.trim()) return;
    const ok = await task.run(() => sendMessage(value));
    if (ok) setText('');
  }
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
      <View style={[styles.header, (keyboardOpen || height <= 550) && { paddingVertical: 12 }]}><View style={ui.row}><Ionicons name="sparkles" size={25} color={colors.primary} /><Text accessibilityRole="header" style={ui.title}>Seu assistente</Text></View>{!keyboardOpen && height > 550 && <Text style={ui.text}>Simulado · funciona localmente · sem IA externa</Text>}</View>
      <FlatList ref={list} style={{ flex: 1 }} data={data.chatMessages} keyExtractor={(item) => item.id} renderItem={({ item }) => <Message message={item} />}
        contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: data.preferences.animationsEnabled })} />
      <View style={styles.composer}>
        <ErrorText error={task.error} />
        {!keyboardOpen && height > 550 && <View style={ui.row}><Button label="Meu saldo" secondary disabled={task.busy} onPress={() => { void send('Qual é meu saldo?'); }} /><Button label="Dica de economia" secondary disabled={task.busy} onPress={() => { void send('Como economizar?'); }} /></View>}
        <TextInput accessibilityLabel="Mensagem para o assistente" placeholder="Gastei R$ 45 no almoço" placeholderTextColor={colors.muted} value={text} onChangeText={setText} maxLength={1000} multiline editable={!task.busy} style={[ui.input, { maxHeight: 120 }]} />
        <Button label="Enviar mensagem" icon="send-outline" loading={task.busy} disabled={!text.trim()} onPress={() => { void send(); }} />
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function Message({ message }: { message: ChatMessage }) {
  const { data, resolveProposal } = useFinance();
  const task = useTask();
  const proposal = message.proposal;
  const goal = message.goalProposal;
  const category = data.categories.find((item) => item.id === proposal?.categoryId);
  const user = message.role === 'user';
  const text = data.preferences.hideAmounts ? message.text.replace(/R\$\s*[\d.,]+/g, 'R$ ••••••') : message.text;
  return <View style={[styles.bubble, user ? styles.user : styles.assistant]}>
    <Text style={styles.role}>{user ? 'VOCÊ' : 'ECONIMIZOU'}</Text>
    <Text selectable style={styles.message}>{text}</Text>
    {proposal && <View style={styles.proposal}>
      <Text style={ui.label}>{proposal.type === 'expense' ? 'Despesa' : 'Receita'} · {proposal.description}</Text>
      <Text style={styles.proposalAmount}>{data.preferences.hideAmounts ? '••••••' : formatMoney(proposal.amountCents)}</Text>
      <Text style={ui.text}>{category?.name ?? 'Categoria removida'} · {displayDate(proposal.date)}</Text>
      {message.status === 'pending' ? <>
        <Text style={ui.text}>Confirma o registro desta transação?</Text>
        <Button label="Confirmar registro" icon="checkmark" loading={task.busy} onPress={() => { void task.run(() => resolveProposal(message.id, true)); }} />
        <Button label="Cancelar registro" secondary disabled={task.busy} onPress={() => { void task.run(() => resolveProposal(message.id, false)); }} />
      </> : <Text style={message.status === 'confirmed' ? ui.success : ui.text}>{message.status === 'confirmed' ? '✓ Registro confirmado' : 'Registro cancelado'}</Text>}
      <ErrorText error={task.error} />
    </View>}
    {goal && <View style={styles.proposal}>
      <Text style={ui.label}>Meta de economia · {goal.name}</Text>
      <Text style={styles.proposalAmount}>{data.preferences.hideAmounts ? '••••••' : formatMoney(goal.targetCents)}</Text>
      <Text style={ui.text}>Valor já guardado: {data.preferences.hideAmounts ? '••••••' : formatMoney(goal.savedCents)}</Text>
      <Text style={ui.text}>Criar uma meta não movimenta o saldo ou registra uma despesa.</Text>
      {message.status === 'pending' ? <>
        <Button label="Confirmar criação da meta" icon="flag-outline" loading={task.busy} onPress={() => { void task.run(() => resolveProposal(message.id, true)); }} />
        <Button label="Cancelar criação da meta" secondary disabled={task.busy} onPress={() => { void task.run(() => resolveProposal(message.id, false)); }} />
      </> : <Text style={message.status === 'confirmed' ? ui.success : ui.text}>{message.status === 'confirmed' ? '✓ Meta criada' : 'Criação da meta cancelada'}</Text>}
      <ErrorText error={task.error} />
    </View>}

  </View>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, width: '100%', maxWidth: 688, alignSelf: 'center' },
  header: { padding: 24, gap: 8, borderBottomColor: colors.border, borderBottomWidth: 1 },
  messages: { padding: 20, gap: 16 },
  bubble: { padding: 18, borderRadius: 22, gap: 10, maxWidth: '94%' },
  user: { backgroundColor: '#194434', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  assistant: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: colors.border },
  role: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  message: { color: colors.text, fontSize: 15, lineHeight: 24 },
  composer: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  proposal: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  proposalAmount: { color: colors.primary, fontSize: 25, fontWeight: '700' },
});
