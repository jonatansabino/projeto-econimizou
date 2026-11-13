# Etapa 3 — cadastro, login e sessão

Backend: `/mnt/DEV/DEVTEAM/economizou/backend`. Frontend: `../frontend`.

O fluxo é **Criar conta → autenticação Shield → onboarding, quando necessário → área financeira**. Contas existentes entram com e-mail e senha. Recuperação de senha não faz parte desta etapa, por decisão explícita do usuário: não há endpoint, envio de e-mail, tela ou link fictício.

## Endpoints

| Método | Caminho | Função |
| --- | --- | --- |
| POST | `/api/auth/register` | Nome, e-mail, senha e `password_confirmation`; retorna 201 e inicia sessão. |
| POST | `/api/auth/login` | E-mail e senha; retorna 200 e inicia sessão. |
| GET | `/api/auth/me` | Token válido obrigatório; retorna `user` e `expires_at`. |
| POST | `/api/auth/logout` | Revoga somente o token atual. |
| PATCH | `/api/auth/profile` | Atualiza nome e avatar do usuário autenticado. Não recebe IDs de outros usuários. |
| GET | `/api/auth/csrf` | Prepara a proteção CSRF do cliente web. |

O objeto `user` contém `id` (string), `name`, `email`, `avatar` e `personalization` (nascimento, objetivo, renda em centavos e conclusão do fluxo opcional). Senhas e identidades internas não são retornadas. O login é verificado pelo autenticador de sessão do Shield via `check()`, sem criar uma sessão PHP de login. As credenciais e hashes são manipulados pelo `UserModel` e pelas identidades oficiais. O filtro Bearer usa o autenticador de Access Tokens do Shield, incluindo validade, revogação, escopo `api`, bloqueios e contas desativadas. As rotas HTML do Shield não foram habilitadas.

Validações retornam 422, e-mail duplicado 409, credenciais/sessões inválidas 401 e limite de tentativas 429 com `Retry-After`. Login incorreto não informa se o e-mail existe. O limitador usa contadores atômicos no MariaDB: cinco tentativas por e-mail e trinta por IP a cada quinze minutos; cadastro tem dez tentativas por IP no mesmo período. A tabela operacional `auth_rate_limits` foi adicionada em uma nova migration, sem alterar migrations aplicadas.

Tokens têm validade absoluta de 24 horas por padrão, configurável por `authapi.tokenLifetime`. Não existe refresh token nesta etapa: após expirar, é necessário entrar novamente. Logout não revoga tokens de outros aparelhos. Não há endpoints CRUD financeiros.

## Android e iOS

Cadastro/login retornam também `access_token`, `token_type: Bearer` e `expires_at`. O frontend só libera a sessão depois de persistir o token no `expo-secure-store`. Cada API tem um namespace distinto no SecureStore. Senhas não são persistidas; o token não passa pelo AsyncStorage.

O serviço HTTP centralizado envia `Authorization: Bearer ...`, aplica timeout e converte erros de rede/JSON em mensagens de erro. Ao abrir o app, o token é lido e validado por `/me` antes de renderizar as telas financeiras. Uma verificação periódica e ao retornar ao primeiro plano detecta revogação/expiração. Falha inicial de rede mostra uma tela de reconexão, sem abrir dados financeiros. Uma sessão já validada pode continuar usando os dados locais durante uma falha temporária, respeitando a expiração conhecida. O logout exige resposta do servidor; se a rede falhar, informa o erro e permite tentar novamente.

O plugin SecureStore foi configurado no Expo. A verificação em aparelho físico não está incluída nos testes desta etapa.

## Web

O frontend envia `X-Auth-Client: web` e `credentials: include`. Nesse modo, a API **não retorna o Bearer no JSON**. Ele é entregue somente em cookie `economizou_session`, HttpOnly, host-only, SameSite=Lax e Secure em HTTPS/produção. O app não usa localStorage, sessionStorage ou IndexedDB para credenciais. Após login/cadastro, confirma a sessão por `/me`, detectando bloqueio de cookies antes de abrir a área financeira.

`GET /csrf` retorna um nonce, também associado a cookie HttpOnly. Escritas web exigem `X-CSRF-Token` correspondente e `Origin` permitido. CORS aceita apenas a lista explícita e habilita credenciais; não usa `*`. O nonce fica somente em memória e é obtido novamente quando necessário. Logout expira o cookie e revoga o token do Shield.

A barra de debug do CodeIgniter foi removida dos filtros para evitar persistir requisições de autenticação. Erros HTTP da API são sanitizados e as respostas não devem ser armazenadas em cache. Headers/cookies/tokens e senhas não são registrados pelo código da aplicação. O Apache mantém o log padrão de método/caminho/status, sem corpos de requisição ou headers de autorização.

## Configuração local

```bash
cd /mnt/DEV/DEVTEAM/economizou/backend
docker compose up -d --build --wait
docker compose exec app php spark migrate --all

cd ../frontend
# Somente se ainda não houver .env.local:
cp .env.example .env.local
npx expo start --clear
```

`frontend/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_ALLOW_LOCAL_HTTP=true
```

HTTP é permitido pelo cliente apenas com essa opção explícita e para endereços locais/privados. Para Android Emulator, use `http://10.0.2.2:8080`. Em aparelho físico, use o IP do computador na mesma rede. Na web, frontend e API devem usar o **mesmo hostname** (ambos `localhost` ou ambos `127.0.0.1`) para a política de cookies funcionar. Se mudar a porta/origem do Expo, atualize a lista permitida no backend.

Configuração opcional em `backend/.env`:

