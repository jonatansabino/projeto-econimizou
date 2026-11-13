# Validação da base — 11/11/2026

Implementação originalmente criada em `economizou-api/`, agora localizada em `backend/` na raiz `/mnt/DEV/DEVTEAM/economizou`. Não houve integração com o app mobile, autenticação ou CRUD financeiro nesta etapa.

## Ambiente executado

- CodeIgniter 4.7.6 instalado pelo Composer, com `composer.lock` versionável.
- PHP 8.3.36 com Apache 2.4.68 no container `app`.
- MariaDB 11.4.12 no serviço `db`, com volume persistente.
- `docker compose config --quiet`: passou.
- Construção da imagem e início via Compose com espera de saúde: passaram.
- Containers `app` e `db` com estado `healthy`.
- `apache2ctl -t`: `Syntax OK`.
- `composer validate --strict` e `composer check-platform-reqs`: passaram.
- Verificação de sintaxe PHP nos arquivos de `app/` e `tests/`: passou.

## Aplicação e banco

- `GET http://localhost:8080/` e `GET /health`: HTTP 200, JSON com `status: ok`, `service: economizou-api` e `database: connected`.
- Banco parado temporariamente para teste: `/health` respondeu HTTP 503 com `database: unavailable`; após subir o banco, voltou a HTTP 200.
- `POST /health` e rota automática `/health/index`: rejeitados com HTTP 404.
- `/.env`, `/composer.json`, `/app/Config/Database.php` e `/vendor/autoload.php`: HTTP 404, sem exposição desses arquivos.
- `php spark migrate`: criou `bootstrap_checks` e registrou a migration inicial.
- `php spark migrate:rollback`: desfez a migration de teste.
- Nova aplicação e repetição de `migrate`: passaram sem duplicar a migration.
- `migrate:status` confirmou a migration aplicada após reiniciar o MariaDB, validando a persistência do volume.

## Testes automatizados

`docker compose exec -T app composer test`: **11 testes e 24 asserções passaram**, sem warnings. Inclui os exemplos do starter, quatro testes de rotas e dois testes da migration do projeto. PHPUnit usa SQLite em memória, isolado do banco de desenvolvimento; a conexão MySQLi/MariaDB foi verificada pelas chamadas HTTP e pelos comandos reais de migration.

A imagem Apache não precisa da extensão opcional `pcntl` para esta base. O comando de migration informa que o tratamento de sinais está desativado, mas conclui normalmente. Cobertura de código não foi solicitada nem executada (`--no-coverage`).

## Reorganização das pastas — 11/11/2026

O backend foi movido para `/mnt/DEV/DEVTEAM/economizou/backend`. O Compose foi reconstruído e o container da API recriado com bind mount desse novo diretório. O nome do projeto Compose foi mantido para reutilizar os volumes `economizou-api_mariadb_data`, `economizou-api_vendor_data` e `economizou-api_writable_data`.

Após a mudança: containers saudáveis, `/health` com HTTP 200 e banco conectado, Composer válido, 11 testes/24 asserções passando e `migrate:status` preservando a migration de 14:57:12. Não foi necessário reaplicar migrations ou recriar os dados.

## Etapa 2 — banco, Shield e Models — 11/11/2026

### Inspeção e preservação

Antes desta etapa o banco `economizou` continha apenas `bootstrap_checks` e `migrations`. O registro da migration original permaneceu no batch 1, com horário 14:57:12. Nenhuma tabela existente foi recriada, nenhum volume foi removido e nenhum usuário financeiro de demonstração foi criado na aplicação. Os tipos TypeScript de transações, categorias, metas, perfil/preferências, notificações, mensagens/propostas e recomendações foram consultados sem modificar o frontend.

### Aplicado

- `codeigniter4/shield` 1.4.1 e sua dependência `codeigniter4/settings` 2.4.0, com arquivos de configuração que estendem o pacote oficial e helpers carregados. As migrations do fornecedor não foram copiadas nem alteradas.
- Tabelas oficiais: `users`, `auth_identities`, `auth_logins`, `auth_token_logins`, `auth_remember_tokens`, `auth_groups_users`, `auth_permissions_users` e `settings`.
- Migration `2026-11-11-000002_CreateFinancialTables`: oito tabelas financeiras, Models correspondentes e validações. Valores em BIGINT/centavos; FKs de dono e FKs compostas de categoria/tipo, meta e Transação; índices, unicidade mensal/categorias e timestamps de auditoria.
- `UserOwnedModel` obtém o usuário autenticado do Shield, aplica escopo nas leituras, exige dono em alterações/exclusões e não aceita dono/auditoria do payload. Acesso ao Query Builder e operações não suportadas são bloqueados.
- `docker-compose.test.yml`: MariaDB 11.4 separado, em tmpfs, sem porta pública nem volumes de desenvolvimento. O bootstrap PHPUnit recusa conexões fora de `db-test/economizou_test` e verifica o banco efetivo antes das migrations.

