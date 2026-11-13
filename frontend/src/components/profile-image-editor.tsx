import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Button, ErrorText, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import type { ProfileImageEditor } from '@/state/use-profile-image-editor';

export function ProfileImageControl({ editor, disabled = false }: { editor: ProfileImageEditor; disabled?: boolean }) {
  return <View style={{ alignItems: 'center', gap: 10 }}>
    <View style={{ width: 104, height: 104 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar imagem do perfil" disabled={disabled} onPress={editor.open} style={({ pressed }) => ({ width: 104, height: 104, alignItems: 'center', justifyContent: 'center', opacity: disabled || pressed ? 0.55 : 1 })}>
        <ProfileAvatar value={editor.draft.avatar} photoRef={editor.draft.photoRef} photoUri={editor.draft.staged?.uri} size={96} label="Prévia da imagem do perfil" />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Alterar foto de perfil" disabled={disabled} onPress={editor.open} style={({ pressed }) => ({ position: 'absolute', bottom: -2, right: -2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled || pressed ? 0.55 : 1 })}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera-outline" size={19} color={colors.background} /></View>
      </Pressable>
    </View>
    <Text style={ui.text}>Toque para alterar sua imagem</Text>
    <Text style={[ui.text, { textAlign: 'center' }]}>Fotos ficam somente neste aparelho ou navegador.</Text>
    {editor.mode === 'idle' && <ErrorText error={editor.error} />}
  </View>;
}
export function ProfileImagePanel({ editor }: { editor: ProfileImageEditor }) {
  const cancel = <Button label="Cancelar" secondary onPress={editor.cancelStep} />;
  if (editor.mode === 'avatars') return <>
    <AvatarPicker value={editor.galleryAvatar} onChange={editor.setGalleryAvatar} />
    <Button label="Usar avatar" onPress={editor.useAvatar} />{cancel}
  </>;
  if (editor.mode === 'preview' && editor.candidate) return <>
    <View style={{ alignItems: 'center' }}><ProfileAvatar value={editor.draft.avatar} photoUri={editor.candidate.uri} size={160} label="Prévia da foto escolhida" /></View>
    <Text style={ui.text}>Confira o recorte. A imagem só será salva ao finalizar o formulário.</Text>
    <Button label="Usar foto" onPress={editor.usePhoto} />{cancel}
  </>;
  if (editor.mode === 'remove') return <>
    <Text style={ui.text}>Remover a foto personalizada e restaurar o último avatar? A alteração será salva ao finalizar o formulário.</Text>
    <Button label="Confirmar remoção da foto" secondary danger onPress={editor.removePhoto} />{cancel}
  </>;
  if (editor.mode === 'picking') return <><Text style={ui.text}>Escolha uma imagem no seletor do sistema. Se você já fechou a janela, toque em Cancelar.</Text>{cancel}</>;
  return <>
    <Button label="Escolher avatar" secondary icon="happy-outline" onPress={editor.chooseAvatar} />
    <Button label="Escolher foto da galeria" secondary icon="images-outline" onPress={() => { void editor.pick(); }} />
    <Button label="Remover foto personalizada" secondary danger disabled={!editor.hasPhoto} icon="trash-outline" onPress={editor.requestRemoval} />
    <ErrorText error={editor.error} />
    {editor.permissionError && Platform.OS !== 'web' && <Button label="Abrir ajustes do sistema" secondary onPress={() => { void Linking.openSettings().catch(() => {}); }} />}
    <Text style={ui.text}>JPEG, PNG ou WebP até 10 MB. HEIC/HEIF também é aceito nos aparelhos compatíveis.</Text>
    {cancel}
  </>;
}
