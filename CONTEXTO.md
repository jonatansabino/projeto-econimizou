# Economizou — contexto para continuar o desenvolvimento

Atualizado em **13/11/2026**, a partir do código e do histórico desta colaboração.
Este arquivo transfere o contexto do projeto para outro computador/VS Code; não sincroniza a conversa nem substitui a inspeção do código atual.

## Como retomar em outro VS Code

Abra a raiz do repositório e envie ao Codex:

> Leia AGENTS.md e CONTEXTO.md, confira o estado atual do Git e inspecione os arquivos relevantes antes de alterar o projeto. Preserve dados e funcionalidades existentes. Continue a partir da tarefa que eu solicitar, sem reconstruir o aplicativo.

Mantenha este documento atualizado após mudanças relevantes. Ele descreve um checkpoint; o código, os arquivos de lock e novas instruções do usuário têm precedência quando houver divergência. Para levar este contexto a outra máquina, inclua o arquivo na transferência do repositório ou em um commit/push feito pelo usuário.

## Estrutura e tecnologias

```text
raiz-do-projeto/
├── frontend/          # Expo / React Native / TypeScript
├── backend/           # CodeIgniter / Shield / MariaDB / Docker
├── start.mjs          # Inicializador Node.js multiplataforma
├── start              # Atalho executável Linux/macOS
├── package.json       # npm start da raiz
├── AGENTS.md
├── CONTEXTO.md
└── README.md
```

A raiz usada nesta colaboração foi `/mnt/DEV/DEVTEAM/economizou`. Caminhos antigos mencionados na conversa (`econimizou/econimizou-api`, `economizou-api` ou `projeto-econimizou`) não devem ser presumidos na nova máquina. Trabalhe com os diretórios relativos `frontend/` e `backend/` do checkout aberto.

- Frontend: Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript, Expo Router, Context, AsyncStorage, SecureStore, Vector Icons, react-native-gifted-charts e SVG. Consulte `frontend/package.json` e o lock para versões exatas.
- Backend: PHP 8.3 + Apache, CodeIgniter 4.7, Shield 1.4, Settings e MariaDB 11.4. Consulte `backend/composer.lock`.
- Identidade visual: dark mode, verde-esmeralda, interface mobile-first em português brasileiro e valores em reais.

## Regras e decisões do usuário

- Inspecionar antes de implementar; reutilizar componentes, serviços e estados. Não reconstruir o app.
- Trabalhar por etapas e validar antes de avançar.
- Preservar dados locais, tabelas, migrations aplicadas e volumes Docker. Não executar `down -v`, refresh ou rollback no banco da aplicação.
- O pedido inicial de app sem backend foi ampliado posteriormente: hoje há autenticação real e perfil na API, autorizados pelo usuário.
- O catálogo de categorias está integrado à API por usuário. Transações, contas e metas continuam locais. Categorias antigas da conta atual têm envio explícito; a chave legada sem dono não é importada. Não há autorização implícita para sincronizar os demais dados financeiros.
- **Recuperação de senha foi explicitamente excluída pelo usuário**: não adicionar tela, link, endpoint ou envio fictício de e-mail sem nova solicitação.
- Não criar autenticação própria nem armazenar senhas fora do Shield. Não guardar credenciais/tokens no AsyncStorage ou em logs.
- Não declarar testes em Windows, dispositivo físico ou emulador nativo que não tenham sido realizados.
- Seguir também `frontend/AGENTS.md`; consultar documentação da versão do Expo antes de mudanças nas APIs Expo/React Native.

## Funcionalidades do frontend já existentes

- Login e cadastro incluem opções visuais de Google e Outlook, com aviso de disponibilidade futura; não realizam autenticação social nem chamadas à API.
- Home: nome/avatar, notificações, saldo e totais calculados pelo estado compartilhado, ocultar valores, atalhos e transações recentes por categoria.
- Extrato: pesquisa, filtros, cadastro, edição e exclusão de receitas/despesas. Formulário com máscara brasileira, categorias, descrição, calendário, validação e prevenção de salvamento duplicado.
- Receita do mês: ação para editar uma receita existente; quando houver várias, permite escolher o registro. Sem receitas, abre o cadastro correspondente. Totais acompanham as transações.
- Chat IA: simulação por regras locais. Distingue pedidos de metas (ex.: economizar para videogame) de gastos/receitas; pergunta informações ausentes, mantém contexto pendente após recarga e exige confirmação. Criar meta não altera saldo.
- Metas: criação/edição, progresso e recomendações simuladas com aceitar/ignorar.
- Ajustes: perfil, categorias, notificações simuladas, preferências e privacidade. Nome/avatar são atualizados também na API.
- Onboarding de quatro telas com nome final, conclusão persistida e opção de rever o tutorial.
- Relatórios/gráficos interativos: despesas por categoria, receitas versus despesas e evolução do saldo, filtros e respeito à preferência de ocultar valores.
- Avatares: 12 opções DiceBear Adventurer geradas e incluídas localmente como SVG. Sem chamada ao serviço externo. Emojis antigos têm compatibilidade visual sem sobrescrita automática. Créditos/licença documentados.
- Layout: Safe Area, teclado, rolagem e telas estreitas foram revisados.

