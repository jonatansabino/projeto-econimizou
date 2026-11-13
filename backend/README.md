# Economizou API — base do backend

PHP 8.3 + Apache, CodeIgniter 4.7, Shield 1.4 e MariaDB 11.4. Inclui ambiente, esquema financeiro e autenticação REST real integrada ao Expo. Ainda não há endpoints CRUD ou sincronização financeira. Recuperação de senha foi deixada fora desta etapa a pedido do usuário. Todos os arquivos deste backend ficam nesta subpasta.

## Subir o ambiente

Requisitos: Docker com Docker Compose; portas 8080 e 3307 disponíveis. Não é necessário instalar PHP, Composer ou MariaDB na máquina.

```bash
cd /mnt/DEV/DEVTEAM/economizou/backend
# Apenas se o .env ainda não existir:
cp .env.example .env
docker compose up -d --build --wait --wait-timeout 120
docker compose ps
```

O `.env` local já foi criado. Ele é ignorado pelo Git; `.env.example` contém a mesma configuração de desenvolvimento para novas instalações. As credenciais locais são `economizou`/`economizou`, banco `economizou` e senha root `root`.

O serviço `app` só inicia depois de o health check do MariaDB passar. O Composer é incluído na imagem e instala as dependências do `composer.lock`. O código é montado do diretório atual, e os volumes `vendor_data` e `writable_data` guardam dependências e arquivos graváveis sem exigir permissões de escrita no restante do código. O volume `mariadb_data` preserva o banco entre reinícios. As migrations são executadas explicitamente, não durante o início do container.

### Entrypoint no Windows e Linux

O entrypoint fica em `/usr/local/bin/economizou-entrypoint`, fora do bind mount do código. O Dockerfile converte CRLF em LF, aplica permissão `0755`, verifica `/bin/sh` e valida a sintaxe antes de definir o caminho absoluto no `ENTRYPOINT`. O `.gitattributes` da raiz mantém scripts `.sh` e `start` em LF nos checkouts Windows/Linux.

Se uma imagem antiga apresentar `exec ...: no such file or directory`, reconstrua e valide sem apagar volumes:

```bash
docker compose build --no-cache app
docker compose up -d --wait
docker compose ps
curl http://localhost:8080/health
# Somente após a API estar saudável:
docker compose exec app php spark migrate --all
docker compose exec app php spark migrate:status
```

Um shebang com CRLF pode fazer o Linux procurar `/bin/sh\r` e informar que o arquivo não existe, mesmo quando o script está presente. Não é necessário instalar `dos2unix` na máquina nem mudar o banco ou os volumes.

## Acessar a API

- Base: <http://localhost:8080/>
- Saúde: <http://localhost:8080/health>

```bash
curl -i http://localhost:8080/health
```

Resposta HTTP 200 quando a API e a conexão SQL estão funcionando:

```json
{"status":"ok","service":"economizou-api","database":"connected"}
```

Se o banco estiver indisponível, `/health` responde HTTP 503 com `status: error` e `database: unavailable`. A rota `/` retorna o mesmo JSON. O endpoint não depende de migrations já aplicadas. O Apache serve somente `public/`, com reescrita de URLs e sem acesso HTTP ao `.env`, `app/` ou `vendor/`. O roteamento automático está desativado.

## Rodar migrations

```bash
docker compose exec app php spark migrate --all
docker compose exec app php spark migrate:status
```

A migration inicial `bootstrap_checks` foi preservada. `--all` inclui as migrations oficiais do Shield e Settings e a nova migration financeira. São criadas `categories`, `transactions`, `goals`, `category_budgets`, `notifications`, `user_preferences`, `chat_messages` e `saving_recommendations`. Nenhum usuário ou registro financeiro de demonstração é inserido no banco da aplicação.

Rollback é verificado somente pela suíte no banco isolado `economizou_test`. Não execute rollback/refresh no grupo `default` nem remova volumes para validar esta etapa. Consulte [estrutura e relacionamentos](docs/database.md).

## Conexão com o banco

Dentro do Docker: host `db`, porta `3306`. Em um cliente SQL na máquina: host `127.0.0.1`, porta `3307`. Usuário e banco: `economizou`; senha: `economizou`.

```bash
docker compose exec db mariadb -u economizou -p economizou
```

Informe a senha quando solicitada. A configuração é de desenvolvimento local, conforme o `.env.example`.

