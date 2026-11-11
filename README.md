# Economizou

Projeto organizado em duas aplicações independentes:

```text
economizou/
├── frontend/   # App mobile Expo / React Native / TypeScript
├── backend/    # API PHP 8.3 / CodeIgniter 4 / MariaDB / Docker
├── LICENSE
└── README.md
```

## Frontend

```bash
cd frontend
npm ci
npx expo start --clear
```

Para validar: `npm run typecheck`, `npm run lint`, `npm test` e `npm run test:e2e`, executados dentro de `frontend/`.

Consulte o [README do frontend](frontend/README.md) e o [histórico de validação](frontend/VALIDATION.md).

## Backend

```bash
cd backend
# Apenas se o .env não existir:
cp .env.example .env
docker compose up -d --build --wait
docker compose exec app php spark migrate --all
```

API: <http://localhost:8080/>. Saúde: <http://localhost:8080/health>.

Consulte o [README do backend](backend/README.md) e o [registro de validação](backend/VALIDATION.md).

Os nomes do projeto Docker e dos volumes continuam `economizou-api` para preservar o banco existente. Isso independe do nome da pasta `backend/`. O frontend integra cadastro, login, sessão e perfil à API com Shield. As finanças continuam locais e separadas por conta; os dados antigos não são enviados nem vinculados automaticamente. Recuperação de senha não está incluída, conforme decisão da etapa 3.

Antes de iniciar o Expo, copie `frontend/.env.example` para `frontend/.env.local` se necessário e configure `EXPO_PUBLIC_API_URL`. No desenvolvimento web, use o mesmo hostname para a API e o frontend (por exemplo, ambos `localhost`); em aparelho físico, use o IP do computador na rede local. Produção exige HTTPS e configuração explícita das origens permitidas. Veja [autenticação e configuração](backend/docs/auth.md).

O repositório Git e a licença ficam na raiz. As dependências, configurações, testes e registros de cada aplicação ficam em sua respectiva pasta. Se havia um servidor Expo aberto no caminho antigo, encerre-o e inicie novamente a partir de `frontend/`.

Validação após a reorganização: frontend com TypeScript, ESLint, 46 testes de domínio, exportação web e 44 testes de interface passando; backend com 11 testes/24 asserções passando, containers saudáveis e `/health` respondendo HTTP 200. O volume do MariaDB e a migration existente foram preservados.