### Últimos ajustes nos campos de senha

Em `frontend/src/components/auth-form.tsx`, o botão de mostrar/ocultar fica **dentro do input**, à direita. Cada campo (senha e confirmação) tem controle independente. O ícone só aparece quando há texto; apagar todo o conteúdo oculta o ícone e redefine o campo para senha oculta. O componente `Field` em `src/components/ui.tsx` possui `trailingAccessory` com espaço reservado para evitar sobrepor o texto.

Avisos web anteriores de `ariaHidden` e `accessible={false}` foram corrigidos na renderização dos avatares. Não reintroduzir props exclusivas de acessibilidade nativa diretamente no DOM.

## Autenticação e armazenamento

Fluxo: criar conta/entrar → Shield → onboarding quando aplicável → área financeira. Expo Router protege as telas e aguarda a restauração de sessão.

| Método | Endpoint | Função |
| --- | --- | --- |
| GET | `/health` | Saúde da API e conexão com banco |
| POST | `/api/auth/register` | Nome, e-mail, senha e confirmação |
| POST | `/api/auth/login` | Autenticação real |
| GET | `/api/auth/me` | Validar sessão e consultar perfil |
| POST | `/api/auth/logout` | Revogar somente o token atual |
| PATCH | `/api/auth/profile` | Atualizar nome/avatar do próprio usuário |
| GET | `/api/auth/csrf` | Preparar proteção CSRF web |

- Tokens oficiais do Shield, escopo `api`, validade absoluta padrão de 24 horas. Não há refresh token; expiração exige novo login.
- Android/iOS: Bearer persistido no `expo-secure-store`, com namespace por API.
- Web: token somente em cookie HttpOnly, SameSite e Secure em HTTPS/produção, com CORS de origens explícitas e proteção CSRF. Sem Bearer no JSON web ou no armazenamento JavaScript.
- Login/cadastro têm limitação de tentativas; mensagens JSON são sanitizadas. Contas inativas/bloqueadas são recusadas.
- Restauração valida `/me`. Falha inicial de rede bloqueia a área financeira e oferece reconexão. Logout com falha de rede mantém a sessão e informa o erro, permitindo repetir.
- A chave antiga `@econimizou/finance` permanece intacta. Não foi atribuída automaticamente a nenhuma conta.
- Finanças de cada conta usam `@econimizou/finance:account:<api>:<id>`. Provider financeiro é remontado ao trocar de conta. Contas novas começam sem transações/metas fictícias.
- Autenticação, preferências de tutorial e finanças são tratadas separadamente. O logout não apaga registros financeiros locais.

### Arquivos de referência

- Frontend: `src/state/auth-store.ts`, `auth-context.tsx`, `finance-store.ts`, `finance-context.tsx`; `src/data/auth-api.ts`, `token-storage.ts`, `token-storage.web.ts`, `account-finance-repository.ts`, `finance-repository.ts`; `src/domain/`; `src/app/_layout.tsx` e rotas em `src/app/`.
- Backend: `app/Controllers/Api/AuthController.php`, `app/Filters/ApiRequest.php`, `ApiToken.php`, `AuthRateLimit.php`, `app/Config/AuthApi.php`, `Routes.php`, `Cors.php` e `app/Models/UserOwnedModel.php`.
- Documentação detalhada: [autenticação](backend/docs/auth.md), [esquema financeiro](backend/docs/database.md), [validação backend](backend/VALIDATION.md), [validação frontend](frontend/VALIDATION.md).

## Banco e Docker

As tabelas oficiais de autenticação vêm das migrations do Shield/Settings. As financeiras são `transactions`, `categories`, `goals`, `category_budgets`, `notifications`, `user_preferences`, `chat_messages` e `saving_recommendations`. Também existem `bootstrap_checks`, `auth_rate_limits` e o controle de migrations.

Valores financeiros usam BIGINT em centavos. Existem FKs, índices, auditoria, unicidade de categorias/limites mensais e Models com escopo por usuário autenticado. Não há senhas em tabelas próprias. Categorias possuem endpoints autenticados; os demais CRUDs financeiros continuam locais.

O nome Compose permanece **`economizou-api`**, mesmo quando a pasta é renomeada. Containers principais: `economizou-api` e `economizou-db`. API em `http://localhost:8080`; MariaDB interno `db:3306` e acesso local em `3307`. Volumes de desenvolvimento: `economizou-api_mariadb_data`, `economizou-api_vendor_data`, `economizou-api_writable_data`.

