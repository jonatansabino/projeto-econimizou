import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Empty, ErrorText, ui, useTask } from '@/components/ui';
import { displayDate } from '@/domain/features';
import { useFinance } from '@/state/finance-context';

export default function NotificationsScreen() {
  const { data, markNotificationsRead } = useFinance();
  const task = useTask();
  const unread = data.notifications.filter((item) => !item.read).length;
  return <Screen title="Notificações" description="Seus avisos ficam por aqui. Todos são simulados dentro do app." back>
    {!data.preferences.notificationsEnabled && <Text style={ui.text}>Novos avisos estão desativados em Ajustes. Os avisos anteriores continuam disponíveis.</Text>}
    <Button label="Marcar todas como lidas" secondary loading={task.busy} disabled={!unread} onPress={() => { void task.run(markNotificationsRead, 'Todas as notificações foram marcadas como lidas.'); }} />
    <ErrorText error={task.error} />{task.success && <Text accessibilityRole="alert" style={ui.success}>{task.success}</Text>}
    {!data.notifications.length && <Empty text="Tudo tranquilo por aqui. Novos avisos aparecerão nesta central." />}
    {[...data.notifications].reverse().map((item) => <View style={ui.card} key={item.id}>
      <View style={ui.between}><Text style={ui.label}>{item.title}</Text><Text style={item.read ? ui.text : ui.success}>{item.read ? 'Lida' : 'Nova'}</Text></View>
      <Text style={ui.text}>{item.body}</Text><Text style={ui.text}>{displayDate(item.date)}</Text>
    </View>)}
  </Screen>;
}
