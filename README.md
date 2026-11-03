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
- **Configurações:** editar perfil, categorias e preferências.

Por enquanto, o aplicativo funciona apenas com dados locais. O chat simula uma inteligência artificial e não utiliza uma API real.

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
cd projeto-econimizou
npm install
```

Inicie o projeto:

```bash
npx expo start
```

## 📌 Status do projeto

O Economizou já possui suas principais funcionalidades desenvolvidas, mas continua sendo um projeto de aprendizado.

Atualmente, funciona apenas com dados locais e ainda não possui conexão com bancos ou inteligência artificial real.

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

O perfil usa uma galeria de 12 avatares **Adventurer** do DiceBear, com fundos adaptados ao tema escuro. Acesse **Ajustes → Editar perfil**, escolha uma opção e toque em **Salvar perfil**, que fica fixo no rodapé do modal. A prévia muda ao selecionar; Home e Ajustes usam o mesmo componente e identificador salvo no AsyncStorage.

Os SVGs estão incluídos no aplicativo, sem API externa ou envio de dados do perfil. `@dicebear/core` 10.7.0 e `@dicebear/styles` 10.6.0 são dependências de desenvolvimento com versões fixas. O aplicativo usa o `react-native-svg` já instalado; o gerador DiceBear não é executado no celular.

```sh
npm run avatars:generate
```

Esse comando regenera `src/data/avatar-catalog.ts` a partir de `scripts/generate-avatars.mjs`. O arquivo gerado deve permanecer no repositório. As opções têm IDs estáveis como `dicebear:adventurer:2`; `src/domain/avatar.ts` resolve tanto esses IDs quanto avatares antigos salvos como emoji. A compatibilidade dos emojis é visual: o dado antigo só é substituído pelo novo ID ao salvar o perfil. Alterar o mock continua afetando apenas novas instalações.

Avatares Adventurer por **Lisa Wischofsky**, distribuídos por [DiceBear](https://www.dicebear.com/styles/adventurer/) sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Autoria, fonte, licença e alteração das cores de fundo também aparecem em Segurança e privacidade.

## Conversas sobre metas e despesas

O Chat IA interpreta comandos por regras locais, sem enviar dados para serviços externos:

- “Quero criar uma economia para comprar um videogame”: identifica uma meta e pergunta quanto você deseja juntar. Responda, por exemplo, “R$ 3.000,00”, revise e confirme a criação.
- “Almocei por R$ 45”: prepara uma despesa de alimentação. Se disser apenas “Almocei”, pergunta o valor antes de preparar o registro.
- “Recebi R$ 200 de renda extra”: prepara uma receita.

Use os botões de confirmação ou responda “sim”/“cancelar”. Nada é salvo como meta ou transação antes da confirmação. Criar uma meta não movimenta o saldo. Transações confirmadas atualizam os totais compartilhados de Home, Extrato e Relatórios. Conversas, valores pendentes e registros são persistidos no AsyncStorage, permitindo continuar após reabrir o aplicativo.

O assistente é uma simulação: frases ambíguas, valores inválidos ou múltiplos movimentos precisam ser esclarecidos. Ele não oferece compreensão irrestrita de linguagem natural.

Obs: Versão de teste, será implementado uma versão mais completa.
