Econimizou — App de Organização Financeira Pessoal
Desafio: Desenvolvimento de um conceito de aplicativo financeiro com IA utilizando Vibe Coding
Projeto: Econimizou
Plataforma: Android e iOS (Expo / React Native)
Estado documentado: MVP front-end desenvolvido; melhorias adicionais planejadas
1. Resumo do aplicativo
O Econimizou é um aplicativo mobile de organização financeira pessoal criado para facilitar o acompanhamento de receitas, despesas e metas de economia. Em vez de depender apenas de anotações manuais, o usuário pode registrar movimentações, consultar relatórios, acompanhar suas metas e interagir com um assistente financeiro simulado, usando frases naturais como “Gastei R$ 45 no almoço”.

O projeto foi desenvolvido inicialmente como um MVP 100% front-end, com dados fictícios na primeira execução e persistência local usando AsyncStorage. Não possui integração real com IA, contas bancárias, backend ou autenticação.
Funcionalidades implementadas conforme o relatório de desenvolvimento
- Início: saudação, avatar, notificações, saldo total, receitas e despesas do mês, visibilidade dos valores e últimas transações.
- Extrato: pesquisa, filtros por período/tipo/categoria e cadastro, edição e exclusão de transações.
- Relatórios: resumo financeiro e visualização das despesas por categoria.
- Chat IA simulado: interpreta alguns comandos de receitas e despesas, solicita confirmação e registra a transação no estado compartilhado.
- Metas: cadastro, edição e exclusão, progresso e recomendações simuladas de economia.
- Ajustes: perfil, categorias, preferências, notificações simuladas e tela demonstrativa de segurança.
- Persistência: dados locais preservados entre aberturas, com validação e migração da estrutura inicial.
Tecnologias: Expo SDK 58, React Native, TypeScript, Expo Router, React Context e AsyncStorage.
2. PRD simplificado — prompt final consolidado
Objetivo: Criar um aplicativo mobile chamado Econimizou para auxiliar pessoas a organizar finanças pessoais com uma experiência visual simples, moderna e interativa.

Público-alvo: Pessoas que desejam controlar receitas, despesas e metas de economia de forma prática, mesmo sem experiência com aplicativos financeiros.

Problema: O controle financeiro manual é trabalhoso; muitas pessoas têm dificuldade em visualizar gastos por categoria, acompanhar o saldo e manter hábitos de economia.

Solução: Um aplicativo com dashboard financeiro, extrato filtrável, cadastro de transações, relatórios, metas e chat de assistente financeiro simulado. As informações devem ser sincronizadas no estado local e preservadas no dispositivo.

Tecnologias: Expo SDK 58, React Native, TypeScript, Expo Router, React Context ou Zustand, AsyncStorage e componentes reutilizáveis.

Visual: Dark mode, verde-esmeralda, layout mobile-first, cards arredondados, ícones intuitivos, navegação inferior e boa acessibilidade.

 Funcionalidades essenciais:
1. Início com saldo, receitas, despesas, últimas transações, notificações e botão de ocultar valores.
2. Extrato com pesquisa, filtros e inclusão/edição/exclusão de receitas e despesas.
3. Chat financeiro simulado que interpreta comandos simples, pede confirmação e atualiza transações.
4. Metas de economia com progresso e dicas simuladas aceitas ou ignoradas.
5. Perfil, categorias, notificações e preferências em Ajustes.
6. Relatórios financeiros calculados a partir das transações locais.
Requisitos não funcionais: Navegação funcional, validação de formulários, segurança contra registros duplicados, cálculos em centavos, persistência local, responsividade, TypeScript estrito, lint e testes.

Restrições: Projeto apenas front-end nesta fase; não criar backend, autenticação real, APIs externas, integração bancária nem afirmar que há uma IA real.

Critérios de aceite: O usuário deve conseguir registrar, editar, excluir e consultar transações, ver saldos consistentes, acompanhar metas, usar o chat demonstrativo e reencontrar seus dados ao reabrir o aplicativo.

