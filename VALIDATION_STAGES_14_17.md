# 💚 Economizou — App de Organização Financeira Pessoal

> **Desafio:** Criação de um aplicativo de finanças com IA usando **Vibe Coding** (programação guiada por conversa com IA).
> **Projeto:** Economizou
> **Plataformas:** Android e iOS (Expo / React Native)
> **Status:** MVP front-end concluído, com novas etapas planejadas.

---

## 📱 1. Sobre o Aplicativo

O **Economizou** nasceu para resolver um problema simples: organizar o dinheiro sem o cansaço de preencher planilhas manuais. A ideia é permitir que qualquer pessoa acompanhe receitas, despesas e metas de forma prática, além de poder registrar movimentações conversando com um assistente virtual (ex: *"Gastei R$ 45 no almoço"*).

Nesta primeira fase, o projeto foi construído como um **MVP 100% front-end**. Ele usa dados fictícios ao abrir pela primeira vez e salva as informações no próprio celular (usando `AsyncStorage`). Ele ainda não possui conexão real com banco de dados, contas bancárias ou APIs pagas de IA.

### O que já está funcionando no app:
- **Início:** Saudação com nome e foto, notificações, resumo do mês (saldo, entradas e saídas), botão para esconder valores e lista das últimas transações.
- **Extrato:** Busca por texto, filtros por período ou categoria, além de opções para criar, editar ou apagar registros.
- **Relatórios:** Visão geral do dinheiro e gráficos simples de gastos por categoria.
- **Chat com Assistente (Simulado):** Entende comandos básicos de gastos e ganhos, pede confirmação e lança a movimentação direto no app.
- **Metas de Economia:** Criação e acompanhamento de metas, com barrinha de progresso e dicas simuladas para economizar.
- **Ajustes:** Edição de perfil, categorias personalizadas, opções de notificação e tela de segurança demonstrativa.
- **Memória Local:** Tudo o que você salva continua lá quando você fecha e abre o app novamente.

**Tecnologias utilizadas:** Expo SDK 58, React Native, TypeScript, Expo Router, React Context e AsyncStorage.

---

## 📄 2. Resumo dos Requisitos (PRD)

* **Objetivo:** Criar um app simples, bonito e direto para ajudar as pessoas a organizarem a vida financeira.
* **Público-Alvo:** Pessoas que querem controlar o orçamento diário de forma rápida, sem complicações.
* **Problema que resolve:** O controle financeiro manual dá trabalho e desmotiva. A maioria das pessoas se perde ao tentar categorizar tudo na mão.
* **Nossa solução:** Um dashboard visual acompanhado por um chat assistente que facilita os registros do dia a dia.
* **Visual:** Dark mode (fundo escuro), detalhes em verde-esmeralda, visual moderno para celular, cartões arredondados e navegação fácil na parte inferior da tela.
* **Regras do projeto nesta fase:** Sem backend, sem custos com APIs externas e sem promessas de que existe uma IA real rodando por trás nesta versão inicial.

---

## 💬 3. Prompts Utilizados no Desenvolvimento

Os comandos abaixo mostram como a ideia evoluiu. Os primeiros quatro foram usados no **Lovable** para criar os primeiros protótipos visuais. Mais tarde, o projeto foi recriado em Expo/React Native usando o **Codex** para virar um app de celular de verdade.

<details>
<summary>👉 Clique aqui para ver os prompts detalhados</summary>

### Prompt 1 — Lovable: Layout e Estilo Inicial
> Crie uma interface moderna, limpa e minimalista para um aplicativo móvel de finanças pessoais chamado 'FinVibe'. Use um tema dark mode elegante com detalhes em verde-esmeralda e cinza claro.
>
> Inclua:
> 1. Cabeçalho com saudação ('Olá, Alex 👋'), perfil e notificações.
> 2. Card principal com Saldo Total (R$ 4.250,00), Receita do Mês (R$ 6.000,00) e Despesas (R$ 1.750,00).
> 3. Acessos rápidos: Registrar Gasto, Ver Relatórios e Meta de Economia.
> 4. Três últimas transações com categoria, estabelecimento, data e valor em R$.
> 5. Navegação inferior: Home, Extrato, Chat IA e Configurações.
>
> Torne o layout responsivo e com aparência profissional de fintech.

### Prompt 2 — Lovable: Tela de Chat
> Adicione uma tela ou modal de 'Chat com o Agente de IA Financeiro', acessível pelo botão Chat IA da navegação inferior ou por botão flutuante.
>
> Crie um cabeçalho 'FinVibe AI Assistant', status 'Online' e botão fechar. Simule uma conversa:
> IA: 'Olá! Sou seu assistente financeiro. Como posso ajudar seu bolso hoje? Você pode me dizer o que gastou ou pedir uma dica de economia.'
> Usuário: 'Gastei R$ 45,00 no almoço no restaurante Silva.'
> IA: 'Anotado! Categoria: Alimentação 🍔. Seu saldo restante para Alimentação este mês é R$ 455,00.'
>
> Inclua campo 'Digite uma transação ou pergunta...', botão enviar e microfone simulado. Preserve o dark mode e verde-esmeralda.

