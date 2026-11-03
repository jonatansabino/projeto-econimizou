import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { ProfileAvatar } from '@/components/profile-avatar';
import { resolveAvatar } from '@/domain/avatar';
import { Screen } from '@/components/screen';
import { Button, ErrorText, Field, Sheet, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useFinance } from '@/state/finance-context';

export default function SettingsScreen() {
  const { data, updatePreferences } = useFinance();
  const [profileOpen, setProfileOpen] = useState(false);
  const task = useTask();
  const unread = data.notifications.filter((item) => !item.read).length;
  return <Screen title="Do seu jeito." description="Seu perfil, suas preferências e seus dados.">
    <View style={ui.card}><View style={ui.row}><ProfileAvatar value={data.profile.avatar} size={64} label={`Avatar de ${data.profile.name}`} /><View style={{ flex: 1 }}><Text style={ui.title}>{data.profile.name}</Text><Text style={ui.text}>Perfil local · conta demonstrativa</Text></View></View><Button label="Editar perfil" secondary icon="create-outline" onPress={() => setProfileOpen(true)} /></View>
    <View style={ui.card}>
      <Text style={ui.title}>Preferências</Text>
      <Preference label="Ocultar valores" description="Oculta valores em cards, listas, relatórios e propostas do chat. Formulários de edição continuam visíveis." value={data.preferences.hideAmounts} disabled={task.busy} onChange={(value) => { void task.run(() => updatePreferences({ hideAmounts: value })); }} />
      <Preference label="Notificações simuladas" description="Receba novos avisos na central do app. Não envia notificações do sistema." value={data.preferences.notificationsEnabled} disabled={task.busy} onChange={(value) => { void task.run(() => updatePreferences({ notificationsEnabled: value })); }} />
      <Preference label="Animações suaves" description="Transições de tela e barras de progresso." value={data.preferences.animationsEnabled} disabled={task.busy} onChange={(value) => { void task.run(() => updatePreferences({ animationsEnabled: value })); }} />
      <ErrorText error={task.error} />
    </View>
    <Button label={`Central de notificações${unread ? ` (${unread} não lidas)` : ''}`} secondary icon="notifications-outline" onPress={() => router.push('/notificacoes')} />
    <Button label="Gerenciar categorias" secondary icon="pricetags-outline" onPress={() => router.push('/categorias')} />
    <Button label="Segurança e privacidade" secondary icon="shield-checkmark-outline" onPress={() => router.push('/privacidade')} />
    <Button label="Ver tutorial novamente" secondary icon="book-outline" onPress={() => router.push({ pathname: '/onboarding', params: { replay: '1' } })} />
    <Text style={ui.text}>Econimizou 1.0 · tema escuro{ '\n' }Feito para organizar suas finanças, sem conexão com bancos.</Text>
    {profileOpen && <ProfileEditor onClose={() => setProfileOpen(false)} />}
  </Screen>;
}
function Preference({ label, description, value, disabled, onChange }: { label: string; description: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <View style={ui.between}><View style={{ flex: 1, gap: 4 }}><Text style={ui.label}>{label}</Text><Text style={ui.text}>{description}</Text></View><Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.border, true: '#23674F' }} thumbColor={value ? colors.primary : colors.muted} /></View>;
}
function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { data, updateProfile } = useFinance();
  const [name, setName] = useState(data.profile.name);
  const [avatar, setAvatar] = useState<string>(() => resolveAvatar(data.profile.avatar).id);
  const task = useTask();
  return <Sheet title="Editar perfil" onClose={onClose} footer={<>
    <ErrorText error={task.error} />
    <Button label="Salvar perfil" loading={task.busy} onPress={() => { void task.run(() => updateProfile({ name, avatar })).then((ok) => { if (ok) onClose(); }); }} />
  </>}>
    <Field label="Seu nome" editable={!task.busy} value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" />
    <AvatarPicker value={avatar} onChange={setAvatar} disabled={task.busy} />
  </Sheet>;
}
