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
