import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ui } from '@/components/ui';

export default function PrivacyScreen() {
  return <Screen title="Segurança e Privacidade" description="Como sua conta e seus dados são tratados." back>
    <View style={ui.card}><Text style={ui.title}>Sua conta e suas finanças</Text><Text style={ui.text}>Cadastro, login e perfil usam a API com CodeIgniter Shield. Receitas, despesas e categorias são gravadas no banco pela API e separadas por usuário. Metas, previsões e mensagens permanecem locais. Não há conexão bancária ou envio a uma IA.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Personalização opcional</Text><Text style={ui.text}>Nascimento, objetivo financeiro e renda mensal são opcionais e ficam no seu perfil na API. Você pode consultá-los, alterá-los ou removê-los em Editar Perfil. A renda não cria receitas e a data de nascimento não gera recomendações por idade.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Sessão protegida</Text><Text style={ui.text}>No Android/iOS, o token fica no SecureStore. Na web, a API mantém a sessão em cookie HttpOnly. Senhas e tokens não são gravados no AsyncStorage ou no armazenamento local do navegador. Os dados financeiros locais não têm criptografia adicional.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Banco e armazenamento local</Text><Text style={ui.text}>As receitas, despesas e categorias da conta são recuperadas do banco ao conectar. Limpar o armazenamento pode remover metas, previsões, mensagens e fotos locais. Dados antigos não são enviados automaticamente. Recuperação de senha ainda não está disponível.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Avisos e sugestões</Text><Text style={ui.text}>Notificações são apenas avisos internos. Recomendações e respostas do assistente são simulações locais, sem análise externa de dados. Nenhum valor é movimentado automaticamente.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Créditos dos avatares</Text><Text style={ui.text}>Avatares Adventurer de Lisa Wischofsky, distribuídos pelo DiceBear sob licença CC BY 4.0. Cores de fundo adaptadas para o Econimizou. As imagens são geradas no desenvolvimento e incluídas no aplicativo, sem enviar dados do perfil a servidores.</Text>
      <Link href="https://www.dicebear.com/styles/adventurer/" style={ui.success}>Adventurer · autoria e fonte</Link>
      <Link href="https://creativecommons.org/licenses/by/4.0/" style={ui.success}>Licença Creative Commons BY 4.0</Link>
    </View>
  </Screen>;
}
