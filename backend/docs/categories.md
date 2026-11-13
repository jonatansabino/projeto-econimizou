# Categorias por usuário

Categorias são persistidas em `categories` no MariaDB. O dono vem exclusivamente do Shield; não envie `user_id` no JSON. A tabela e seus índices por usuário já existiam. A migration complementar `2026-11-13-000005_AddCategorySynchronization` acrescenta `client_key`, sua unicidade por usuário, e `deleted_at`, sem recriar tabelas ou alterar migrations aplicadas.

## Endpoints autenticados

| Método | Rota | Comportamento |
| --- | --- | --- |
| GET | `/api/categories` | Lista completa do usuário, incluindo categorias arquivadas para sincronizar históricos locais |
| POST | `/api/categories` | Cria/obtém categoria com `name`, `type` e `client_key` |
| PATCH | `/api/categories/{id}` | Atualiza nome; requer `name` e `type`, mantendo o tipo original |
| DELETE | `/api/categories/{id}` | Exclusão lógica idempotente; preserva a linha e os vínculos históricos |

Resposta individual: `{ "category": { "id": "1", "name": "Educação", "type": "expense", "client_key": "category-local", "archived": false } }`. GET responde `{ "categories": [...] }`. IDs são strings. Tipos: `income` e `expense`. Nome obrigatório, normalizado em espaços, até 100 caracteres. Chave do cliente obrigatória no POST, até 128 caracteres alfanuméricos, hífen, dois-pontos ou sublinhado. Campos extras no POST/PATCH são rejeitados.

POST novo retorna 201; repetição da mesma chave/payload ou categoria de mesmo nome/tipo retorna 200 sem duplicar. Reutilizar uma chave com payload diferente retorna 409. Criar explicitamente uma categoria de mesmo nome/tipo de uma excluída, com uma nova chave, restaura a linha existente. O tipo de categoria já gravada é fixo para não quebrar transações ainda locais em outros aparelhos. Use outra categoria para mudar o tipo.

A API retorna 401 para sessão inválida, 404 para ID inexistente/de outro usuário, 422 para dados inválidos e 409 para conflitos. Categorias vinculadas a transações/limites já existentes no banco não podem ser excluídas. Exclusões permitidas são lógicas, preservando referências locais que o servidor ainda não conhece.

## Segurança

Reutiliza Bearer/SecureStore no mobile e cookie HttpOnly + CSRF na Web. CORS mantém origens explícitas e permite DELETE e `X-Account-ID`. O cliente envia esse header com o ID esperado da sessão; o servidor compara com o Shield e rejeita divergência com 409. O header nunca escolhe o dono. Isso impede que uma aba antiga envie categorias para outra conta depois de trocar cookies em outra aba. Respostas são privadas e sem cache HTTP.

## Frontend e compatibilidade

Novos cadastros/edições/exclusões aguardam a API e a gravação do cache local, sem anunciar sucesso offline. A lista é consultada ao abrir, retomar o app e periodicamente (60 s), além do botão de atualização. Uma consulta lenta não bloqueia gravações financeiras locais; respostas anteriores a uma edição são ignoradas.

Não há envio/importação de categorias antigas. A conta inicia sem categorias; cada cadastro novo é gravado diretamente na API. Receitas e despesas também usam o banco como base principal. Antes de qualquer mutação, o cliente consulta GET `/api/finance` e envia sua chave em `X-Finance-Reset`; requisições de gerações anteriores recebem 409. O estado local é somente cache para essas entidades.

O cache utiliza os novos campos opcionais `remoteId` e `archived`, mantendo o formato financeiro v2. Categorias excluídas/ausentes no banco ficam indisponíveis para novas escolhas, mas suas referências são conservadas no histórico local. Receitas e despesas são sincronizadas. Previsões, metas e fotografias permanecem locais.

## Ambiente

Na pasta `backend/`, aplique novas migrations com `docker compose exec -T app php spark migrate --all`. Não execute refresh/rollback no banco principal. O launcher da raiz já executa migrations ao iniciar o projeto. Para testes, use o banco isolado `db-test/economizou_test`; não execute PHPUnit e E2E simultaneamente.