```dotenv
authapi.tokenLifetime = 86400
authapi.webOrigins = 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:8097,http://127.0.0.1:8097'
```

Em variáveis Docker/Apache, podem ser usados os nomes equivalentes `authapi_tokenLifetime` e `authapi_webOrigins` (sem pontos). Produção exige API e origens HTTPS, `CI_ENVIRONMENT=production` e `EXPO_PUBLIC_ALLOW_LOCAL_HTTP=false`. Configure os proxies confiáveis do CodeIgniter se o TLS terminar em um proxy. O modo de produção recusa chamadas de autenticação HTTP e não aceita origens HTTP.

## Finanças locais e perfis

O estado de autenticação é separado do estado financeiro. Cada conta/API usa uma chave própria `@econimizou/finance:account:<api>:<id>`. O provider financeiro é remontado ao trocar de usuário; respostas de autenticação atrasadas não reabrem a sessão anterior. Escritas pendentes continuam vinculadas ao repositório da conta que as iniciou.

Contas novas começam sem transações/metas fictícias. Nome/avatar vêm do perfil autenticado na inicialização. Personalizações locais já existentes naquela conta são preservadas; ao editar o perfil pelo app, a API e o estado local são atualizados. O onboarding continua disponível e sua conclusão fica no estado local. Quando houver um tutorial anterior concluído, apenas essa preferência não financeira é reaproveitada.

A chave antiga `@econimizou/finance` permanece intacta e sem vínculo automático. A Home explica quando há dados antigos preservados. Nada é enviado à API por conta própria. Importação/migração dependerá de consentimento explícito em uma etapa futura. O logout não apaga transações, categorias, metas ou mensagens.

## Testes isolados

```bash
cd /mnt/DEV/DEVTEAM/economizou/backend
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --wait db-test
docker compose exec app composer test

cd ../frontend
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

O comando E2E prepara `app-test` em `127.0.0.1:8082`, usando `economizou_test` no MariaDB separado, e exporta o frontend apontando somente para essa API. Não cadastra usuários de teste no banco da aplicação. A ampliação de limites no servidor HTTP de teste só é aceita em `ENVIRONMENT=testing`; o limite real é testado pelo PHPUnit no serviço `app`. Não rode PHPUnit em paralelo ao E2E, pois o PHPUnit recria as tabelas do banco de teste. Nenhum volume de desenvolvimento é removido.

Referências: [Access Tokens do Shield](https://github.com/codeigniter4/shield/blob/v1.4.1/docs/guides/api_tokens.md), [SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).


## Cadastro e personalização — 13/11/2026

Depois de cadastrar e validar a sessão, novos usuários veem “Vamos personalizar seu Economizou?”. Podem continuar com todos os campos vazios ou pular, seguindo para o onboarding existente quando necessário. Contas anteriores não são obrigadas a passar pelo novo fluxo. Não foi implementado login Google/Microsoft.

`GET /api/auth/me` retorna também:

```json
{
  "user": {
    "personalization": {
      "birth_date": null,
      "financial_objective": null,
      "monthly_income_cents": null,
      "completed": false
    }
  }
}
```

Esse trecho mostra apenas os novos campos; os campos de usuário e `expires_at` anteriores continuam presentes. Cadastro e login usam o mesmo DTO.

`PATCH /api/auth/profile` agora aceita atualizações parciais de `name`, `avatar` e dos novos campos. Exemplo autenticado:

```json
{
  "birth_date": "2000-02-29",
  "financial_objective": "achievement",
  "monthly_income_cents": 520000,
  "personalization_completed": true
}
```

Nascimento deve ser uma data civil válida entre 1900 e hoje. Nenhuma idade é calculada ou utilizada em recomendações. Objetivos aceitos: `organize`, `save`, `debt_free`, `achievement`. Renda deve ser um inteiro JSON em centavos, entre zero e 9007199254740991; strings/decimais/valores negativos são rejeitados. `null` remove nascimento, objetivo ou renda. Campos omitidos são preservados. Campos desconhecidos, inclusive `user_id`, são rejeitados; o dono é obtido do token e o Model aplica escopo.

A nova migration `2026-11-13-000004_AddProfilePersonalization` acrescenta esses campos à tabela existente `user_preferences`, sem recriar `users` ou alterar migrations anteriores. Preferências anteriores recebem conclusão padrão; somente o cadastro novo grava `personalization_completed = 0`. Reversão foi testada apenas no banco isolado pela suíte de migrations.

Editar Perfil permite consultar, alterar ou remover as informações depois. A renda não cria uma Transação nem altera os totais financeiros. Os campos ficam preparados para planejamento e sugestões futuras, sem recomendações automáticas nesta etapa.

O indicador de força no cadastro é orientativo. O backend continua exigindo no mínimo oito caracteres, limite de 72 bytes, confirmação igual e aprovação pelo serviço oficial de senhas do Shield.

Ao pular normalmente, o app persiste apenas a conclusão na API. Se houver falha de rede/servidor, o app permite seguir naquela sessão sem fingir que os dados foram salvos no backend; numa próxima abertura a personalização poderá ser oferecida novamente. Falhas de autenticação continuam exigindo login.

## Reutilização da autenticação em categorias

Os endpoints de categorias usam os mesmos filtros `api-token`/`api-request`, Bearer mobile e cookie HttpOnly/CSRF web. `X-Account-ID` vincula a solicitação à conta esperada: apenas confirma o ID autenticado, nunca seleciona o dono. CORS permite esse header e DELETE para as origens já autorizadas. Nenhum token novo ou autenticação personalizada foi introduzido. Consulte [categories.md](categories.md).