### Correção do entrypoint Windows/Linux

Erro reportado: `exec /usr/local/bin/economizou-entrypoint: no such file or directory`. A cópia Linux estava em LF e saudável; foi reproduzido um erro equivalente usando CRLF em script temporário. A imagem agora remove CRLF com `sed`, aplica `0755`, verifica `/bin/sh`, valida a sintaxe e usa o caminho absoluto no `ENTRYPOINT`. `.gitattributes` mantém `.sh`, `start` e Dockerfiles em LF. Configurações e volumes foram preservados.

## Inicialização em Windows e Linux

Na raiz:

```sh
npm ci --prefix frontend  # Primeira instalação ou atualização das dependências
npm start
# Opções:
npm start -- --clear
npm start -- --port 8081
```

Alternativas: `node start.mjs` em ambos os sistemas; `./start` no Linux/macOS. O launcher usa apenas módulos nativos do Node e inicia o CLI local do Expo com `process.execPath`, sem Bash, `npx.cmd` ou shell intermediário.

Requer Node 22.13+ da linha 22, 24.3+ da linha 24 ou 26+. Na última sessão, o shell padrão resolveu Node 18, mas havia Node 22.23.2 instalado por NVM; o teste real usou o Node 22. Confira `node --version` na máquina de destino. No Windows, Docker Desktop deve estar iniciado em modo de containers Linux.

Sequência do launcher: verificar ferramentas/dependências → criar `.env` local a partir do exemplo somente se ausente → `docker compose up -d --build --wait app db` → `php spark migrate --all` → Expo. Falhas interrompem a sequência. Argumentos extras são encaminhados ao Expo. `Ctrl+C` encerra o Expo, mantendo containers ligados.

Os arquivos locais `backend/.env` e `frontend/.env.local` não são transferidos pelo Git. Configure `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_ALLOW_LOCAL_HTTP` conforme os exemplos. Em celular físico, use o IP do computador; no Android Emulator, `10.0.2.2`. Na web, API e frontend devem usar o mesmo hostname; outras origens/portas exigem ajuste na lista CORS do backend. Produção exige HTTPS. Não inserir credenciais pessoais neste documento.

## Validação e limites do que foi testado

Os resultados abaixo são históricos, **não uma nova execução dos testes ao criar este arquivo**:

| Momento | Resultado registrado |
| --- | --- |
| Autenticação completa | Backend: 49 testes/423 asserções; frontend: 61 testes de domínio; Playwright: 56 casos em 390 × 844 e 320 × 740 |
| Autenticação completa | TypeScript, ESLint, Expo Doctor 20/20, compatibilidade de dependências, exportação web e bundles Android/iOS passaram |
| Ícone dentro do input | TypeScript, ESLint e 12 casos E2E de autenticação passaram; geometria e alternância verificadas em 320/390 px |
| Ícone só com texto | TypeScript e ESLint passaram; não foi repetida a suíte E2E completa após esse ajuste |
| Correção Docker | Build sem cache, Compose saudável e `/health` HTTP 200; migrations executadas depois da saúde e histórico comparado sem alteração de versões/horários/batches |
| Launcher Node.js | `npm start -- --help` e inicialização real com Node 22 no Linux passaram: Docker, migrations, `/health` e Metro em 8098; Ctrl+C encerrou o Expo |

**Não houve execução direta no Windows/Docker Desktop, em aparelho físico ou emulador nativo.** Bundles Android/iOS não comprovam execução do SecureStore em dispositivo. Não há promessa de implantação em produção ou sincronização financeira.

Comandos para revalidar, conforme a próxima alteração:

```sh
# Na raiz:
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend

# Em backend/:
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --wait db-test
docker compose exec -T app composer test

# Na raiz, depois que o PHPUnit terminar:
npm run test:e2e --prefix frontend
```

O E2E prepara a API real isolada em `127.0.0.1:8082`. PHPUnit e E2E usam MariaDB `db-test/economizou_test` em tmpfs; **não executá-los simultaneamente**, pois o PHPUnit recria o esquema de teste. Nunca apontar o bootstrap de testes para o banco da aplicação.

## Pendências e próxima tarefa

A solicitação mais recente implementa melhorias no cadastro e personalização opcional do perfil. Consulte a seção abaixo e os registros de validação; não avance para novas integrações sem solicitação.

Possíveis trabalhos futuros, somente quando solicitados: CRUDs/sincronização financeira, migração consentida do armazenamento antigo, recuperação de senha, implantação e validação direta no Windows/dispositivos. Antes de qualquer trabalho, conferir o Git, as instruções e a nova solicitação do usuário; não tratar esta lista como autorização para implementar tudo.


