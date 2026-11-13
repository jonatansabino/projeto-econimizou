# 💚 Economizou — Controle Financeiro Pessoal

O **Economizou** é um aplicativo que criei para ajudar as pessoas a organizarem melhor seu dinheiro, acompanhando gastos, receitas e metas de economia de forma simples.

O projeto foi desenvolvido como parte de um desafio de **Vibe Coding**, usando ferramentas de inteligência artificial como ChatGPT, Lovable e Codex.

## 📱 O que o aplicativo faz?

O Economizou permite:

- **Início:** visualizar saldo, receitas, despesas e últimas movimentações.
- **Extrato:** cadastrar, editar, excluir e consultar gastos e receitas.
- **Chat IA:** registrar movimentações por mensagens, como "Gastei R$ 30 no almoço".
- **Metas:** criar objetivos para guardar dinheiro e acompanhar o progresso.
- **Relatórios:** visualizar um resumo dos gastos e receitas.
- **Configurações:** Editar Perfil, categorias e preferências.

Cadastro, login, sessão e perfil utilizam a API CodeIgniter Shield. As finanças continuam locais, separadas por conta; o chat segue uma simulação local sem API de IA. Dados antigos permanecem preservados, sem importação automática.

## 🛠️ Tecnologias utilizadas

- React Native e Expo SDK 58
- TypeScript
- Expo Router
- React Context
- AsyncStorage
- ChatGPT, Lovable e Codex como ferramentas de apoio

## 💬 Como desenvolvi o projeto?

Comecei usando o **Lovable** para criar as primeiras telas do aplicativo, que inicialmente se chamava **FinVibe**.

Depois de testar, percebi que algumas partes eram apenas visuais e que vários botões ainda não funcionavam.

Decidi então recomeçar o projeto com **Expo e React Native**, usando o **Codex** para desenvolver as funcionalidades e organizar o código.

Fui construindo o aplicativo aos poucos, testando cada parte antes de continuar.

## 📝 Principais prompts utilizados

**1. Criação das telas — Lovable**

> Crie um aplicativo de finanças pessoais chamado FinVibe, com visual moderno, tema escuro e detalhes em verde. Adicione uma tela inicial com saldo, receitas, despesas, últimas transações e navegação inferior.

**2. Chat financeiro — Lovable**

> Adicione um chat onde o usuário possa informar gastos e receitas por mensagens. Simule respostas de um assistente financeiro confirmando as movimentações.

**3. Metas de economia — Lovable**

> Crie uma tela onde o usuário possa acompanhar metas de economia, visualizar o progresso e receber dicas para economizar dinheiro.

**4. Funcionalidades — Lovable**

> Torne as telas interativas, permitindo enviar mensagens, atualizar valores financeiros e filtrar transações.

**5. Novo aplicativo — Codex**

> Crie um aplicativo chamado Economizou utilizando Expo SDK 58, React Native e TypeScript. Implemente as telas de Início, Extrato, Chat IA, Metas, Relatórios e Configurações. Utilize dados fictícios e AsyncStorage para salvar as informações, sem backend.

**6. Melhorias — Codex**

> Melhore a navegação, os formulários de receitas e despesas, a experiência no celular, as telas de boas-vindas e os gráficos financeiros. Preserve todas as funcionalidades existentes.

*Esses prompts estão resumidos para facilitar a leitura.*

## 🧠 O que aprendi com o Vibe Coding?

**O que funcionou bem?**

O que mais gostei foi conseguir transformar uma ideia em um aplicativo usando conversas com a IA. Dividir o desenvolvimento em pequenas etapas ajudou bastante, pois consegui acompanhar melhor as mudanças e corrigir os problemas.

**O que não funcionou como esperado?**

No começo, algumas telas criadas no Lovable eram bonitas, mas nem todos os botões funcionavam. Também percebi que pedir muitas funcionalidades de uma vez poderia gerar resultados diferentes do que eu imaginava.

**O que aprendi?**

Aprendi que a IA ajuda muito no desenvolvimento, mas é importante saber explicar o que queremos. Quanto mais claro for o pedido, melhor tende a ser o resultado.

Também entendi que não basta apenas gerar o código. É preciso testar, encontrar erros e fazer ajustes até tudo funcionar corretamente.

## 🚀 Como executar

Clone o repositório:

```bash
git clone https://github.com/jonatansabino/projeto-econimizou.git
```

Entre na pasta e instale as dependências:

```bash
cd projeto-econimizou/frontend
npm install
```

Inicie o projeto:

```bash
npx expo start
```

## 📌 Status do projeto

O Economizou já possui suas principais funcionalidades desenvolvidas, mas continua sendo um projeto de aprendizado.

Atualmente, autenticação e perfil estão conectados ao backend. Os registros financeiros continuam locais, sem sincronização bancária ou inteligência artificial externa.