### Comandos e resultados

```bash
docker compose exec -T app composer require codeigniter4/shield --no-interaction --prefer-dist --no-progress
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --wait db-test
docker compose exec -T app composer test
docker compose exec -T app php spark migrate --all
docker compose exec -T app php spark migrate:status
docker compose exec -T app php spark routes
docker compose exec -T app composer validate --strict
docker compose exec -T app composer check-platform-reqs
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build --wait app db
```

**39 testes e 367 asserções passaram**, usando MariaDB 11.4.12 real. Incluem isolamento de leitura/escrita dos oito Models com dois usuários do Shield, reutilização de Model após troca de sessão, bloqueio sem autenticação, nomes de categorias e limites mensais duplicados, preferências 1:1, FK para usuário inexistente, categoria de outro dono/tipo, limites em categorias de receita, links de chat/recomendação para outro usuário, valores inválidos e no limite exato de precisão, datas inválidas, JSON inconsistente, restrições de exclusão e auditoria (incluindo tentativas de trocar dono/data de criação no payload). Rollback completo e reaplicação foram exercitados exclusivamente no banco de teste, com verificação do nome físico do banco.

A sintaxe PHP, Composer e requisitos de extensões passaram. No banco da aplicação, as novas migrations foram aplicadas no batch 2 às 15:34:03. A migration antiga ficou intacta. `SHOW TABLES` confirmou as 18 tabelas esperadas (duas antigas e 16 novas); `users` permaneceu vazia. A listagem de rotas continuou apenas com `/` e `/health`, e `/health` respondeu HTTP 200 com MariaDB conectado. Não houve rollback no grupo `default`.

### Pendências intencionais

Cadastro/login, endpoints de tokens/CRUD, filtros das futuras rotas REST, DTOs de integração e sincronização do mobile pertencem às próximas etapas. O modelo de orçamento mensal ainda não existe na interface local do app. Não há políticas de leitura por linha no próprio MariaDB: o isolamento das consultas de usuários é aplicado pelos Models/Shield, enquanto SQL administrativo continua sendo uma capacidade confiável do servidor. Consulte [docs/database.md](docs/database.md) para os campos e limites de uso.

## Etapa 3 — autenticação real — 11/11/2026

Implementados cadastro, login, consulta da sessão, logout e atualização do próprio perfil com Shield. As credenciais são verificadas pelo autenticador oficial; os tokens usam escopo `api`, expiração absoluta de 24 horas e revogação somente da sessão atual. Cadastro valida confirmação de senha e e-mail único. Contas inativas/bloqueadas são recusadas. Respostas JSON não expõem identidades, hashes ou detalhes de exceções.

Android/iOS recebem Bearer para armazenamento no SecureStore. A web recebe somente cookie HttpOnly, com SameSite, proteção CSRF, origem explícita e Secure em HTTPS/produção. CORS não usa origem curinga. A API recusa HTTP em produção. A barra de debug foi desabilitada para evitar captura de credenciais; argumentos de exceções PHP foram desabilitados. Limites atômicos de login/cadastro usam a nova tabela `auth_rate_limits`.

Arquivos principais: `app/Controllers/Api/AuthController.php`, `app/Filters/ApiRequest.php`, `ApiToken.php`, `AuthRateLimit.php`, `app/Config/AuthApi.php`, `Auth.php`, `Routes.php`, `Filters.php`, `Cors.php`, `Exceptions.php`, `app/Libraries/ApiExceptionHandler.php`, migration `2026-11-11-000003_CreateAuthRateLimits.php`, `docker/php/development.ini`, `docker-compose.test.yml`, `tests/feature/AuthApiTest.php`, README e `docs/auth.md`.

Validações executadas:

- `docker compose exec -T app composer test`: **49 testes e 423 asserções passaram**, em MariaDB 11.4.12 isolado. Incluem credenciais válidas/inválidas, duplicidade, Bearer ausente/inválido/expirado/revogado/sem escopo, bloqueio de contas inativas, logout da sessão atual, rate limiting, cookies HttpOnly/CSRF/origens e edição do próprio perfil. A suíte anterior de integridade/isolamento financeiro continua passando.
- Sintaxe PHP de `app/` e `tests/`, `composer validate --strict` e `composer check-platform-reqs`: passaram.
- `php spark migrate --all` aplicou somente a nova migration; `migrate:status` confirmou os batches anteriores intactos (14:57:12 e 15:34:03), com a nova tabela no batch 3, às 15:57:59. Não houve rollback no banco da aplicação nem remoção de volumes.
- API principal e MariaDB saudáveis; `GET http://localhost:8080/health`: HTTP 200, `database: connected`.
- Integração Expo/web: **56 testes Playwright passaram** em 390 × 844 e 320 × 740, usando autenticação real em `app-test:8082` e banco `economizou_test`. Nenhuma conta de teste foi cadastrada na API principal pelo procedimento.

