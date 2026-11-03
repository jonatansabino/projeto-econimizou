import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ui } from '@/components/ui';

export default function PrivacyScreen() {
  return <Screen title="Segurança e privacidade" description="Transparência sobre esta versão demonstrativa." back>
    <View style={ui.card}><Text style={ui.title}>Seus dados ficam aqui</Text><Text style={ui.text}>Perfil, transações, metas, mensagens e preferências são armazenados localmente com AsyncStorage. O aplicativo não conecta bancos, não envia dados a uma IA e não usa um backend.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Sem autenticação real</Text><Text style={ui.text}>Esta tela é demonstrativa. Não há senha, biometria, bloqueio de acesso ou criptografia adicional implementados. AsyncStorage não é um cofre criptografado. Use dados fictícios para explorar.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Controle no dispositivo</Text><Text style={ui.text}>Você pode editar e excluir registros no app. Desinstalar o aplicativo ou limpar os dados do navegador pode remover as informações locais. Não há sincronização ou recuperação em nuvem nesta versão.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Avisos e sugestões</Text><Text style={ui.text}>Notificações são apenas avisos internos. Recomendações e respostas do assistente são simulações locais, sem análise externa de dados. Nenhum valor é movimentado automaticamente.</Text></View>
    <View style={ui.card}><Text style={ui.title}>Créditos dos avatares</Text><Text style={ui.text}>Avatares Adventurer de Lisa Wischofsky, distribuídos pelo DiceBear sob licença CC BY 4.0. Cores de fundo adaptadas para o Econimizou. As imagens são geradas no desenvolvimento e incluídas no aplicativo, sem enviar dados do perfil a servidores.</Text>
      <Link href="https://www.dicebear.com/styles/adventurer/" style={ui.success}>Adventurer · autoria e fonte</Link>
      <Link href="https://creativecommons.org/licenses/by/4.0/" style={ui.success}>Licença Creative Commons BY 4.0</Link>
    </View>
  </Screen>;
}