3. Histórico dos prompts utilizados e preparados
Os prompts abaixo registram a evolução da ideia. Os quatro primeiros foram apresentados para o Lovable; posteriormente, o projeto foi refeito em Expo com um prompt para o Codex. Os prompts das etapas 14–17 foram preparados depois, mas sua execução ainda não foi confirmada nesta conversa.
Prompt 1 — Lovable: estrutura base e design
Crie uma interface moderna, limpa e minimalista para um aplicativo móvel de finanças pessoais chamado 'FinVibe'. Use um tema dark mode elegante com detalhes em verde-esmeralda e cinza claro.

Inclua:
1. Cabeçalho com saudação ('Olá, Alex 👋'), perfil e notificações.
2. Card principal com Saldo Total (R$ 4.250,00), Receita do Mês (R$ 6.000,00) e Despesas (R$ 1.750,00).
3. Acessos rápidos: Registrar Gasto, Ver Relatórios e Meta de Economia.
4. Três últimas transações com categoria, estabelecimento, data e valor em R$.
5. Navegação inferior: Home, Extrato, Chat IA e Configurações.

Torne o layout responsivo e com aparência profissional de fintech.
Prompt 2 — Lovable: interface de chat
Adicione uma tela ou modal de 'Chat com o Agente de IA Financeiro', acessível pelo botão Chat IA da navegação inferior ou por botão flutuante.

Crie um cabeçalho 'FinVibe AI Assistant', status 'Online' e botão fechar. Simule uma conversa:
IA: 'Olá! Sou seu assistente financeiro. Como posso ajudar seu bolso hoje? Você pode me dizer o que gastou ou pedir uma dica de economia.'
Usuário: 'Gastei R$ 45,00 no almoço no restaurante Silva.'
IA: 'Anotado! Categoria: Alimentação 🍔. Seu saldo restante para Alimentação este mês é R$ 455,00.'

Inclua campo 'Digite uma transação ou pergunta...', botão enviar e microfone simulado. Preserve o dark mode e verde-esmeralda.
Prompt 3 — Lovable: plano automático de economia (protótipo)
Adicione uma tela 'Plano de Economia Automático' gerado pela IA.

Exiba a meta 'Economizar R$ 500,00 este mês' com barra de progresso em 60%.
Apresente três recomendações simuladas:
- Reduzir delivery nos finais de semana (-R$ 180,00).
- Cancelar streaming não utilizado (-R$ 45,00).
- Ajustar limite diário de lazer (-R$ 275,00).

Inclua toggles para Aceitar ou Ignorar cada dica, recalculando a economia estimada. Adicione alerta ilustrativo: 'A IA detectou que você gastou 15% a mais em restaurantes nesta semana. Deseja ajustar a meta?'
Prompt 4 — Lovable: estado local e interações
Torne o protótipo interativo com React useState e dados fictícios.

Ao enviar uma mensagem como 'Gastei R$ 30 em café', mostre-a no chat e gere, após um segundo, resposta simulada confirmando o registro. Atualize o saldo exibido na Home. Permita filtrar transações por categoria e adicione transições suaves ao abrir o chat e preencher a barra de progresso.
Prompt 5 — Lovable: melhoria de navegação e perfil
Inspecione os componentes, rotas e estados existentes. Sem reconstruir o app, torne clicáveis o avatar e o sino da Home, além dos itens Perfil, Notificações, Categorias e Segurança em Configurações.

O avatar deve abrir o Perfil; o sino deve abrir Notificações. Crie uma tela de Perfil com avatar, nome, e-mail e edição básica. Garanta botão voltar, feedback visual, boa área de toque e consistência com o tema. As demais telas podem ter estrutura inicial, mas não devem simular funcionalidades que não existem. Preserve Home, Extrato e Chat IA.
Prompt 6 — Codex: recriação do projeto mobile Econimizou
Crie do zero um aplicativo mobile chamado Econimizou utilizando Expo SDK 58, React Native e TypeScript.

