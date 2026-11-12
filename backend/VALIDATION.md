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
- Migration `2026-11-11-000002_CreateFinancialTables`: oito tabelas financeiras, Models correspondentes e validações. Valores em BIGINT/centavos; FKs de dono e FKs compostas de categoria/tipo, meta e transação; índices, unicidade mensal/categorias e timestamps de auditoria.
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
