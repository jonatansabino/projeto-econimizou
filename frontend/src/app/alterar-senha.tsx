import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { InputHandle } from '@/components/keyboard-scroll';
import { Screen } from '@/components/screen';
import { Button, ErrorText, Field, PasswordToggle, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { passwordStrength } from '@/domain/personalization';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const [currentVisible, setCurrentVisible] = useState(false);
  const [newVisible, setNewVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const currentRef = useRef<InputHandle>(null);
  const newRef = useRef<InputHandle>(null);
  const confirmationRef = useRef<InputHandle>(null);

  const strength = passwordStrength(newPassword);

  function validate() {
    const errs: Record<string, string> = {};
    if (!currentPassword) {
      errs.currentPassword = 'Informe sua senha atual.';
    }
    if (!newPassword) {
      errs.newPassword = 'Informe a nova senha.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'A nova senha deve ter ao menos 8 caracteres.';
    } else if (newPassword === currentPassword) {
      errs.newPassword = 'A nova senha deve ser diferente da senha atual.';
    }
    if (!confirmation) {
      errs.confirmation = 'Confirme a nova senha.';
    } else if (confirmation !== newPassword) {
      errs.confirmation = 'A confirmação deve ser igual à nova senha.';
    }
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    setApiNotice(null);

    if (errs.currentPassword) {
      currentRef.current?.focus();
      return;
    }
    if (errs.newPassword) {
      newRef.current?.focus();
      return;
    }
    if (errs.confirmation) {
      confirmationRef.current?.focus();
      return;
    }

    // Como o endpoint de alteração de senha ainda não está disponível na API,
    // não alteramos dados locais nem exibimos sucesso fictício.
    setApiNotice(
      'A alteração de senha ainda depende de disponibilização do endpoint na API do servidor. Nenhuma alteração foi realizada.'
    );
  }

  return (
    <Screen
      title="Alterar senha"
      description="Crie uma nova senha segura para acessar sua conta."
      back
    >
      <View style={ui.card}>
        <Text style={ui.title}>Nova senha de acesso</Text>
        <Text style={ui.text}>
          Para sua segurança, informe sua senha atual e digite a nova senha desejada.
        </Text>

        <Field
          ref={currentRef}
          label="Senha atual"
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            if (!value) setCurrentVisible(false);
          }}
          error={errors.currentPassword}
          secureTextEntry={!currentVisible}
          trailingAccessory={
            currentPassword.length > 0 ? (
              <PasswordToggle
                visible={currentVisible}
                onPress={() => setCurrentVisible((v) => !v)}
              />
            ) : undefined
          }
          maxLength={72}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
        />

        <Field
          ref={newRef}
          label="Nova senha"
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            if (!value) setNewVisible(false);
          }}
          error={errors.newPassword}
          secureTextEntry={!newVisible}
          trailingAccessory={
            newPassword.length > 0 ? (
              <PasswordToggle
                visible={newVisible}
                onPress={() => setNewVisible((v) => !v)}
              />
            ) : undefined
          }
          maxLength={72}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmationRef.current?.focus()}
        />

        {!!newPassword && (
          <View style={{ gap: 6 }}>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Força da senha"
              accessibilityValue={{ min: 0, max: 4, now: strength.score, text: strength.label }}
              style={{ flexDirection: 'row', gap: 5 }}
            >
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor:
                      level <= strength.score
                        ? strength.score === 1
                          ? '#FDA4AF'
                          : colors.primary
                        : colors.border,
                  }}
                />
              ))}
            </View>
            <Text style={ui.text}>Força da senha: {strength.label}</Text>
            <Text style={ui.text}>
              Use ao menos 8 caracteres com letras maiúsculas, minúsculas, números e símbolos.
            </Text>
          </View>
        )}

        <Field
          ref={confirmationRef}
          label="Confirmar nova senha"
          value={confirmation}
          onChangeText={(value) => {
            setConfirmation(value);
            if (!value) setConfirmationVisible(false);
          }}
          error={errors.confirmation}
          secureTextEntry={!confirmationVisible}
          trailingAccessory={
            confirmation.length > 0 ? (
              <PasswordToggle
                visible={confirmationVisible}
                confirmation
                onPress={() => setConfirmationVisible((v) => !v)}
              />
            ) : undefined
          }
          maxLength={72}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        {apiNotice ? (
          <View
            style={{
              backgroundColor: '#23322B',
              borderWidth: 1,
              borderColor: '#2D5643',
              borderRadius: 14,
              padding: 14,
              gap: 6,
            }}
          >
            <Text style={[ui.label, { color: colors.primary }]}>Aviso da API</Text>
            <Text style={ui.text}>{apiNotice}</Text>
          </View>
        ) : null}

        <ErrorText error={null} />

        <Button
          label="Salvar nova senha"
          icon="key-outline"
          onPress={handleSubmit}
        />
      </View>
    </Screen>
  );
}