## Atualização de cadastro e personalização — 13/11/2026

O cadastro reutiliza Shield e agora mostra força de senha orientativa, valida confirmação obrigatória e limite em bytes e foca o campo com erro também quando a API rejeita os dados. Ícones de senha continuam internos ao input, presentes apenas com texto. O SVG Outlook enviado pelo usuário foi preservado; os botões sociais continuam apenas informativos.

Nova rota protegida `personalizacao`: nascimento opcional com seletores Dia/Mês/Ano limitados até hoje, quatro objetivos financeiros opcionais e renda mensal opcional em reais. Pode continuar sem preencher ou pular; depois segue o onboarding existente, sem repetir a personalização concluída. Edição posterior usa os mesmos componentes no modal Editar Perfil. A renda é preferência de planejamento e não altera transações/saldos. Nenhuma idade é calculada ou usada para sugestões.

Migration complementar `2026-11-13-000004_AddProfilePersonalization` adiciona `birth_date`, `financial_objective`, `monthly_income_cents` (BIGINT) e `personalization_completed` em `user_preferences`. Não altera migrations anteriores. Contas existentes recebem conclusão padrão, novos cadastros começam pendentes. `/api/auth/me` inclui `user.personalization`; o PATCH de perfil aceita campos parciais, permite limpar opcionais com null e rejeita dono no payload. Shield e escopo do Model continuam controlando a identidade.

Pular com sucesso persiste conclusão no servidor. Se a rede/servidor falhar, pode seguir na sessão atual; a conclusão offline não é persistida e poderá ser oferecida novamente na próxima abertura. CRUDs e sincronização financeira, login social e recuperação de senha continuam fora do escopo.

Principais arquivos adicionais: `src/domain/personalization.ts`, `src/components/personalization-fields.tsx`, `src/app/personalizacao.tsx`, `backend/app/Libraries/ProfilePersonalization.php` e testes correspondentes. Detalhes do contrato estão em `backend/docs/auth.md`.

Validação dessa atualização: 67 testes de domínio, 66 E2E em duas resoluções e 52 testes/464 asserções de backend passaram; TypeScript, ESLint, exportação web e bundles Android/iOS passaram. Os testes E2E usam API isolada real e cobrem cadastro, clique duplo, opcionais, persistência, edição/remoção posterior, erros e onboarding. Não houve teste físico/nativo ou Windows. Registros completos em `frontend/VALIDATION.md` e `backend/VALIDATION.md`.


### Nascimento em três seletores — 13/11/2026

A interface de nascimento usa agora `BirthDatePicker` com Dia/Mês/Ano lado a lado (DD/MM/AAAA), em cadastro complementar e Editar Perfil. Usa componentes existentes, com listas suspensas ancoradas e busca, sem novas dependências. `src/domain/birth-date.ts` controla anos bissextos, dias por mês e datas futuras. Ao trocar mês/ano, limpa o dia inválido; preenchimento parcial impede salvar até completar ou limpar. A data completa segue no mesmo formato YYYY-MM-DD e vazio continua null na API. O calendário de transações não foi alterado nesta tarefa.

Validação desta alteração: 71 testes de domínio, 10 E2E de personalização em duas resoluções, TypeScript, ESLint e exportações web/Android/iOS passaram. Tela de 320 px inspecionada visualmente. Não foram repetidos os testes financeiros E2E completos ou o backend nesta mudança de seletor. Sem testes em aparelho físico ou emulador nativo.


### Ajuste visual pela imagem de referência — 13/11/2026

O usuário rejeitou os modais/grades de nascimento e forneceu uma referência precisa. O componente agora tem título “Data de nascimento”, texto auxiliar opcional, três campos de larguras iguais, cantos discretos e paleta neutra escura. Cada campo abre um dropdown flutuante ancorado nele, com busca numérica, opções em lista vertical, rolagem e check no valor escolhido. Fecha por seleção, clique fora, Escape ou voltar do Android. A interface de nascimento não usa mais o Sheet centralizado ou grades. No mobile, a lista tem largura mínima para permitir busca e áreas de toque maiores; reposiciona acima quando faltar espaço abaixo.

A lógica de nascimento em `src/domain/birth-date.ts`, o formato YYYY-MM-DD, os opcionais, o backend e os outros campos permanecem iguais. A skill image-to-code foi aplicada à análise da imagem fornecida e à conferência visual das capturas. Não foi criada uma nova direção visual para substituir a referência.

### Etapa 1 — cores do nascimento alinhadas ao tema — 13/11/2026

