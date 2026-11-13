import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PersonalizationFields } from '@/components/personalization-fields';
import { ProfileImageControl, ProfileImagePanel } from '@/components/profile-image-editor';
import { useProfileImageEditor } from '@/state/use-profile-image-editor';
import { useFinance } from '@/state/finance-context';
import { Screen } from '@/components/screen';
import { Button, ErrorText, Sheet, ui, useTask } from '@/components/ui';
import { ApiError } from '@/domain/auth';
import { personalizationDraft, validatePersonalization } from '@/domain/personalization';
import { useAuth } from '@/state/auth-context';

export default function PersonalizationScreen() {
  const auth = useAuth();
  const { data, updateProfile } = useFinance();
  const imageEditor = useProfileImageEditor(data.profile);
  const [draft, setDraft] = useState(() => personalizationDraft(auth.user?.personalization));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locked = useRef(false);
  const task = useTask();
  async function save(skip = false) {
    if (locked.current) return;
    const result = validatePersonalization(draft);
    setErrors(skip ? {} : result.errors);
    if (!skip && !result.input) return;
    locked.current = true;
    const ok = await task.run(async () => {
      try {
        if (skip) await auth.updateProfile({ personalization_completed: true });
        else await imageEditor.save(data.profile.name, updateProfile, avatar => auth.updateProfile({ ...result.input, avatar, personalization_completed: true }));
      } catch (error) {
        if (skip && error instanceof ApiError && (error.status === 0 || error.status >= 500)) { auth.dismissPersonalization(); return; }
        if (error instanceof ApiError) setErrors(error.errors);
        throw error;
      }
    });
    if (!ok) locked.current = false;
  }
  return <Screen bottomSafe title="Vamos personalizar seu Economizou?" description="Tudo aqui é opcional. Você pode ajustar essas informações depois em Editar Perfil.">
    <ProfileImageControl editor={imageEditor} disabled={task.busy} />
    <View style={ui.card}><PersonalizationFields value={draft} onChange={value => { setDraft(value); setErrors({}); }} errors={errors} disabled={task.busy} /></View>
    <Text style={ui.text}>Esses dados ficam associados ao seu perfil. Não usamos sua idade para gerar recomendações.</Text>
    <ErrorText error={task.error} />
    <Button label="Continuar" loading={task.busy} onPress={() => { void save(); }} />
    <Button label="Pular Por Enquanto" secondary disabled={task.busy} onPress={() => { void save(true); }} />
    {imageEditor.mode !== 'idle' && <Sheet title="Alterar imagem do perfil" onClose={imageEditor.cancelStep}><ProfileImagePanel editor={imageEditor} /></Sheet>}
  </Screen>;
}