## Testes e comandos úteis

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --wait db-test
docker compose exec app composer test
docker compose exec app composer validate --strict
docker compose exec app php spark routes
docker compose exec app apache2ctl -t
docker compose logs -f app db
docker compose stop
docker compose up -d --wait
docker compose down
```

Os testes PHPUnit usam outro container MariaDB 11.4 (`db-test`), com banco/usuário `economizou_test`, armazenamento temporário em `tmpfs` e sem porta pública. O bootstrap recusa outros hosts, nomes e grupos de banco; o usuário de teste não tem acesso ao banco da aplicação. A suíte cobre as rotas de saúde, migrations/rollback, validações, restrições SQL e isolamento entre dois usuários reais do Shield. Os resultados gerados ficam em `build/`, ignorado pelo Git.

Para parar somente o banco de teste: `docker compose -f docker-compose.yml -f docker-compose.test.yml stop db-test`. Ele não usa os volumes do banco da aplicação.

`docker compose down` mantém os volumes. Não use `down -v` se quiser preservar os dados. Para atualizar dependências no futuro, execute o Composer dentro do container e mantenha o `composer.lock` versionado.

## Organização para as próximas etapas

- `app/Controllers/`: endpoints; `Health.php` é o primeiro controller da API.
- `app/Config/Routes.php`: rotas explícitas; autenticação e grupos de CRUD podem ser adicionados depois.
- `app/Models/`: oito Models financeiros, derivados de `UserOwnedModel`, que obtêm o dono do contexto do Shield. Não aceitam `user_id` do payload e bloqueiam Query Builder direto e escritas em registros alheios.
- `app/Config/Auth*.php`: configurações que estendem o Shield, cadastro REST habilitado e validade dos tokens.
- `app/Database/Migrations/`: alterações versionadas do esquema.
- `docker/`: configuração Apache, PHP e entrypoint.
- `tests/`: testes automatizados.

Referências: [instalação CodeIgniter](https://codeigniter4.github.io/userguide/installation/installing_composer.html), [migrations](https://codeigniter4.github.io/userguide/dbmgmt/migration.html), [ordem de início no Compose](https://docs.docker.com/compose/how-tos/startup-order/).

Consulte [autenticação REST, sessão mobile/web e configuração](docs/auth.md).

## Categorias por usuário

A API oferece GET/POST `/api/categories` e PATCH/DELETE `/api/categories/{id}`, protegidos pelo Shield. A migration complementar `2026-11-13-000005_AddCategorySynchronization` adiciona chave idempotente do cliente e exclusão lógica à tabela existente, sem recriar registros. Execute as migrations normalmente pelo launcher ou `docker compose exec -T app php spark migrate --all`.

Contrato, isolamento entre contas, CSRF, comportamento de importação e cache: [docs/categories.md](docs/categories.md). Receitas e despesas utilizam a API financeira descrita abaixo. Metas e previsões permanecem locais.


## Entradas e saídas — base principal no MariaDB

GET `/api/finance` retorna os registros do usuário, categorias, `resetKey` e `revision`. POST `/api/finance/transactions` aceita `reset_key`, `revision`, `operation_id` e uma lista `changes` de até 100 alterações. Cada alteração é `put` com `client_key`, `category_id`, `type`, `description`, `amount_cents`, `transaction_date`, ou `delete` com `client_key`. O usuário vem exclusivamente do Shield. Tipos são income/expense; valores são centavos inteiros positivos. Cada lote é transacional, com revisão e identificador de operação; chaves de cliente são únicas por usuário.

O cliente consulta o snapshot antes de gravar. Mutações de categorias também exigem `X-Finance-Reset` igual à chave atual, além da sessão e do CSRF Web. Chaves de bases anteriores são recusadas para evitar restaurar caches apagados. Os comandos de receitas/despesas, Chat e confirmações de contas usam essa gravação. Não há importação de registros antigos.

A migration aditiva `2026-11-13-000006_AddFinancialSynchronization` adiciona `transactions.client_key` e `financial_state`, sem modificar migrations anteriores.

Para uma limpeza administrativa de registros financeiros de todas as contas: `docker compose exec -T app php spark finance:reset --all-users --confirm`. Esse comando apaga os registros financeiros operacionais, gira as chaves de cache e preserva usuários, credenciais e perfis. Não é uma etapa automática de inicialização. Clientes conectados descartam seus caches financeiros antigos ao consultar a nova base.
