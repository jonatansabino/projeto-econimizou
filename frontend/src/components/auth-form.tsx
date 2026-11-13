import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AuthScreen } from '@/components/auth-screen';
import type { InputHandle } from '@/components/keyboard-scroll';
import { Button, ErrorText, Field, PasswordToggle, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ApiError, validateAuthForm } from '@/domain/auth';
import { passwordStrength } from '@/domain/personalization';
import { useAuth } from '@/state/auth-context';

function SocialButton({ provider, disabled, onPress }: { provider: 'Google' | 'Outlook'; disabled: boolean; onPress: () => void }) {
  const label = `Continuar com ${provider}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.socialButton, (pressed || disabled) && { opacity: 0.55 }]}>
    <Svg width={22} height={22} viewBox={provider === 'Google' ? '0 0 24 24' : '0 0 432 432'}>
      {provider === 'Google' ? <>
        <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.75 3.27-8.1Z" />
        <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.87 0-5.3-1.94-6.17-4.54H2.15v2.84A11 11 0 0 0 12 23Z" />
        <Path fill="#FBBC05" d="M5.83 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.35-2.1V7.06H2.15a11 11 0 0 0 0 9.88l3.68-2.84Z" />
        <Path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.58 10.58 0 0 0 12 1a11 11 0 0 0-9.85 6.06L5.83 9.9C6.7 7.3 9.13 5.36 12 5.36Z" />
      </> : <Path fill="#0078D4" d="M267 93h145q4 0 9.5 5t5.5 12l-127 85h-4l-29-18zm0 115l27 18q2 1 4 1h3l1-1q-2 1 29-19.5t64-41.5l32-21v153q0 12-6.5 18t-16.5 6H267zm-139-39q13 0 20.5 12.5T156 216t-7.5 34t-21.5 12q-13 0-21-12.5T98 216t8-34t22-13M0 51L251 3v426L0 377zm168 218q16-21 16-54t-15.5-53.5T128 141q-26 0-42 21t-16 56q0 32 16 52t41 20t41-21" />}
    </Svg>
    <Text style={styles.socialText}>{label}</Text>
  </Pressable>;
}

export function AuthForm({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [socialMessage, setSocialMessage] = useState('');
  const nameRef = useRef<InputHandle>(null);
  const emailRef = useRef<InputHandle>(null);
  const passwordRef = useRef<InputHandle>(null);
  const confirmationRef = useRef<InputHandle>(null);
  const task = useTask();
  const strength = passwordStrength(password);
  const focusInvalid = (validation: Record<string, string>) => (validation.name ? nameRef : validation.email ? emailRef : validation.password ? passwordRef : confirmationRef).current?.focus();
  const locked = useRef(false);
  async function submit() {
    if (locked.current) return;
    const data = { name: name.trim(), email: email.trim(), password, password_confirmation: confirmation };
    const validation = validateAuthForm(data, register);
    setErrors(validation);
    if (Object.keys(validation).length) {
      focusInvalid(validation);
      return;
    }
    locked.current = true;
    await task.run(async () => {
      try {
        await (register ? auth.register(data) : auth.login(data));
        setPassword(''); setConfirmation('');
      } catch (error) {
        if (error instanceof ApiError) { setErrors(error.errors); if (Object.keys(error.errors).length) requestAnimationFrame(() => focusInvalid(error.errors)); }
        throw error;
      }
    });
    locked.current = false;
  }
  return <AuthScreen title={register ? 'Crie sua conta.' : 'Seu dinheiro, mais leve.'} description={register ? 'Um novo começo para organizar suas finanças.' : 'Entre para acompanhar suas finanças e seus planos.'}>
    <View style={ui.card}>
      {register && <Field ref={nameRef} label="Nome completo" value={name} onChangeText={setName} error={errors.name} maxLength={60} autoCapitalize="words" textContentType="name" editable={!task.busy} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />}
      <Field ref={emailRef} label="E-mail" value={email} onChangeText={setEmail} error={errors.email} maxLength={254} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" editable={!task.busy} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label="Senha" value={password} onChangeText={(value) => { setPassword(value); if (!value) setVisible(false); }} error={errors.password} secureTextEntry={!visible} trailingAccessory={password.length > 0 ? <PasswordToggle visible={visible} onPress={() => setVisible((value) => !value)} /> : undefined} maxLength={72} autoCapitalize="none" autoCorrect={false} textContentType={register ? 'newPassword' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} editable={!task.busy} returnKeyType={register ? 'next' : 'go'} onSubmitEditing={() => register ? confirmationRef.current?.focus() : void submit()} />
      {register && !!password && <View style={{ gap: 6 }}>
        <View accessibilityRole="progressbar" accessibilityLabel="Força da senha" accessibilityValue={{ min: 0, max: 4, now: strength.score, text: strength.label }} style={{ flexDirection: 'row', gap: 5 }}>
          {[1, 2, 3, 4].map(level => <View key={level} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: level <= strength.score ? strength.score === 1 ? '#FDA4AF' : colors.primary : colors.border }} />)}
        </View><Text style={ui.text}>Força da senha: {strength.label}</Text><Text style={ui.text}>Use ao menos 8 caracteres. Evite dados pessoais, sequências e senhas comuns. A validação final é feita ao criar sua conta.</Text>
      </View>}
      {register && <Field ref={confirmationRef} label="Confirmar senha" value={confirmation} onChangeText={(value) => { setConfirmation(value); if (!value) setConfirmationVisible(false); }} error={errors.password_confirmation} secureTextEntry={!confirmationVisible} trailingAccessory={confirmation.length > 0 ? <PasswordToggle visible={confirmationVisible} confirmation onPress={() => setConfirmationVisible((value) => !value)} /> : undefined} maxLength={72} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" editable={!task.busy} returnKeyType="go" onSubmitEditing={() => { void submit(); }} />}
      <ErrorText error={task.error ?? auth.error} />
      <Button label={register ? 'Criar conta' : 'Entrar'} icon={register ? 'person-add-outline' : 'log-in-outline'} loading={task.busy} onPress={() => { void submit(); }} />
      <View style={styles.separator}><View style={styles.line} /><Text style={styles.separatorText}>Ou continue com</Text><View style={styles.line} /></View>
      <SocialButton provider="Google" disabled={task.busy} onPress={() => setSocialMessage('Login com Google estará disponível em breve.')} />
      <SocialButton provider="Outlook" disabled={task.busy} onPress={() => setSocialMessage('Login com Outlook estará disponível em breve.')} />
      {!!socialMessage && <Text accessibilityRole="alert" style={styles.message}>{socialMessage}</Text>}
    </View>
    <Button label={register ? 'Já tenho uma conta' : 'Criar uma conta'} secondary disabled={task.busy} onPress={() => router.replace(register ? '/login' : '/register')} />
  </AuthScreen>;
}

const styles = StyleSheet.create({
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { color: colors.muted, fontSize: 13 },
  socialButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  socialText: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
