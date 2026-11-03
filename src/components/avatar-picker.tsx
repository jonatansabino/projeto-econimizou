import { Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { avatarCatalog, resolveAvatar } from '@/domain/avatar';

export function AvatarPicker({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const selected = resolveAvatar(value);
  return <View style={{ gap: 16 }}>
    <Text style={ui.label}>Escolha seu avatar</Text>
    <View style={{ alignItems: 'center', gap: 8 }}>
      <ProfileAvatar value={selected.id} size={88} label={`Prévia do avatar ${selected.name}`} />
      <Text accessibilityLiveRegion="polite" style={ui.success}>Selecionado: {selected.name}</Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
      {avatarCatalog.map((avatar) => <Pressable key={avatar.id} accessibilityRole="button" accessibilityLabel={`Escolher avatar ${avatar.name}`} accessibilityState={{ selected: selected.id === avatar.id, disabled }} aria-pressed={selected.id === avatar.id} disabled={disabled}
        onPress={() => onChange(avatar.id)} style={({ pressed }) => ({ width: '30%', minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 16, borderWidth: 2, borderColor: selected.id === avatar.id ? colors.primary : colors.border, backgroundColor: selected.id === avatar.id ? '#173C30' : colors.surface, opacity: pressed || disabled ? 0.6 : 1 })}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none"><ProfileAvatar value={avatar.id} size={48} label={avatar.name} /></View>
        <Text style={{ color: selected.id === avatar.id ? colors.primary : colors.muted, fontSize: 11 }}>{avatar.name}</Text>
      </Pressable>)}
    </View>
    <Text style={ui.text}>Avatares Adventurer por Lisa Wischofsky / DiceBear. Créditos em Segurança e privacidade.</Text>
  </View>;
}