A ideia é continuar melhorando o aplicativo aos poucos.

---

**Desenvolvido com 💚 utilizando Vibe Coding.**

## 👨‍💻 Desenvolvedor
**Jonatan Sabino**
Desenvolvedor do projeto Economizou, criado como parte de um desafio de Vibe Coding, utilizando inteligência artificial como apoio no desenvolvimento.

- **GitHub:** [@jonatansabino](https://github.com/jonatansabino)

---

Desenvolvido por **Jonatan Sabino** com 💚 e apoio de IA.
## Avatares DiceBear

O perfil usa uma galeria de 12 avatares **Adventurer** do DiceBear, com fundos adaptados ao tema escuro. Acesse **Ajustes → Editar Perfil**, escolha uma opção e toque em **Salvar perfil**, que fica fixo no rodapé do modal. A prévia muda ao selecionar; Home e Ajustes usam o mesmo componente e identificador salvo no AsyncStorage.

Os SVGs estão incluídos no aplicativo, sem API externa ou envio de dados do perfil. `@dicebear/core` 10.7.0 e `@dicebear/styles` 10.6.0 são dependências de desenvolvimento com versões fixas. O aplicativo usa o `react-native-svg` já instalado; o gerador DiceBear não é executado no celular.

```sh
npm run avatars:generate
```

Esse comando regenera `src/data/avatar-catalog.ts` a partir de `scripts/generate-avatars.mjs`. O arquivo gerado deve permanecer no repositório. As opções têm IDs estáveis como `dicebear:adventurer:2`; `src/domain/avatar.ts` resolve tanto esses IDs quanto avatares antigos salvos como emoji. A compatibilidade dos emojis é visual: o dado antigo só é substituído pelo novo ID ao salvar o perfil. Alterar o mock continua afetando apenas novas instalações.

Avatares Adventurer por **Lisa Wischofsky**, distribuídos por [DiceBear](https://www.dicebear.com/styles/adventurer/) sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Autoria, fonte, licença e alteração das cores de fundo também aparecem em Segurança e Privacidade.

## Conversas sobre metas e despesas

O Chat IA interpreta comandos por regras locais, sem enviar dados para serviços externos:

- “Quero criar uma economia para comprar um videogame”: identifica uma meta e pergunta quanto você deseja juntar. Responda, por exemplo, “R$ 3.000,00”, revise e confirme a criação.
- “Almocei por R$ 45”: prepara uma despesa de alimentação. Se disser apenas “Almocei”, pergunta o valor antes de preparar o registro.
- “Recebi R$ 200 de Renda Extra”: prepara uma receita.

Use os botões de confirmação ou responda “sim”/“cancelar”. Nada é salvo como meta ou Transação antes da confirmação. Criar uma meta não movimenta o saldo. Transações confirmadas atualizam os totais compartilhados de Home, Extrato e Relatórios. Conversas, valores pendentes e registros são persistidos no AsyncStorage, permitindo continuar após reabrir o aplicativo.

O assistente é uma simulação: frases ambíguas, valores inválidos ou múltiplos movimentos precisam ser esclarecidos. Ele não oferece compreensão irrestrita de linguagem natural.

## Autenticação — etapa 3

Cadastro/login e perfil estão conectados ao CodeIgniter Shield. Antes de iniciar, prepare o backend e suas migrations com `php spark migrate --all` dentro do container. Copie `.env.example` para `.env.local` se ainda não existir, configure `EXPO_PUBLIC_API_URL` e reinicie o Expo. No desenvolvimento web, use o mesmo hostname na API e no Expo para os cookies funcionarem. Em produção, use HTTPS e desative `EXPO_PUBLIC_ALLOW_LOCAL_HTTP`.

O Android/iOS usa SecureStore; a web usa cookie HttpOnly, sem tokens no armazenamento do navegador. A sessão é validada na abertura do app. Dados financeiros são locais e separados por conta/API, e registros anteriores ao login não são importados automaticamente. Recuperação de senha foi deixada fora desta etapa a pedido do usuário.

`npm run test:e2e` prepara a API e o banco isolados e executa os fluxos reais no navegador. Veja [guia completo de autenticação](../backend/docs/auth.md).

## Compatibilidade de dependências

O projeto utiliza Expo SDK 58 e as versões correspondentes de React e React Native. Para conferir e alinhar dependências, use `npx expo install --check`, `npx expo install --fix` e `npx expo-doctor`. Evite rebaixar apenas o pacote `expo` ou atualizar isoladamente React/React Native para outro SDK. Após alterações de dependências, encerre o Metro em execução e reinicie com `npx expo start --clear`.

Os avatares recebem acessibilidade no componente `ProfileAvatar`: o contêiner fornece o nome da imagem; o SVG usa `aria-hidden` na web e `accessible={false}` nas plataformas nativas. O gerador remove o atributo ARIA do XML para evitar que o parser o transforme em `ariaHidden`.

## Avatar e foto local — etapa 2

A personalização após o cadastro e **Editar Perfil** exibem somente a imagem atual. Toque nela ou na câmera para escolher um dos 12 avatares, selecionar uma foto ou remover a foto personalizada. Confirmar a prévia altera o rascunho; **Continuar** ou **Salvar perfil** conclui a gravação. Fechar o formulário descarta o rascunho. Remover a foto restaura o último DiceBear.

Fotos aceitas: JPEG, PNG e WebP até 10 MiB; HEIC/HEIF somente no seletor nativo com decodificação compatível. A imagem é recortada em quadrado e normalizada como JPEG 512 × 512, qualidade 85%, até 2 MiB. O seletor nativo oferece edição quando suportada; a Web aplica recorte central antes da prévia.

Android/iOS usam documentos privados do aplicativo; a Web guarda **Blob no IndexedDB**, separado por API/conta. AsyncStorage contém somente `profile.photoRef`, uma referência relativa opcional, e `avatar`, usado como fallback. Arquivos indisponíveis/corrompidos mostram DiceBear. Fotos não são enviadas à API nem sincronizadas entre aparelhos; limpar os dados do navegador/aplicativo remove as fotos locais.

As dependências nativas foram instaladas com Expo: `expo-image-picker`, `expo-file-system` e `expo-image-manipulator`. O plugin configura acesso a fotos e bloqueia câmera/microfone. Gere novamente o development build quando necessário para incorporar os módulos/configuração nativos.

## Contas a pagar e a receber — Etapa 22

Na Home, **Próximos compromissos → Ver todas** abre `/contas`. Cadastre previsões com descrição, categoria, valor, vencimento e observações. Os filtros usam vencimento para pendências e data efetiva para pagamentos/recebimentos. Atrasos são calculados pela data local; o total atrasado já faz parte do pendente.

Confirmar pagamento/recebimento permite ajustar valor e data efetivos e cria uma única transação vinculada. Conta e transação são salvas na mesma gravação do repositório financeiro. Pendências nunca movimentam o saldo. Para contas confirmadas, **Gerenciar** oferece correção do efetivo, edição somente da previsão, desfazer confirmação ou exclusão com escolha explícita sobre manter/excluir o lançamento. Editar o lançamento no Extrato atualiza valor/data efetivos da conta; sua exclusão direta é bloqueada até usar o fluxo de Contas.

A projeção da Home é uma estimativa de hoje aos próximos 30 dias: saldo atual + recebimentos pendentes − pagamentos pendentes **com vencimento dentro desse intervalo**. Atrasados anteriores ao horizonte e renda mensal planejada não entram. Valores acompanham a preferência de ocultação.

Repetição mensal prepara previsões até 12 meses à frente, ampliadas ao abrir/retomar o app e na mudança de data. O dia original é preservado (31 → último dia de fevereiro → 31 em março). Um cursor persistido impede recriar ocorrências excluídas. Editar a regra altera somente pendentes futuras; encerrar impede novas ocorrências e preserva todas as já criadas. Nenhuma recorrência cria transações efetivas.

As previsões continuam locais e isoladas por API/conta; suas confirmações gravam transações no banco. Os campos opcionais `commitments` e `commitmentRecurrences` são compatíveis com o formato v2 existente; não há limpeza ou conversão destrutiva. Nenhuma dependência foi adicionada. Previsões não são enviadas ao backend; os lançamentos efetivos utilizam a API financeira.

## Receitas, despesas e categorias no banco

Novas contas começam vazias. Cadastre suas categorias em **Ajustes → Categorias** e registre receitas/despesas no Extrato ou na Home. Os registros são gravados diretamente no MariaDB pela API autenticada e ficam disponíveis na mesma conta em outro aparelho. Não existe envio/importação de categorias antigas.

O banco é a fonte principal de receitas, despesas e categorias; AsyncStorage guarda uma cópia local. A atualização do Extrato recupera os dados da conta. Sem confirmação da API não há lançamento efetivo apenas local. Chat e confirmação de contas utilizam a mesma gravação de transações, com chaves estáveis e controle de revisão para evitar duplicações.

Metas, previsões, mensagens e fotos continuam locais. Perfis, preferências pessoais e login são preservados quando os registros financeiros são reiniciados. Ao abrir e conectar, o aplicativo descarta caches de uma geração anterior da base, sem reenviar os dados antigos. O comando de limpeza não é executado pelo launcher.

API: GET `/api/finance` retorna categorias/transações, chave da base e revisão. POST `/api/finance/transactions` grava alterações atomicamente; categorias mantêm seus endpoints próprios. Consulte a documentação do backend.
