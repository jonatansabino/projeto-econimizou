import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BirthDatePicker } from '@/components/birth-date-picker';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ProfileImageControl, ProfileImagePanel } from '@/components/profile-image-editor';
import { Screen } from '@/components/screen';
import { SettingsRow, SettingsSection } from '@/components/settings-item';
import { Button, ErrorText, Field, Sheet, ui, useTask } from '@/components/ui';
import { colors } from '@/constants/theme';
import { ApiError } from '@/domain/auth';
import { formatMoney, newIncomeSourceId, totalIncomeSources, type IncomeSource } from '@/domain/finance';
import {
  financialObjectives,
  personalizationDraft,
  validatePersonalization,
} from '@/domain/personalization';
import { maskMoney } from '@/domain/transaction-form';
import { useAuth } from '@/state/auth-context';
import { useFinance } from '@/state/finance-context';
import { useProfileImageEditor } from '@/state/use-profile-image-editor';

export default function SettingsScreen() {
  const { data, updatePreferences } = useFinance();
  const auth = useAuth();

  const params = useLocalSearchParams<{ openIncome?: string }>();
  const [profileOpen, setProfileOpen] = useState(false);
  const [personalDataOpen, setPersonalDataOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(() => params.openIncome === '1');
  const [lastOpenIncomeParam, setLastOpenIncomeParam] = useState(params.openIncome);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  if (params.openIncome !== lastOpenIncomeParam) {
    setLastOpenIncomeParam(params.openIncome);
    if (params.openIncome === '1') {
      setIncomeOpen(true);
    }
  }

  const task = useTask();
  const logoutTask = useTask();

  const unread = data.notifications.filter((item) => !item.read).length;
  const sources = data.preferences.incomeSources ?? [];
  const incomeCentsFromSources = totalIncomeSources(sources);
  // Fallback para o campo único da API quando não há fontes de renda locais
  const incomeCents =
    sources.length > 0
      ? incomeCentsFromSources
      : (auth.user?.personalization?.monthly_income_cents ?? null);

  const incomeSubtitle =
    sources.length > 1
      ? `${sources.length} fontes · Total ${formatMoney(incomeCentsFromSources)}`
      : incomeCents
        ? (() => {
            const day = sources[0]?.dayOfMonth ?? data.preferences.incomeDay;
            return `${formatMoney(incomeCents)}${day ? ` · Dia ${day}` : ''}`;
          })()
        : 'Defina sua renda e dia de recebimento para planejamento';

  return (
    <Screen
      title="Ajustes"
      description="Seu perfil, suas finanças e suas preferências do aplicativo."
    >
      {/* 1. Cabeçalho do Perfil */}
      <View style={ui.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Perfil de ${data.profile.name}`}
          onPress={() => setProfileOpen(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        >
          <View style={ui.row}>
            <ProfileAvatar
              photoRef={data.profile.photoRef}
              value={data.profile.avatar}
              size={64}
              label={`Avatar de ${data.profile.name}`}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={ui.title}>{data.profile.name}</Text>
              <Text style={ui.text}>{auth.user?.email ?? 'Conta conectada'}</Text>
            </View>
          </View>
        </Pressable>
        <Button
          label="Editar Perfil"
          secondary
          icon="create-outline"
          onPress={() => setProfileOpen(true)}
        />
      </View>

      {/* 2. Seção Minha Conta */}
      <SettingsSection
        title="Minha Conta"
        description="Gerencie seus dados pessoais, foto de perfil e senha de acesso."
      >
        <SettingsRow
          icon="person-outline"
          title="Dados pessoais"
          description="Nome completo, e-mail, nascimento e objetivo financeiro"
          onPress={() => setPersonalDataOpen(true)}
        />
        <SettingsRow
          icon="camera-outline"
          title="Foto de perfil"
          description="Escolha um dos 12 avatares DiceBear ou uma foto da galeria"
          onPress={() => setPhotoOpen(true)}
        />
        <SettingsRow
          icon="key-outline"
          title="Alterar senha"
          description="Atualize sua senha de acesso ao Economizou"
          onPress={() => router.push('/alterar-senha')}
        />
      </SettingsSection>

      {/* 3. Seção Minhas Finanças */}
      <SettingsSection
        title="Minhas Finanças"
        description="Planejamento de renda, categorias e limites de gastos."
      >
        <SettingsRow
          icon="cash-outline"
          title="Minha renda"
          description={incomeSubtitle}
          onPress={() => setIncomeOpen(true)}
        />
        <SettingsRow
          icon="pricetags-outline"
          title="Categorias"
          description="Gerenciar categorias de receitas e despesas"
          onPress={() => router.push('/categorias')}
        />
        <SettingsRow
          icon="speedometer-outline"
          title="Limites de gastos"
          description="Controle de orçamento por categoria"
          onPress={() => router.push('/limites')}
        />
      </SettingsSection>

      {/* 4. Seção Preferências */}
      <SettingsSection
        title="Preferências"
        description="Notificações, privacidade e opções de exibição."
      >
        <SettingsRow
          icon="notifications-outline"
          title="Central de Notificações"
          description={unread ? `${unread} nova(s) notificação(ões)` : 'Histórico de avisos simulados'}
          badge={unread ? `${unread} nova${unread > 1 ? 's' : ''}` : undefined}
          onPress={() => router.push('/notificacoes')}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Segurança e Privacidade"
          description="Como sua conta e seus dados locais são tratados"
          onPress={() => router.push('/privacidade')}
        />
        <SettingsRow
          icon="eye-off-outline"
          title="Ocultar valores"
          description="Oculta valores em cards, extratos e relatórios"
          right={
            <Switch
              accessibilityLabel="Ocultar valores"
              value={data.preferences.hideAmounts}
              disabled={task.busy}
              onValueChange={(value) => {
                void task.run(() => updatePreferences({ hideAmounts: value }));
              }}
              trackColor={{ false: colors.border, true: '#23674F' }}
              thumbColor={data.preferences.hideAmounts ? colors.primary : colors.muted}
            />
          }
        />
        <SettingsRow
          icon="notifications-circle-outline"
          title="Notificações simuladas"
          description="Receba novos avisos e lembretes na central interna do app"
          right={
            <Switch
              accessibilityLabel="Notificações simuladas"
              value={data.preferences.notificationsEnabled}
              disabled={task.busy}
              onValueChange={(value) => {
                void task.run(() => updatePreferences({ notificationsEnabled: value }));
              }}
              trackColor={{ false: colors.border, true: '#23674F' }}
              thumbColor={data.preferences.notificationsEnabled ? colors.primary : colors.muted}
            />
          }
        />
        <SettingsRow
          icon="sparkles-outline"
          title="Animações suaves"
          description="Transições de tela e barras de progresso animadas"
          right={
            <Switch
              accessibilityLabel="Animações suaves"
              value={data.preferences.animationsEnabled}
              disabled={task.busy}
              onValueChange={(value) => {
                void task.run(() => updatePreferences({ animationsEnabled: value }));
              }}
              trackColor={{ false: colors.border, true: '#23674F' }}
              thumbColor={data.preferences.animationsEnabled ? colors.primary : colors.muted}
            />
          }
        />
        <SettingsRow
          icon="book-outline"
          title="Ver tutorial novamente"
          description="Rever as telas de apresentação e boas-vindas do app"
          onPress={() => router.push({ pathname: '/onboarding', params: { replay: '1' } })}
        />
      </SettingsSection>

      {/* 5. Sair da Conta */}
      <Button
        label="Sair Da Conta"
        secondary
        danger
        icon="log-out-outline"
        loading={logoutTask.busy}
        onPress={() => setLogoutConfirmOpen(true)}
      />
      <ErrorText error={logoutTask.error} />

      {/* Rodapé informativo */}
      <Text style={ui.text}>
        Economizou 1.0 · tema escuro{'\n'}Feito para organizar suas finanças, sem conexão com bancos.
      </Text>

      {/* Modais */}
      {profileOpen && <ProfileEditor onClose={() => setProfileOpen(false)} />}
      {personalDataOpen && <PersonalDataEditor onClose={() => setPersonalDataOpen(false)} />}
      {photoOpen && <PhotoEditor onClose={() => setPhotoOpen(false)} />}
      {incomeOpen && <IncomeEditor onClose={() => setIncomeOpen(false)} />}
      {logoutConfirmOpen && (
        <LogoutConfirmation
          loading={logoutTask.busy}
          onClose={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            void logoutTask.run(auth.logout);
          }}
        />
      )}
    </Screen>
  );
}

/**
 * Editor completo de perfil (usado pelo botão "Editar Perfil" e toque no card de cabeçalho).
 * Preserva compatibilidade exata com os testes E2E avatar.spec.ts e profile-photo.spec.ts.
 */
function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { data, updateProfile } = useFinance();
  const auth = useAuth();
  const [name, setName] = useState(data.profile.name);
  const [draft, setDraft] = useState(() => personalizationDraft(auth.user?.personalization));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const locked = useRef(false);
  const imageEditor = useProfileImageEditor(data.profile);
  const task = useTask();

  async function save() {
    if (locked.current) return;
    const validation = validatePersonalization(draft);
    if (!name.trim()) validation.errors.name = 'Informe seu nome.';
    setErrors(validation.errors);
    if (!validation.input || Object.keys(validation.errors).length) return;
    locked.current = true;
    const ok = await task.run(async () => {
      try {
        await imageEditor.save(name, updateProfile, (avatar) =>
          auth.updateProfile({
            name,
            avatar,
            ...validation.input,
            personalization_completed: true,
          })
        );
      } catch (error) {
        if (error instanceof ApiError) setErrors(error.errors);
        throw error;
      }
    });
    if (ok) onClose();
    else locked.current = false;
  }

  return (
    <Sheet
      title={imageEditor.mode === 'idle' ? 'Editar Perfil' : 'Alterar imagem do perfil'}
      onClose={() => {
        if (locked.current) return;
        if (imageEditor.mode !== 'idle') imageEditor.cancelStep();
        else onClose();
      }}
      footer={
        imageEditor.mode === 'idle' ? (
          <>
            <ErrorText error={task.error} />
            <Button
              label="Salvar perfil"
              loading={task.busy}
              onPress={() => {
                void save();
              }}
            />
          </>
        ) : undefined
      }
    >
      {imageEditor.mode !== 'idle' ? (
        <ProfileImagePanel editor={imageEditor} />
      ) : (
        <>
          <Field
            label="Seu nome"
            error={errors.name}
            editable={!task.busy}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoCapitalize="words"
          />
          <ProfileImageControl editor={imageEditor} disabled={task.busy} />
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <BirthDatePicker
                error={!!errors.birth_date}
                value={draft.birth_date}
                onChange={(date) => setDraft((c) => ({ ...c, birth_date: date }))}
                disabled={task.busy}
              />
              {!!errors.birth_date && (
                <Text accessibilityRole="alert" style={ui.error}>
                  {errors.birth_date}
                </Text>
              )}
            </View>
            <View style={{ gap: 8 }}>
              <Text style={ui.label}>Objetivo financeiro (opcional)</Text>
              {[...financialObjectives, { value: '', label: 'Prefiro escolher depois' }].map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  aria-checked={draft.financial_objective === option.value}
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: draft.financial_objective === option.value, disabled: task.busy }}
                  disabled={task.busy}
                  onPress={() => setDraft((c) => ({ ...c, financial_objective: option.value }))}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    borderWidth: 1,
                    borderColor: draft.financial_objective === option.value ? colors.primary : colors.border,
                    backgroundColor: draft.financial_objective === option.value ? '#16392F' : colors.background,
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'center',
                    opacity: pressed || task.busy ? 0.55 : 1,
                  })}
                >
                  <Text style={{ color: colors.primary }}>
                    {draft.financial_objective === option.value ? '●' : '○'}
                  </Text>
                  <Text style={[ui.text, { color: colors.text, flex: 1 }]}>{option.label}</Text>
                </Pressable>
              ))}
              {!!errors.financial_objective && (
                <Text accessibilityRole="alert" style={ui.error}>
                  {errors.financial_objective}
                </Text>
              )}
            </View>
            <Field
              label="Renda mensal (opcional)"
              placeholder="R$ 0,00"
              value={draft.monthly_income_cents}
              onChangeText={(text) => setDraft((c) => ({ ...c, monthly_income_cents: maskMoney(text) }))}
              keyboardType="number-pad"
              editable={!task.busy}
              error={errors.monthly_income_cents}
            />
            <Text style={ui.text}>
              A renda informada será usada para planejamento e não altera seu saldo. Para registrar dinheiro recebido, utilize o Extrato.
            </Text>
          </View>
        </>
      )}
    </Sheet>
  );
}

/**
 * Editor focado exclusivamente nos dados pessoais:
 * Nome completo, e-mail, data de nascimento e objetivo financeiro.
 */
function PersonalDataEditor({ onClose }: { onClose: () => void }) {
  const { data, updateProfile } = useFinance();
  const auth = useAuth();
  const [name, setName] = useState(data.profile.name);
  const [draft, setDraft] = useState(() => personalizationDraft(auth.user?.personalization));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const task = useTask();

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Informe seu nome.' });
      return;
    }
    const validation = validatePersonalization(draft);
    if (Object.keys(validation.errors).length) {
      setErrors(validation.errors);
      return;
    }

    const ok = await task.run(async () => {
      try {
        await updateProfile({ ...data.profile, name: trimmed });
        await auth.updateProfile({
          name: trimmed,
          ...validation.input,
          personalization_completed: true,
        });
      } catch (error) {
        if (error instanceof ApiError) setErrors(error.errors);
        throw error;
      }
    });
    if (ok) onClose();
  }

  return (
    <Sheet
      title="Dados pessoais"
      onClose={onClose}
      footer={
        <>
          <ErrorText error={task.error} />
          <Button
            label="Salvar dados pessoais"
            loading={task.busy}
            onPress={() => {
              void save();
            }}
          />
        </>
      }
    >
      <Field
        label="Nome completo"
        value={name}
        onChangeText={setName}
        error={errors.name}
        maxLength={60}
        autoCapitalize="words"
        editable={!task.busy}
      />

      <Field
        label="E-mail"
        value={auth.user?.email ?? ''}
        editable={false}
      />
      <Text style={ui.text}>O e-mail cadastrado não pode ser alterado diretamente.</Text>

      <View style={{ gap: 8 }}>
        <BirthDatePicker
          error={!!errors.birth_date}
          value={draft.birth_date}
          onChange={(date) => setDraft((c) => ({ ...c, birth_date: date }))}
          disabled={task.busy}
        />
        {!!errors.birth_date && (
          <Text accessibilityRole="alert" style={ui.error}>
            {errors.birth_date}
          </Text>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={ui.label}>Objetivo financeiro (opcional)</Text>
        {[...financialObjectives, { value: '', label: 'Prefiro escolher depois' }].map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            aria-checked={draft.financial_objective === option.value}
            accessibilityLabel={option.label}
            accessibilityState={{ checked: draft.financial_objective === option.value, disabled: task.busy }}
            disabled={task.busy}
            onPress={() => setDraft((c) => ({ ...c, financial_objective: option.value }))}
            style={({ pressed }) => ({
              minHeight: 48,
              borderWidth: 1,
              borderColor: draft.financial_objective === option.value ? colors.primary : colors.border,
              backgroundColor: draft.financial_objective === option.value ? '#16392F' : colors.background,
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
              opacity: pressed || task.busy ? 0.55 : 1,
            })}
          >
            <Text style={{ color: colors.primary }}>
              {draft.financial_objective === option.value ? '●' : '○'}
            </Text>
            <Text style={[ui.text, { color: colors.text, flex: 1 }]}>{option.label}</Text>
          </Pressable>
        ))}
        {!!errors.financial_objective && (
          <Text accessibilityRole="alert" style={ui.error}>
            {errors.financial_objective}
          </Text>
        )}
      </View>
    </Sheet>
  );
}

/**
 * Editor focado exclusivamente na foto ou avatar do perfil:
 * Avatares DiceBear ou foto da galeria, com prévia e confirmação.
 */
function PhotoEditor({ onClose }: { onClose: () => void }) {
  const { data, updateProfile } = useFinance();
  const auth = useAuth();
  const imageEditor = useProfileImageEditor(data.profile);
  const task = useTask();

  async function save() {
    const ok = await task.run(async () => {
      await imageEditor.save(data.profile.name, updateProfile, (avatar) =>
        auth.updateProfile({ avatar })
      );
    });
    if (ok) onClose();
  }

  return (
    <Sheet
      title={imageEditor.mode === 'idle' ? 'Foto de perfil' : 'Alterar imagem do perfil'}
      onClose={() => {
        if (imageEditor.mode !== 'idle') imageEditor.cancelStep();
        else onClose();
      }}
      footer={
        imageEditor.mode === 'idle' ? (
          <>
            <ErrorText error={task.error} />
            <Button
              label="Salvar foto de perfil"
              loading={task.busy}
              onPress={() => {
                void save();
              }}
            />
          </>
        ) : undefined
      }
    >
      {imageEditor.mode !== 'idle' ? (
        <ProfileImagePanel editor={imageEditor} />
      ) : (
        <ProfileImageControl editor={imageEditor} disabled={task.busy} />
      )}
    </Sheet>
  );
}

/**
 * Modal de Minha Renda com suporte a múltiplas fontes de renda.
 * Cada fonte tem: descrição, valor e dia de recebimento (opcional).
 * O total das fontes é sincronizado com monthly_income_cents na API.
 */
function IncomeEditor({ onClose }: { onClose: () => void }) {
  const { data, updatePreferences } = useFinance();
  const auth = useAuth();
  const task = useTask();
  const [error, setError] = useState<string | null>(null);

  // Inicializa com fontes existentes, ou converte o campo único legado em uma fonte
  const [sources, setSources] = useState<IncomeSource[]>(() => {
    const existing = data.preferences.incomeSources;
    if (existing && existing.length > 0) return existing;
    // Retrocompatibilidade: converte o campo único e incomeDay em uma fonte
    const legacyCents = auth.user?.personalization?.monthly_income_cents;
    const legacyDay = data.preferences.incomeDay ?? null;
    if (legacyCents && legacyCents > 0) {
      return [{ id: newIncomeSourceId(), label: 'Meu salário', amountCents: legacyCents, dayOfMonth: legacyDay }];
    }
    return [];
  });

  // Fonte sendo editada (null = nenhuma)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulário de edição/adição
  const emptyForm = { label: '', amountText: '', dayText: '' };
  const [form, setForm] = useState(emptyForm);

  function openAdd() {
    setForm(emptyForm);
    setEditingId('__new__');
    setError(null);
  }

  function openEdit(src: IncomeSource) {
    setForm({
      label: src.label,
      amountText: maskMoney(String(src.amountCents)),
      dayText: src.dayOfMonth != null ? String(src.dayOfMonth) : '',
    });
    setEditingId(src.id);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  function validateForm(): { label: string; amountCents: number; dayOfMonth: number | null } | null {
    setError(null);
    if (!form.label.trim()) { setError('Informe uma descrição para esta renda.'); return null; }
    const cents = Number(form.amountText.replace(/\D/g, ''));
    if (!form.amountText.trim() || !Number.isSafeInteger(cents) || cents <= 0) {
      setError('Informe um valor válido maior que zero.');
      return null;
    }
    let dayOfMonth: number | null = null;
    if (form.dayText.trim()) {
      dayOfMonth = Number(form.dayText.replace(/\D/g, ''));
      if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        setError('Informe um dia válido entre 1 e 31.');
        return null;
      }
    }
    return { label: form.label.trim(), amountCents: cents, dayOfMonth };
  }

  function confirmEdit() {
    const validated = validateForm();
    if (!validated) return;
    if (editingId === '__new__') {
      setSources((prev) => [...prev, { id: newIncomeSourceId(), ...validated }]);
    } else {
      setSources((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, ...validated } : s))
      );
    }
    setEditingId(null);
    setForm(emptyForm);
  }

  function removeSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function save() {
    setError(null);
    if (editingId !== null) {
      setError('Conclua ou cancele a edição antes de salvar.');
      return;
    }
    const totalCents = totalIncomeSources(sources);
    const ok = await task.run(async () => {
      await auth.updateProfile({
        monthly_income_cents: totalCents > 0 ? totalCents : null,
        personalization_completed: true,
      });
      await updatePreferences({ incomeSources: sources.length > 0 ? sources : undefined });
    });
    if (ok) onClose();
  }

  const totalCents = totalIncomeSources(sources);
  const isEditing = editingId !== null;

  return (
    <Sheet
      title="Minha renda"
      onClose={onClose}
      footer={
        <>
          <ErrorText error={error ?? task.error} />
          <Button
            label="Salvar renda"
            loading={task.busy}
            disabled={isEditing}
            onPress={() => { void save(); }}
          />
        </>
      }
    >
      <Text style={ui.text}>
        A renda informada será usada para planejamento e não altera seu saldo. Para registrar dinheiro recebido, utilize o Extrato.
      </Text>

      {/* Lista de fontes existentes */}
      {sources.map((src) => (
        <View key={src.id} style={incomeStyles.sourceCard}>
          {editingId === src.id ? (
            <IncomeSourceForm
              form={form}
              onChange={setForm}
              onConfirm={confirmEdit}
              onCancel={cancelEdit}
              error={error}
              clearError={() => setError(null)}
            />
          ) : (
            <View style={incomeStyles.sourceRow}>
              <View style={{ flex: 1 }}>
                <Text style={ui.label}>{src.label}</Text>
                <Text style={ui.text}>
                  {formatMoney(src.amountCents)}
                  {src.dayOfMonth ? ` · Dia ${src.dayOfMonth}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Editar"
                  secondary
                  icon="create-outline"
                  onPress={() => openEdit(src)}
                  disabled={task.busy}
                />
                <Button
                  label="Remover"
                  danger
                  icon="trash-outline"
                  onPress={() => removeSource(src.id)}
                  disabled={task.busy}
                />
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Formulário de nova fonte */}
      {editingId === '__new__' && (
        <View style={incomeStyles.sourceCard}>
          <IncomeSourceForm
            form={form}
            onChange={setForm}
            onConfirm={confirmEdit}
            onCancel={cancelEdit}
            error={error}
            clearError={() => setError(null)}
          />
        </View>
      )}

      {/* Botão adicionar (oculto durante edição) */}
      {!isEditing && (
        <Button
          label="Adicionar fonte de renda"
          secondary
          icon="add-circle-outline"
          onPress={openAdd}
          disabled={task.busy}
        />
      )}

      {/* Total */}
      {sources.length > 0 && !isEditing && (
        <View style={incomeStyles.totalRow}>
          <Text style={ui.label}>Total mensal previsto</Text>
          <Text style={incomeStyles.totalValue}>{formatMoney(totalCents)}</Text>
        </View>
      )}
    </Sheet>
  );
}

type IncomeSourceFormState = { label: string; amountText: string; dayText: string };

function IncomeSourceForm({
  form,
  onChange,
  onConfirm,
  onCancel,
  error,
  clearError,
}: {
  form: IncomeSourceFormState;
  onChange: (f: IncomeSourceFormState) => void;
  onConfirm: () => void;
  onCancel: () => void;
  error: string | null;
  clearError: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Field
        label="Descrição (ex.: Salário, Freelance)"
        placeholder="Ex.: Salário principal"
        value={form.label}
        onChangeText={(text) => { onChange({ ...form, label: text }); clearError(); }}
        editable
      />
      <Field
        label="Valor (R$)"
        placeholder="R$ 0,00"
        value={form.amountText}
        onChangeText={(text) => { onChange({ ...form, amountText: maskMoney(text) }); clearError(); }}
        keyboardType="number-pad"
        editable
      />
      <Field
        label="Dia de recebimento (opcional, 1–31)"
        placeholder="Ex.: 5 ou 30"
        value={form.dayText}
        onChangeText={(text) => { onChange({ ...form, dayText: text.replace(/\D/g, '').slice(0, 2) }); clearError(); }}
        keyboardType="number-pad"
        maxLength={2}
        editable
      />
      <ErrorText error={error} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="Confirmar" icon="checkmark-circle-outline" onPress={onConfirm} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Cancelar" secondary icon="close-outline" onPress={onCancel} />
        </View>
      </View>
    </View>
  );
}

const incomeStyles = StyleSheet.create({
  sourceCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sourceRow: {
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  totalValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
});

/**
 * Modal de confirmação antes de sair da conta.
 */
function LogoutConfirmation({
  loading,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet title="Sair da Conta" onClose={onClose}>
      <Text style={ui.text}>
        Deseja realmente sair? Sua sessão será encerrada com segurança e o token de acesso será revogado. Os registros financeiros salvos neste aparelho continuam protegidos e não serão apagados.
      </Text>
      <Button
        label="Confirmar e sair"
        danger
        loading={loading}
        onPress={onConfirm}
      />
      <Button
        label="Cancelar"
        secondary
        disabled={loading}
        onPress={onClose}
      />
    </Sheet>
  );
}