Use Expo Router, ícones compatíveis com Expo, AsyncStorage e React Context ou Zustand. Adote dark mode, detalhes verde-esmeralda, cards arredondados, componentes reutilizáveis e layout responsivo.

Implemente:
- Home com saldo, receitas, despesas, últimas transações, avatar, notificações e botão de ocultar valores.
- Extrato com filtros, pesquisa, cadastro, edição e exclusão.
- Chat financeiro simulado capaz de reconhecer comandos simples, solicitar confirmação e atualizar transações.
- Metas com progresso e recomendações simuladas.
- Configurações com perfil, categorias, notificações e preferências.
- Relatórios financeiros alimentados pelo estado compartilhado.

O projeto deve ser 100% front-end, sem backend, autenticação real ou APIs externas. Use dados fictícios iniciais e AsyncStorage; calcule valores financeiros corretamente e evite botões sem ação.

Execute TypeScript, lint e testes. Implemente de forma incremental e apresente o resumo dos arquivos e verificações.
Prompt 7 — Codex: etapas 14 a 17 (planejadas; execução não confirmada)
No projeto /mnt/DEV/DEVTEAM/econimizou, analise os arquivos e implemente de forma incremental, sem reconstruir o projeto e sem alterar dados existentes:

Etapa 14 — Layout, navegação e teclado: corrigir responsividade, Safe Area, rolagem, campos cobertos pelo teclado, modais, botão voltar e áreas de toque.

Etapa 15 — Cadastro de receitas/despesas: melhorar seleção do tipo, máscara monetária R$, categoria, descrição, data, validação, foco no campo inválido, estados de salvamento e confirmação. Preservar edição e exclusão.

Etapa 16 — Onboarding: boas-vindas, explicação de transações, metas e chat; Próximo, Voltar, Pular e Começar; coleta de nome; conclusão persistida no AsyncStorage; não reapresentar para usuários com dados existentes; permitir reabrir o tutorial.

Etapa 17 — Gráficos interativos: despesas por categoria, receitas versus despesas e evolução do saldo; filtros de período, detalhes ao tocar, legendas, estado vazio e respeito à preferência de ocultar valores. Utilizar os dados locais existentes.

Preservar dark mode, verde-esmeralda, Expo SDK 58, TypeScript, Expo Router, AsyncStorage e a arquitetura atual. Não adicionar backend nem APIs externas. Executar lint, TypeScript e testes existentes, acrescentar testes quando necessário e relatar resultados sem afirmar validação física não realizada.
Nota de fidelidade: Os textos acima preservam os objetivos e requisitos dos prompts compartilhados nesta conversa, mas alguns foram consolidados e reformatados para facilitar a leitura; não representam um log literal/exportado de todas as mensagens enviadas ao Lovable ou ao Codex.
4. Processo de desenvolvimento
1. Ideação: definição do problema de controle financeiro manual e conceito inicial FinVibe.
2. Prototipação com Lovable: elaboração incremental de interface, chat, plano de economia e interações simuladas.
3. Avaliação de usabilidade: identificação de itens que pareciam clicáveis, mas não tinham navegação ou ações reais, como avatar, sino e opções de Configurações.
4. Escolha técnica: decisão de refazer o projeto com Expo e React Native para priorizar a experiência mobile.
5. Implementação via Codex: criação da estrutura do Econimizou, estados compartilhados, persistência local, telas e testes.
6. Próximos refinamentos: planejamento das melhorias de layout/teclado, formulários, onboarding e gráficos financeiros.
5. Validações e limitações
Conforme o relatório de implementação compartilhado:
- 22 testes de domínio e persistência passaram.
- 16 testes de interface web passaram, em duas dimensões de celular.
- TypeScript, lint e compatibilidade de dependências foram aprovados.
- Exportação web e bundles Android/iOS foram gerados.
Limitações: Não foram informados testes em celular físico ou emulador, nem geração de instaladores APK/IPA. Os resultados acima são baseados no relatório fornecido e não foram auditados independentemente aqui. A execução das etapas 14–17 ainda não foi confirmada.
6. Reflexão sobre o uso de IA e Vibe Coding
O que funcionou bem?
O desenvolvimento em etapas pequenas foi o principal acerto. Começar pela identidade visual e pela navegação, depois acrescentar telas, regras de negócio e persistência, tornou a proposta mais clara. Os prompts com requisitos e critérios de aceite ajudaram a orientar as ferramentas e reduzir ambiguidades. O uso do Codex junto de Expo permitiu transformar um protótipo em um MVP mobile mais estruturado.
O que não funcionou como esperado?
No protótipo inicial, alguns elementos visuais, como avatar, sino e itens de Configurações, pareciam interativos, mas não executavam ações. Isso mostrou que uma interface bonita não significa uma experiência completa. Também ficou evidente que um layout web responsivo criado no Lovable não é a mesma coisa que um aplicativo nativo em React Native. Além disso, o chat financeiro atual é uma simulação, não uma integração real com um modelo de IA.
O que aprendi ao conversar com IAs?
Aprendi que a qualidade do resultado depende muito da clareza do pedido. Em vez de solicitar o aplicativo inteiro de uma vez, é mais eficiente explicar o contexto, definir uma funcionalidade por vez, listar restrições e estabelecer como verificar se ela funciona. Também entendi a importância de revisar o código gerado, testar os fluxos e pedir correções específicas: a IA acelera o desenvolvimento, mas não substitui a validação humana.
7. Conclusão
O Econimizou demonstra como o Vibe Coding pode ajudar a transformar uma ideia de organização financeira em um protótipo funcional e, depois, em um MVP mobile. A experiência reforçou que o maior benefício da IA está na colaboração iterativa: descrever, construir, testar, identificar limitações e melhorar.