### Prompt 3 — Lovable: Plano de Economia
> Adicione uma tela 'Plano de Economia Automático' gerado pela IA.
> Exiba a meta 'Economizar R$ 500,00 este mês' com barra de progresso em 60%.
> Apresente três recomendações simuladas:
> - Reduzir delivery nos finais de semana (-R$ 180,00).
> - Cancelar streaming não utilizado (-R$ 45,00).
> - Ajustar limite diário de lazer (-R$ 275,00).
>
> Inclua toggles para Aceitar ou Ignorar cada dica, recalculando a economia estimada. Adicione alerta ilustrativo: 'A IA detectou que você gastou 15% a mais em restaurantes nesta semana. Deseja ajustar a meta?'

### Prompt 4 — Lovable: Tornando Interativo
> Torne o protótipo interativo com React useState e dados fictícios.
> Ao enviar uma mensagem como 'Gastei R$ 30 em café', mostre-a no chat e gere, após um segundo, resposta simulada confirmando o registro. Atualize o saldo exibido na Home. Permita filtrar transações por categoria e adicione transições suaves ao abrir o chat e preencher a barra de progresso.

### Prompt 5 — Lovable: Melhorias de Perfil e Botões
> Inspecione os componentes, rotas e estados existentes. Sem reconstruir o app, torne clicáveis o avatar e o sino da Home, além dos itens Perfil, Notificações, Categorias e Segurança em Configurações.
> O avatar deve abrir o Perfil; o sino deve abrir Notificações. Crie uma tela de Perfil com avatar, nome, e-mail e edição básica. Garanta botão voltar, feedback visual, boa área de toque e consistência com o tema.

### Prompt 6 — Codex: Recriação em React Native / Expo
> Crie do zero um aplicativo mobile chamado Economizou utilizando Expo SDK 58, React Native e TypeScript.
> Use Expo Router, ícones compatíveis com Expo, AsyncStorage e React Context ou Zustand. Adote dark mode, detalhes verde-esmeralda, cards arredondados e layout responsivo.
> Implemente Home, Extrato, Chat de assistente simulado, Metas, Configurações e Relatórios alimentados pelo estado compartilhado.
> O projeto deve ser 100% front-end. Use dados fictícios e salvamento local. Execute TypeScript, lint e testes.

### Prompt 7 — Codex: Etapas Futuras (Planejadas)
> No projeto /econimizou, analise os arquivos e implemente de forma incremental:
> - Etapa 14: Ajustes de telas, teclado e áreas de clique no celular.
> - Etapa 15: Telas de cadastro com máscara de dinheiro em R$ e escolha simples de categoria.
> - Etapa 16: Telas de boas-vindas (Onboarding) para novos usuários.
> - Etapa 17: Gráficos visuais para acompanhar gastos ao longo dos meses.
</details>

*(Nota: Os prompts acima resumem as instruções dadas às IAs para manter a leitura organizada, sem alterar a ideia original).*

---

## 🛠️ 4. Como o Projeto Foi Desenvolvido

1. **Ideia Inicial:** Identificação do problema de controlar gastos manuais e definição do conceito inicial.
2. **Primeiros Mocks (Lovable):** Criação rápida das telas visuais, do chat simulado e dos cartões de metas.
3. **Teste de Uso:** Percebemos que alguns botões do protótipo web pareciam funcionais, mas não levavam a lugar nenhum (como clicar na foto de perfil).
4. **Mudança para Mobile Real:** Decidimos recriar a estrutura do app em **React Native com Expo**, garantindo um comportamento de aplicativo de celular de verdade.
5. **Construção via Codex:** Montagem do projeto final, conexões das telas, sistema para salvar dados no aparelho e testes de código.
6. **Próximos Passos:** Planejamento de telas de boas-vindas, máscaras para digitação de valores em Reais e gráficos mais detalhados.

---

## ✅ 5. Testes e O que Saber Sobre o App

- **O que já foi testado no código:**
  - 22 testes de lógica e salvamento de dados funcionando.
  - 16 testes de visual em telas de celular aprovados.
  - Verificação de código e estilos sem erros no TypeScript.
- **Limitações Atuais:**
  - O aplicativo ainda não foi testado em um celular físico via lojas (App Store/Google Play).
  - As respostas do chat são **simuladas** para demonstração da ideia (não gastam com APIs de IA nem exigem internet).

---

## 🧠 6. O que Aprendi com o Vibe Coding?

**O que deu muito certo:**  
Desenvolver em partes pequenas foi a melhor decisão. Em vez de pedir *"crie um app de finanças completo"*, construir primeiro a tela principal, depois o chat e só então as regras de saldo tornou o processo muito mais rápido e sem erros. Conversar com a IA exige clareza: quanto melhor o briefing, melhor a resposta.

**O que não funcionou de primeira:**  
No começo, o protótipo visual do Lovable parecia incrível, mas era apenas uma "casca". Vários botões não funcionavam e a experiência web não é idêntica à de um aplicativo nativo instalado no celular. Foi preciso migrar para o Expo para transformar a ideia em um app real.

**A maior lição:**  
Programar com IA não significa apertar um botão e esperar a mágica acontecer. A IA funciona como um assistente rápido, mas a direção, a revisão dos fluxos e a garantia de que os botões realmente funcionam dependem do olhar humano.

---

## 🚀 7. Como Rodar o Projeto

```bash
# Clone este repositório
git clone [https://github.com/seu-usuario/economizou.git](https://github.com/seu-usuario/economizou.git)

# Entre na pasta
cd economizou

# Instale os pacotes
npm install

# Inicie o app com o Expo
npx expo start