O pedido seguinte substituiu a paleta cinza específica da referência pela identidade atual do app. O nascimento mantém exatamente o layout/dropdown/busca, mas usa somente `colors.surface`, `background`, `border`, `text`, `muted` e `primary`. Foco e seleção são verde-esmeralda; erro reutiliza `ui.error.color`, e desabilitado usa a opacidade existente. Alterações de código restritas a `birth-date-picker.tsx` e ao repasse visual de erro em `personalization-fields.tsx`. Nenhuma mudança funcional, de avatar, Ajustes, backend ou banco principal. TypeScript, ESLint, 12 E2E de personalização e exportações web/Android/iOS passaram; aparência web conferida em 320 px e contraste medido. Sem teste em dispositivo físico/emulador nativo.

### Opcionais no perfil — 13/11/2026

“Não informar nascimento” deve ficar sempre visível, com ou sem data preenchida, tanto na personalização quanto no Editar Perfil. O botão “Prefiro informar depois” da renda foi removido. A renda continua opcional e pode ser apagada diretamente no campo. PersonalizationFields usa atualização funcional do rascunho para não restaurar valores antigos quando nascimento, renda e objetivo são alterados rapidamente. A remoção manual dos placeholders DD/AAAA foi preservada; a constante sem uso foi limpa. Backend e regras financeiras não mudaram.

### Remoção do botão de nascimento — 13/11/2026

Por solicitação posterior, o botão externo “Não informar nascimento” foi removido do cadastro complementar e Editar perfil. A data continua opcional. Para preservar a remoção de uma data já preenchida, a lista do seletor oferece “Limpar data” quando houver algum valor; essa ação limpa os três campos. O botão de renda permanece removido. TypeScript, ESLint e os 12 E2E de personalização passaram; não houve mudança no backend.

### Etapa 3 — Reorganização dos Ajustes — 13/11/2026

A tela de Ajustes (`configuracoes.tsx`) foi totalmente redesenhada em cards organizados por seção, mantendo o dark mode e a identidade verde-esmeralda:
1. **Cabeçalho do Perfil:** `ProfileAvatar` em destaque com nome, e-mail e botão/ação "Editar Perfil" preservado (mantendo compatibilidade com `avatar.spec.ts` e `profile-photo.spec.ts`).
2. **Seção Minha Conta:**
   - **Dados pessoais:** Sheet focado em nome, e-mail (informativo), data de nascimento (`BirthDatePicker` DD/MM/AAAA) e objetivo financeiro (`financialObjectives`).
   - **Foto de perfil:** Sheet dedicado com `useProfileImageEditor`, permitindo escolher entre os 12 avatares DiceBear ou foto da galeria, com prévia, recorte e sincronização entre telas.
   - **Alterar senha:** nova tela protegida `/alterar-senha` com senha atual, nova senha, confirmação, controles de visibilidade internos, indicador de força (`passwordStrength`), validações e aviso claro de pendência na API sem sucesso fictício ou persistência em AsyncStorage.
3. **Seção Minhas Finanças:**
   - **Minha renda:** Sheet para consultar/editar renda mensal planejada e escolher opcionalmente o dia de recebimento (1 a 31), com texto explicativo de que a renda é para planejamento e não gera receitas nem altera saldos.
   - **Categorias:** navegação direta para `/categorias`.
   - **Limites de gastos:** nova tela protegida `/limites` com indicação de funcionalidade em desenvolvimento e atalho para gerenciar categorias, sem dados fictícios.
4. **Seção Preferências:**
   - Central de Notificações (`/notificacoes`), Segurança e Privacidade (`/privacidade`), switches com acessibilidade para "Ocultar valores", "Notificações simuladas" e "Animações suaves", e "Ver tutorial novamente" (`/onboarding?replay=1`).
5. **Sair da Conta:**
   - Botão destacado com modal de confirmação antes de revogar a sessão e limpar credenciais locais do Shield, preservando as finanças locais.

Validação da Etapa 3: 80 testes unitários de domínio passaram; TypeScript e ESLint sem erros ou alertas; exportação web estática e bundles nativos Android e iOS (Hermes HBC) gerados com sucesso; testes E2E em `settings.spec.ts` e suíte existente de autenticação validados.

### Resolução Simultânea de Login Web e Mobile — 13/11/2026

Para viabilizar login simultâneo no Mobile (celular físico) e na Web (navegador no computador) sem conflito de cookies ou CORS:
1. `frontend/src/constants/api.ts`: resolução dinâmica de `apiUrl`. No mobile (Android/iOS), preserva o IP da máquina (`192.168.1.155:8080`) para conectar via rede local. Na Web, se acessado via `localhost` ou `127.0.0.1`, alinha o hostname para `localhost:8080`, permitindo que os cookies HttpOnly (`SameSite=Lax`) e tokens CSRF funcionem sem bloqueio de terceiros.
2. `backend/.env` e `backend/app/Config/AuthApi.php`: adição de `http://192.168.1.155:8081` em `AuthApi.webOrigins` para autorizar CORS caso a versão web também seja acessada diretamente pelo IP local.

