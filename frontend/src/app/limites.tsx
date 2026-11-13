import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, ui } from '@/components/ui';
import { colors } from '@/constants/theme';

export default function SpendingLimitsScreen() {
  return (
    <Screen
      title="Limites de gastos"
      description="Controle de orçamento e metas por categoria."
      back
    >
      <View style={ui.card}>
        <Text style={ui.title}>Controle de orçamento mensal</Text>
        <Text style={ui.text}>
          Defina limites de gastos para cada categoria (como alimentação, transporte e lazer) para acompanhar o quanto já gastou e quanto ainda pode usar no mês.
        </Text>
      </View>

      <View
        style={[
          ui.card,
          {
            backgroundColor: '#1B2C24',
            borderColor: '#26543F',
          },
        ]}
      >
        <Text style={[ui.title, { color: colors.primary }]}>Em desenvolvimento</Text>
        <Text style={ui.text}>
          O módulo de limites e orçamentos mensais depende da disponibilização dos endpoints correspondentes na API.
        </Text>
        <Text style={ui.text}>
          Assim que a integração com o backend for liberada, seus limites serão salvos com segurança junto à sua conta, sem dados simulados como reais.
        </Text>
      </View>

      <Button
        label="Gerenciar Categorias"
        icon="pricetags-outline"
        onPress={() => router.push('/categorias')}
      />

      <Button
        label="Voltar para Ajustes"
        secondary
        onPress={() => router.back()}
      />
    </Screen>
  );
}
