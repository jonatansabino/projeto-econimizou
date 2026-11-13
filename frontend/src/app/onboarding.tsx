import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';

import type { InputHandle } from '@/components/keyboard-scroll';
import { ProgressBar } from '@/components/progress-bar';
import { Screen } from '@/components/screen';
import { Button, ErrorText, Field, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useFinance } from '@/state/finance-context';
import { useAuth } from '@/state/auth-context';

const slides = [
  { title: 'Boas-vindas ao Econimizou', description: 'Seu dinheiro, mais leve. Um espaço para cuidar do presente e planejar o futuro.', icon: 'leaf-outline' as const },
  { title: 'Organize suas receitas e despesas', description: 'Registre cada movimento, escolha uma categoria e acompanhe o que entra e sai no Extrato.', icon: 'wallet-outline' as const },
  { title: 'Acompanhe seus gastos e metas', description: 'Entenda seus hábitos com relatórios e transforme suas conquistas em metas com progresso.', icon: 'flag-outline' as const },
  { title: 'Conheça o assistente financeiro', description: 'Diga “Gastei R$ 45 no almoço”. O assistente simulado prepara o registro e você confirma antes de salvar.', icon: 'chatbubble-ellipses-outline' as const },
];
export default function OnboardingScreen() {
  const { data, completeOnboarding } = useFinance();
  const auth = useAuth();
  const replay = data.onboarding?.completed !== false;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(auth.user?.name ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const field = useRef<InputHandle>(null);
  const locked = useRef(false);
  const task = useTask();
  const slide = slides[step];
  function closeReplay() { if (router.canGoBack()) router.back(); else router.replace('/configuracoes'); }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) { setStep(step - 1); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [step]);
  async function finish() {
    if (replay) { closeReplay(); return; }
    if (locked.current) return;
    if (!name.trim()) { setNameError('Como podemos chamar você? Informe seu nome.'); requestAnimationFrame(() => field.current?.focus()); return; }
    locked.current = true;
    const ok = await task.run(async () => { await auth.updateProfile({ name: name.trim(), avatar: data.profile.avatar }); await completeOnboarding(name); });
    if (ok) router.replace('/'); else locked.current = false;
  }
  return <Screen bottomSafe title={slide.title} description={slide.description}>
    <View style={[ui.card, { alignItems: 'center', paddingVertical: 28 }]}><Ionicons name={slide.icon} color={colors.primary} size={64} /><Text style={ui.text}>Etapa {step + 1} de 4</Text><View style={{ width: '100%' }}><ProgressBar value={(step + 1) * 25} label="Progresso da apresentação" /></View></View>
    {step === 0 && <Text style={ui.text}>Receitas, despesas e categorias ficam na sua conta. Cadastre suas próprias categorias para começar.</Text>}
    {step === 3 && (replay ? <Text style={ui.text}>Tudo pronto, {data.profile.name}. Este tutorial não altera seu perfil nem seus registros.</Text> : <Field ref={field} label="Como podemos chamar você?" placeholder="Seu nome" maxLength={60} autoCapitalize="words" value={name} onChangeText={(value) => { setName(value); setNameError(undefined); }} error={nameError} onSubmitEditing={() => { void finish(); }} />)}
    <ErrorText error={task.error} />
    {step < 3 ? <Button label="Próximo" icon="arrow-forward" onPress={() => setStep(step + 1)} /> : <Button label={replay ? 'Concluir tutorial' : 'Começar'} icon="checkmark" loading={task.busy} onPress={() => { void finish(); }} />}
    {step > 0 && <Button label="Voltar" secondary disabled={task.busy} onPress={() => setStep(step - 1)} />}
    {step < 3 && <Button label="Pular" secondary onPress={() => replay ? closeReplay() : setStep(3)} />}
    {replay && <Button label="Voltar aos Ajustes" secondary onPress={closeReplay} />}
  </Screen>;
}