### Card "Recebimento do Mês" na Home + Fontes de Renda Múltiplas — 13/11/2026

#### Card "Recebimento do Mês"

Implementado em `src/components/monthly-receipt-card.tsx`, inserido na Home imediatamente abaixo de `<FinancialSummary />`. Exibição condicional: visível apenas quando há renda planejada > 0.

Conteúdo do card:
- Título "RECEBIMENTO DO MÊS" e mês de referência por extenso (ex.: "Novembro de 2026").
- Renda prevista (das fontes locais ou fallback para `monthly_income_cents` da API) e valor recebido (soma das transações de receita do mês de referência).
- Barra de progresso animada (`ProgressBar`) limitada a 100% visualmente; percentual real exibido em texto.
- Mensagem contextual (60%, superou, atingiu 100%, 0%).
- Diferença: falta receber ou excedente.
- Respeita `preferences.hideAmounts`.
- Botão "Configurar renda" navega para Ajustes → Minha renda (via param `openIncome=1`).
- Atualização automática ao adicionar/editar/excluir receitas ou mudar de mês.

Lógica de domínio isolada em `src/domain/monthly-receipt.ts`: `calculateMonthlyReceipt`, `monthlyIncomeReceived`, `formatMonthYear`.

Configurações abertas com `router.push('/(tabs)/configuracoes', { params: { openIncome: '1' } })`: parâmetro detectado no mount da tela `configuracoes.tsx` via `useLocalSearchParams` e abre o `IncomeEditor` automaticamente.

#### Fontes de Renda Múltiplas

Usuário pode definir **N fontes de renda** (ex.: Salário dia 30 + Salário dia 15, ou Salário + Freelance), cada uma com:
- `label` (descrição obrigatória)
- `amountCents` (valor obrigatório > 0)
- `dayOfMonth` (1–31, opcional)

Armazenamento: `FinanceData.preferences.incomeSources?: IncomeSource[]` — local, retrocompatível.
Total das fontes sincronizado com `monthly_income_cents` na API ao salvar.
Fallback retrocompatível: se `incomeSources` estiver vazio/ausente, usa o campo único da API.

Validação robusta em `validateFinanceData`: IDs únicos, `amountCents > 0`, `dayOfMonth` em 1–31 ou null/undefined.

Funções utilitárias adicionadas em `src/domain/finance.ts`:
- `totalIncomeSources(sources)` → total em centavos
- `newIncomeSourceId()` → ID único `src-<timestamp>-<random>`

UI em `IncomeEditor` (dentro de `configuracoes.tsx`): lista de fontes existentes com edição/remoção individual, formulário inline (Descrição + Valor + Dia) com Confirmar/Cancelar, botão "Adicionar fonte de renda" e total acumulado ao final.

Validação desta atualização: TypeScript e ESLint passaram; **104 testes unitários** (8 novos de monthly-receipt + 13 novos de income-sources) aprovados. Sem alteração de backend, migrations ou regras de saldo.

A renda mensal informada pelo usuário foi estritamente delimitada como valor de planejamento, completamente separada das transações financeiras do Extrato:
1. **Renda planejada (`monthlyIncomeCents` / `user.personalization.monthly_income_cents` e `incomeDay` em `preferences`):**
   - Configurada em Ajustes → Minha renda (ou no cadastro complementar/Editar Perfil).
   - Campos de renda e dia de recebimento (1 a 31) opcionais com máscara de moeda brasileira.
   - Mensagem explicativa explícita na interface: *"A renda informada será usada para planejamento e não altera seu saldo. Para registrar dinheiro recebido, utilize o Extrato."*
   - Não cria transações automáticas nem altera saldo, receitas ou despesas.
2. **Receitas registradas (`transactions`):**
   - Utilizadas com exclusividade pelo Extrato, Saldo total (`summary.balanceCents`), Receitas do mês (`summary.incomeCents`), Despesas do mês (`summary.expenseCents`) e relatórios/gráficos (`financialReport`).
   - Saldo e totais só são atualizados quando transações forem efetivamente cadastradas, editadas ou excluídas pelo usuário no Extrato/Transação.
3. **Backend:**
   - Reutiliza o campo existente `monthly_income_cents` (BIGINT) em `user_preferences`.
   - Nenhuma migration, tabela ou rota do backend foi alterada.
4. **Validação:**
   - Teste unitário dedicado `tests/planned-income.test.mjs` com 3 cenários verificando isolamento do saldo, recálculo em CRUD de receitas e prevenção de duplicidade. Total de **83 testes unitários** aprovados; TypeScript e ESLint sem erros.

