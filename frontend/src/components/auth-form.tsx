import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthScreen } from '@/components/auth-screen';
import type { InputHandle } from '@/components/keyboard-scroll';
import { Button, ErrorText, Field, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ApiError, validateAuthForm } from '@/domain/auth';
import { useAuth } from '@/state/auth-context';

function PasswordToggle({ visible, onPress, confirmation = false }: { visible: boolean; onPress: () => void; confirmation?: boolean }) {
  const label = confirmation ? 'confirmação de senha' : 'senha';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Ocultar' : 'Mostrar'} ${label}`} onPress={onPress}
    style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: pressed ? colors.surface : 'transparent' })}>
    <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.primary} />
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
  const nameRef = useRef<InputHandle>(null);
  const emailRef = useRef<InputHandle>(null);
  const passwordRef = useRef<InputHandle>(null);
  const confirmationRef = useRef<InputHandle>(null);
  const task = useTask();
  const locked = useRef(false);
  async function submit() {
    if (locked.current) return;
    const data = { name: name.trim(), email: email.trim(), password, password_confirmation: confirmation };
    const validation = validateAuthForm(data, register);
    setErrors(validation);
    if (Object.keys(validation).length) {
      (validation.name ? nameRef : validation.email ? emailRef : validation.password ? passwordRef : confirmationRef).current?.focus();
      return;
    }
    locked.current = true;
    await task.run(async () => {
      try {
        await (register ? auth.register(data) : auth.login(data));
        setPassword(''); setConfirmation('');
      } catch (error) {
        if (error instanceof ApiError) setErrors(error.errors);
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
      {register && <Field ref={confirmationRef} label="Confirmar senha" value={confirmation} onChangeText={(value) => { setConfirmation(value); if (!value) setConfirmationVisible(false); }} error={errors.password_confirmation} secureTextEntry={!confirmationVisible} trailingAccessory={confirmation.length > 0 ? <PasswordToggle visible={confirmationVisible} confirmation onPress={() => setConfirmationVisible((value) => !value)} /> : undefined} maxLength={72} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" editable={!task.busy} returnKeyType="go" onSubmitEditing={() => { void submit(); }} />}
      <ErrorText error={task.error ?? auth.error} />
      <Button label={register ? 'Criar conta' : 'Entrar'} icon={register ? 'person-add-outline' : 'log-in-outline'} loading={task.busy} onPress={() => { void submit(); }} />
    </View>
    <Button label={register ? 'Já tenho uma conta' : 'Criar uma conta'} secondary disabled={task.busy} onPress={() => router.replace(register ? '/login' : '/register')} />
  </AuthScreen>;
}