Para completar a entrega do desafio, anexar ao repositório capturas de tela reais das interações com Lovable/Codex, da execução dos prompts e das principais telas do aplicativo. Este README não substitui esses prints.

## Melhorias das etapas 14 a 17

- **Layout e teclado:** rolagem compartilhada para revelar inputs, formulários/modais com altura limitada, redimensionamento no Android, abas ocultas com teclado e cabeçalho adaptado a nomes longos.
- **Transações:** máscara monetária de centavos (`4500` → `R$ 45,00`), calendário local, categorias com ícones, erros por campo e foco no primeiro erro. O formulário confirma a saída com alterações não salvas e mostra sucesso após gravar. Toque em **Concluir** para retornar; edição e exclusão continuam disponíveis.
- **Onboarding:** quatro telas na primeira utilização; Pular leva diretamente ao nome. A conclusão é persistida junto com o perfil. Quem já tem dados salvos entra normalmente e pode acessar **Ver tutorial novamente** em Ajustes, sem alterar os registros.
- **Gráficos:** Relatórios inclui despesas por categoria, receitas versus despesas e evolução do saldo mensal. Toque em uma fatia, barra, ponto ou legenda para detalhar. Escolha mês, ano ou todo o histórico. Cores de categorias permanecem consistentes após renomear e mudar filtros. A preferência de ocultar valores também se aplica aos detalhes.

O saldo do gráfico inclui os registros anteriores ao filtro; a movimentação mostra somente o intervalo selecionado. Metas continuam sem movimentar dinheiro no extrato.

Detalhes dos arquivos, resultados por etapa e limites da validação: [VALIDATION_STAGES_14_17.md](./VALIDATION_STAGES_14_17.md). Os módulos nativos novos devem ser incluídos em um development build compatível com SDK 58; não foi gerado APK/IPA nesta implementação.


## Editar receitas pela Home

No card de visão geral, toque em **Editar receitas do mês**. Se houver uma única receita, o formulário abre com o valor atual preenchido. Havendo várias, selecione o registro que deseja alterar. O total continua sendo a soma das receitas do mês; salvar atualiza saldo, Extrato e Relatórios e persiste a alteração com AsyncStorage. Se o mês não tiver receitas, o botão **Adicionar receita do mês** abre o cadastro com o tipo Receita selecionado.