### Etapa 2 — Avatar e foto local — 13/11/2026

Personalização pós-cadastro e Editar Perfil usam agora `ProfileImageControl`/`ProfileImagePanel` e `useProfileImageEditor`: somente imagem circular selecionada e câmera; um único modal alterna opções, catálogo dos 12 DiceBear existentes, prévia e confirmação de remoção. Prévia altera apenas rascunho; Continuar/Salvar perfil persiste. Fechar descarta rascunhos. Não houve reorganização de Ajustes ou mudança de autenticação/backend/finanças.

`profile.photoRef?: string | null` é local; `avatar` continua sendo o último DiceBear e fallback para perfis antigos/arquivos ausentes ou corrompidos. Omitir photoRef preserva o campo; null remove. Home, Ajustes e personalização usam o mesmo estado. Native usa `Paths.document` por API/conta; Web guarda Blob no IndexedDB (sem Base64 no AsyncStorage). Fotos não entram no payload da API nem sincronizam entre aparelhos. Entrada até 10 MiB, JPEG/PNG/WebP e HEIC/HEIF nativo decodificável; saída JPEG 512 × 512/85% até 2 MiB, recorte central quando necessário. Arquivos rascunho são gerenciados por edição; arquivos anteriores só são removidos após sucesso e ausência de referências persistidas. O serviço `saveProfilePhoto` grava local antes da API e, em falha remota, reverte somente perfil, preservando dados financeiros/arquivos anteriores.

Novos módulos: `src/domain/profile-photo.ts`, `src/data/photo-storage{,.web}.ts`, `src/data/photo-cleanup.ts`, `src/services/save-profile-photo.ts`, `src/state/profile-photo-context.tsx`, `src/state/use-profile-image-editor.ts` e `src/components/profile-image-editor.tsx`. Dependências Expo adicionadas: image-picker ~58.0.10, file-system ~58.0.13 e image-manipulator ~58.0.16; plugin sem câmera/microfone.

Validação: TypeScript/ESLint passaram; 79 testes de domínio passaram; 86 cenários de interface foram validados (última suíte completa 85/86, seguida de 14/14 testes específicos após corrigir fixture ambígua de armazenamento). Web com upload real, IndexedDB, persistência após recarga, cancelamento/remoção/falhas/isolamento e payloads sem imagens; aparência conferida em telas estreitas. Bundles Hermes Android/iOS gerados. Sem execução física/emulador ou build APK/IPA; permissões/HEIC/recuperação Android ainda dependem de teste nativo. Doctor 19/20: instalado Expo58.0.24, patch recomendado ~58.0.25 mantido como pendência. Lista completa de arquivos e resultados em frontend/VALIDATION.md.

### Etapa 22 — Contas a pagar e a receber — 13/11/2026

Implementação somente frontend. Nova rota protegida `/contas`, acessível pela seção Próximos compromissos da Home. Suporta contas a pagar/receber, CRUD, notas, categoria/centavos, vencimento com calendário, pesquisa, status derivado (atraso pela data local), filtros por MM/AAAA ou todos os períodos e histórico. Pendências/resumos usam vencimento; histórico confirmado usa data efetiva. Atrasado é parte do pendente, sem duplicar totais.

`FinanceData` v2 tem campos opcionais `commitments`/`commitmentRecurrences`, compatíveis com dados antigos. O repositório existente continua isolando por API/conta; nenhuma limpeza/migração destrutiva ou mock novo. `src/domain/commitments.ts` contém modelos/cálculos/validações; `src/data/commitment-operations.ts` reúne comandos; todos passam pela gravação sequencial e persist-first do FinanceStore. Confirmação grava conta + transação em um snapshot, com IDs vinculados (`transactionId`/`commitmentId`), impedindo duplicação. Previsões nunca criam lançamentos efetivos por conta própria. Saldo atual/receitas/despesas continuam calculados pelas transações existentes.

Contas confirmadas exigem fluxos explícitos: editar só previsão, corrigir efetivo no mesmo lançamento, desfazer e excluir transação vinculada, ou excluir compromisso escolhendo manter/excluir o lançamento. Editar transação vinculada no Extrato sincroniza valor/data efetivos; sua exclusão direta e troca de tipo são bloqueadas. Categorias em uso por contas/regras são protegidas. Falhas de persistência não publicam sucesso parcial; falhar a ampliação de recorrências na abertura mantém o snapshot anterior acessível e permite nova tentativa.

Projeção da Home: saldo atual + recebimentos pendentes − pagamentos pendentes com vencimento de hoje até os próximos 30 dias. Horizonte é exibido; exclui atrasos anteriores e renda planejada. Valores respeitam ocultação. Recorrências mensais criam apenas previsões até 12 meses à frente, ampliadas ao abrir/retomar e mudar a data. Cursor persistido/IDs por mês evitam recriar ocorrências excluídas. Ajustam dias 29/30/31 ao último dia sem perder âncora. Editar regra altera apenas futuras pendentes; encerrar preserva ocorrências já criadas. A validação civil foi extraída, sem mudar regras, para `civil-date.ts`, removendo ciclo entre os domínios.