O serviço HTTP de testes usa variáveis de ambiente sem pontos, compatíveis com Apache (`CI_ENVIRONMENT`, `app_baseURL`, `authapi_testRateMultiplier`). O aumento do limite só funciona em `testing`; o PHPUnit verifica o limite normal. Não executar PHPUnit e E2E simultaneamente, pois compartilham o banco de teste descartável.

Recuperação de senha foi excluída por solicitação explícita do usuário, inclusive tela, link e envio de e-mail. CRUDs/sincronização financeira e implantação HTTPS continuam fora desta etapa. Consulte [docs/auth.md](docs/auth.md) para endpoints, configuração e comandos reproduzíveis.

## Entrypoint Windows/Linux — 12/11/2026

A cópia Linux inspecionada já tinha `docker/entrypoint.sh` em LF; o caminho de destino estava correto e a API estava saudável. Portanto, não foi possível confirmar o conteúdo do checkout Windows que apresentou o erro. Um script temporário CRLF reproduziu `not found` dentro da imagem Linux e passou a executar após a remoção de CR; isso confirma o mecanismo de falha do shebang `/bin/sh\r`.

O Dockerfile agora normaliza CRLF para LF com `sed`, aplica `0755`, verifica que `/bin/sh` é executável, valida a sintaxe e usa o caminho absoluto no `ENTRYPOINT`. O `.gitattributes` da raiz fixa LF para `.sh`, `start` e Dockerfiles. O entrypoint original, Compose, configuração CodeIgniter/MariaDB e migrations não precisaram de alterações. README atualizado com instruções de reconstrução.

Validações realizadas:

- `docker compose build --no-cache app`: passou.
- `docker compose up -d --wait`: passou; API e MariaDB saudáveis.
- Imagem reconstruída: arquivo instalado sem CR, com shebang `#!/bin/sh`, permissão `0755` e sintaxe válida. `/bin/sh` existe e aponta para `dash`.
- `docker compose ps` confirmou o novo entrypoint absoluto e a API em execução.
- `GET http://localhost:8080/health`: HTTP 200, `status: ok`, `database: connected`.
- Somente após a API saudável, `php spark migrate --all`: concluiu. Comparação do histórico antes/depois confirmou versões, horários e batches idênticos, sem recriação de migrations.
- Volume MariaDB permaneceu `economizou-api_mariadb_data`. Nenhum volume ou dado foi removido.
- `docker compose config --quiet`, `git check-attr` e `git diff --check`: passaram.

Testes executados neste host Linux com Docker; não houve execução em Windows/Docker Desktop. Não foi necessário instalar `dos2unix` ou alterar o frontend.

## Cadastro e personalização opcional — 13/11/2026

O endpoint de cadastro existente continua usando Shield, validação oficial de senha e token real. Nova migration `2026-11-13-000004_AddProfilePersonalization` adiciona nascimento (DATE), objetivo, renda mensal (BIGINT em centavos) e conclusão do fluxo em `user_preferences`. Perfis anteriores recebem conclusão padrão; novos cadastros começam pendentes. Nenhuma tabela `users` ou migration aplicada foi recriada.

O PATCH `/api/auth/profile` aceita atualizações parciais, valida os opcionais e usa o usuário do token/Model com escopo. Campos omitidos são preservados; null limpa opcionais; identificadores de terceiros e campos desconhecidos são rejeitados. GET `/api/auth/me`, cadastro e login incluem os metadados de personalização. Não há cálculo de idade, recomendação automática ou lançamento financeiro a partir da renda.

Arquivos: `app/Database/Migrations/2026-11-13-000004_AddProfilePersonalization.php`, `app/Libraries/ProfilePersonalization.php`, `app/Models/UserPreferenceModel.php`, `app/Controllers/Api/AuthController.php`, `tests/feature/AuthApiTest.php`, `tests/database/SchemaIntegrityTest.php` e `docs/auth.md`.

Validação:

- `docker compose exec -T app composer test`: **52 testes e 464 asserções passaram**, usando somente MariaDB isolado. A suíte inclui rollback/reaplicação no banco de teste.
- Novos casos: opcionais vazios/null, nascimento em ano bissexto, data inválida/futura/caractere nulo, objetivo desconhecido, renda negativa/fracionária/string/acima da precisão, metadados persistidos via PATCH/GET, edição/remoção, isolamento de dois usuários e rejeição de dono no payload. Testes anteriores de cadastro inválido, duplicidade e autenticação continuam passando. Senha comum de oito caracteres foi rejeitada pelo Shield sem criar usuário.
- Sintaxe PHP de `app/` e `tests/`: passou.
- `php spark migrate --all`: somente a nova migration aplicada no batch 4, às 08:55:57. `migrate:status` confirmou os batches anteriores com seus horários originais.
- `SHOW COLUMNS` confirmou os novos campos e renda BIGINT. O volume de desenvolvimento foi preservado.
- `/health` principal retornou HTTP 200, com banco conectado, após a integração.

Não houve integração social, envio automático de finanças, alteração de migrations anteriores, remoção de dados ou rollback no banco da aplicação.

## Categorias por usuário — 13/11/2026

Implementados endpoints autenticados GET/POST `/api/categories` e PATCH/DELETE `/api/categories/{id}`, reutilizando Shield, CSRF/cookie Web e Bearer mobile. Model mantém escopo fechado por dono, buscas próprias com soft deletes e proteção de categorias em uso no banco. Header `X-Account-ID` apenas confirma a conta esperada; nunca define o dono. CORS permite DELETE e o novo header nas origens existentes.

Migration complementar `2026-11-13-000005_AddCategorySynchronization` adiciona `client_key` com unicidade por dono e `deleted_at` à tabela existente. Executada no banco principal via `php spark migrate --all`: somente nova migration aplicada, batch 5, preservando versões/batches/horários anteriores. Reexecução confirmou ausência de reaplicações. Não houve exclusão de dados ou volumes, refresh ou rollback no banco principal.

`docker compose exec -T app composer test`: **57 testes / 503 asserções**, todos passaram no MariaDB isolado, incluindo os 5 novos testes de categorias e as regressões de integridade/FKs/Models. Casos novos cobrem autenticação, campos inválidos/dono forjado, isolamento entre dois usuários para leitura/escrita/exclusão, nome igual permitido em usuários distintos, unicidade/idempotência, edição, tipo fixo, exclusão lógica repetível/restauração, header de conta divergente e preflight DELETE. PHP syntax check do controller passou.

Frontend: TypeScript/ESLint sem avisos, 143 testes de domínio e **114/114** E2E completos passaram. Fluxo real no navegador confirma CRUD no MariaDB, envio explícito de categorias locais, mesma conta em outro contexto sem cache, isolamento de outro usuário e falha de rede sem sucesso fictício. Bundles Web/Android/iOS gerados, sem execução nativa em dispositivo ou emulador. Não houve teste simultâneo de PHPUnit/E2E. Contrato em [docs/categories.md](docs/categories.md); lista de arquivos e detalhes em [../frontend/VALIDATION.md](../frontend/VALIDATION.md).

## Entradas/saídas no banco e reinício autorizado — 13/11/2026

Implementados snapshot financeiro autenticado e gravação atômica de transações por usuário, com chaves de cliente, revisão, geração e operação idempotente. CategoriesController exige geração atual para mutações e compartilha o bloqueio por usuário. Nova migration 000006 aditiva, sem alteração das anteriores. O comando administrativo finance:reset exige --all-users --confirm, apaga apenas registros financeiros e invalida caches, preservando users, auth_identities e user_preferences.

`composer test`: **62 testes / 563 asserções**, todos passaram no MariaDB isolado. Inclui API vazia de novas contas, CRUD/idempotência, lote inválido revertido integralmente, dono/categoria/revisão incorretos, limpeza global mantendo usuários/identidades/perfis e bloqueio de operações de gerações anteriores. A leitura de estado usa upsert com lock exclusivo antes do SELECT FOR UPDATE, validada também por dez consultas concorrentes no E2E.

Frontend: **151 testes de domínio** e **120/120 E2E** finais passaram, além de TypeScript/ESLint e bundles Web/Android/iOS. Testes usam API/banco isolados; não houve PHPUnit e E2E simultâneos. Sem execução em dispositivo/emulador nativo.

No banco principal, a migration 000006 foi aplicada e, após autorização explícita do usuário para todas as contas, executado `php spark finance:reset --all-users --confirm`. Consultas antes/depois confirmaram **2 usuários e 2 perfis preservados**, categorias/transações/metas zeradas. As demais tabelas financeiras operacionais também foram esvaziadas transacionalmente; já estavam vazias no momento da execução. Credenciais, perfis e volumes não foram removidos. `/health` confirmou conexão saudável. Nenhuma alteração ao CONTEXTO.md nesta solicitação.
