# Economizou — contexto para continuar o desenvolvimento

Atualizado em **12/11/2026**, a partir do código e do histórico desta colaboração.
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
- As finanças continuam locais. Não há autorização implícita para criar CRUDs financeiros, enviar dados antigos ou sincronizá-los automaticamente.
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

Valores financeiros usam BIGINT em centavos. Existem FKs, índices, auditoria, unicidade de categorias/limites mensais e Models com escopo por usuário autenticado. Não há senhas em tabelas próprias nem endpoints CRUD financeiros.

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

A última solicitação funcional concluída foi o inicializador Node.js multiplataforma. A solicitação atual é este arquivo de contexto. Não há nova funcionalidade autorizada pendente.

Possíveis trabalhos futuros, somente quando solicitados: CRUDs/sincronização financeira, migração consentida do armazenamento antigo, recuperação de senha, implantação e validação direta no Windows/dispositivos. Antes de qualquer trabalho, conferir o Git, as instruções e a nova solicitação do usuário; não tratar esta lista como autorização para implementar tudo.