Componentes novos: `commitment-form.tsx`, `commitment-row.tsx`, `upcoming-commitments.tsx`. Alterações de integração: Home, `_layout.tsx`, `transacao.tsx`, `finance.ts`, FinanceStore/Context. Nenhuma dependência ou alteração de backend/banco/migration. Ajustes não foi reorganizado; apenas testes antigos tiveram seletores adaptados aos nomes atuais e ao cadastro de fontes de renda existente.

Validação: baseline 104 testes de domínio; final TypeScript/ESLint sem avisos e **127/127** testes de domínio. **10/10** E2E novos em 390 × 844 e 320 × 740. Última suíte completa **104/106**; após corrigir seletor antigo de Categorias, reexecução atualizada de Contas + Ajustes **12/12**. Os **106 cenários distintos** foram validados combinando essas execuções, sem afirmar uma única execução 106/106. Exportações Web e bundles Hermes Android/iOS passaram; aparência de Contas em 320 px conferida. Não houve execução em dispositivo/emulador nativo, build APK/IPA ou Windows. Persistência verificada por recarga Web e novas instâncias do repositório. Detalhes e lista de arquivos em `frontend/VALIDATION.md`.

Pendência futura: endpoints e tabelas de contas/regras, confirmação/correção atômicas e idempotentes no servidor, escopo por usuário, paginação e sincronização consentida. Não iniciar backend financeiro, cartões ou financiamentos sem solicitação.

### Categorias no banco por usuário — 13/11/2026

O usuário autorizou integrar categorias ao MariaDB. Agora GET/POST `/api/categories` e PATCH/DELETE `/api/categories/{id}` usam Shield e escopo do `CategoryModel`/`UserOwnedModel`. O dono vem do usuário autenticado; payload não aceita user_id. Header `X-Account-ID` confirma o dono esperado e impede escrita de aba antiga após trocar cookies de conta. Mobile usa o Bearer existente; Web reutiliza cookies HttpOnly/CSRF, com CORS DELETE e novo header nas mesmas origens.

Migration aditiva `2026-11-13-000005_AddCategorySynchronization` aplicada ao banco principal: acrescenta `client_key` (unicidade por usuário) e `deleted_at`. Nenhuma migration anterior foi alterada/reaplicada; somente batch 5 novo. Nenhum volume/registro existente removido. Exclusão é lógica, preservando vínculos em outros aparelhos; categorias já usadas por transações/limites no banco não podem ser excluídas. Tipo de categoria salva no banco é fixo; criar outra para usar outro tipo.

Frontend usa o mesmo estado financeiro/repositório para cache por API/conta, com `Category.remoteId?`/`archived?`, retrocompatíveis com v2. Categoria nova/renomeação/exclusão aguarda API + cache; sem rede não anuncia gravação no banco. Consulta ao abrir/retomar/a cada 60 s e botão manual. Consulta lenta não bloqueia finanças; resposta anterior a uma edição não a sobrescreve. Categorias excluídas/ausentes são preservadas como indisponíveis para manter o histórico.

Em Ajustes → Categorias, **Enviar categorias locais ao banco** envia explicitamente só nomes/tipos das categorias da conta atual, com chaves idempotentes, preservando IDs e registros financeiros. Pode repetir após interrupção sem duplicar. Não importa chave legada sem dono e não envia transações/contas/metas/fotos. Categorias passam a aparecer na mesma conta em outro aparelho; os demais dados continuam locais.

Arquivos principais: backend `CategoriesController.php`, `CategoryModel.php`, Routes/Cors e migration 000005; frontend `domain/categories.ts`, `data/auth-api.ts`, AuthStore/FinanceStore/Context e tela categorias; seletores de transações/compromissos respeitam categorias arquivadas. Sem novas dependências. Documentação e lista de arquivos em `backend/docs/categories.md` e `frontend/VALIDATION.md`.

Validação final: **57 testes/503 asserções PHP**, **143 testes de domínio**, TypeScript/ESLint sem avisos e **114/114 E2E** na execução completa final. Cobertos CRUD real, unicidade/isolamento, importação, falha de rede/cache, contas trocadas, outro contexto de navegador sem cache, categorias excluídas e regressões anteriores. Bundles Web/Android/iOS gerados. Sem teste em aparelho/emulador/Windows ou APK/IPA; outro aparelho foi simulado por contexto de navegador independente. Não avançar para sincronização dos demais registros sem solicitação.
