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

A ideia é continuar melhorando o aplicativo aos poucos.

<img width="646" height="818" alt="Captura de tela de 2026-11-03 10-39-23" src="https://github.com/user-attachments/assets/4b7f2b0e-5965-4847-ac46-cea122080f01" />

---

**Desenvolvido com 💚 utilizando Vibe Coding.**

## 👨‍💻 Desenvolvedor
**Jonatan Sabino**
Desenvolvedor do projeto Economizou, criado como parte de um desafio de Vibe Coding, utilizando inteligência artificial como apoio no desenvolvimento.

- **GitHub:** [@jonatansabino](https://github.com/jonatansabino)

---

Desenvolvido por **Jonatan Sabino** com 💚 e apoio de IA.
## Avatares DiceBear

O perfil usa uma galeria de 12 avatares **Adventurer** do DiceBear, com fundos adaptados ao tema escuro. Acesse **Ajustes → Editar perfil**, escolha uma opção e toque em **Salvar perfil**, que fica fixo no rodapé do modal. A prévia muda ao selecionar; Home e Ajustes usam o mesmo componente e identificador salvo no AsyncStorage.

Os SVGs estão incluídos no aplicativo, sem API externa ou envio de dados do perfil. `@dicebear/core` 10.7.0 e `@dicebear/styles` 10.6.0 são dependências de desenvolvimento com versões fixas. O aplicativo usa o `react-native-svg` já instalado; o gerador DiceBear não é executado no celular.

```sh
npm run avatars:generate
```

Esse comando regenera `src/data/avatar-catalog.ts` a partir de `scripts/generate-avatars.mjs`. O arquivo gerado deve permanecer no repositório. As opções têm IDs estáveis como `dicebear:adventurer:2`; `src/domain/avatar.ts` resolve tanto esses IDs quanto avatares antigos salvos como emoji. A compatibilidade dos emojis é visual: o dado antigo só é substituído pelo novo ID ao salvar o perfil. Alterar o mock continua afetando apenas novas instalações.

Avatares Adventurer por **Lisa Wischofsky**, distribuídos por [DiceBear](https://www.dicebear.com/styles/adventurer/) sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Autoria, fonte, licença e alteração das cores de fundo também aparecem em Segurança e privacidade.

## Conversas sobre metas e despesas

O Chat IA interpreta comandos por regras locais, sem enviar dados para serviços externos:

- “Quero criar uma economia para comprar um videogame”: identifica uma meta e pergunta quanto você deseja juntar. Responda, por exemplo, “R$ 3.000,00”, revise e confirme a criação.
- “Almocei por R$ 45”: prepara uma despesa de alimentação. Se disser apenas “Almocei”, pergunta o valor antes de preparar o registro.
- “Recebi R$ 200 de renda extra”: prepara uma receita.

Use os botões de confirmação ou responda “sim”/“cancelar”. Nada é salvo como meta ou transação antes da confirmação. Criar uma meta não movimenta o saldo. Transações confirmadas atualizam os totais compartilhados de Home, Extrato e Relatórios. Conversas, valores pendentes e registros são persistidos no AsyncStorage, permitindo continuar após reabrir o aplicativo.

O assistente é uma simulação: frases ambíguas, valores inválidos ou múltiplos movimentos precisam ser esclarecidos. Ele não oferece compreensão irrestrita de linguagem natural.

Obs: Versão de teste, será implementado uma versão mais completa.
