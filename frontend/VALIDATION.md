
## Ajuste — avatares DiceBear

Integração de 12 avatares Adventurer (Lisa Wischofsky / DiceBear, CC BY 4.0), gerados localmente por script Node e incluídos como SVGs. A aplicação não chama a API do DiceBear nem envia dados do perfil. O seletor tem prévia, destaque da opção escolhida e botão Salvar perfil fixo no modal. Home e Ajustes compartilham o renderizador SVG. O identificador é salvo no campo existente `profile.avatar`; emojis de perfis anteriores recebem uma representação determinística sem sobrescrever dados até salvar.

Arquivos: `src/components/profile-avatar.tsx`, `avatar-picker.tsx`, `ui.tsx`, `src/domain/avatar.ts`, `src/data/avatar-catalog.ts`, `mock-data.ts`, `src/app/(tabs)/index.tsx`, `configuracoes.tsx`, `src/app/privacidade.tsx`, `scripts/generate-avatars.mjs`, `package.json`, `package-lock.json`, testes e README. DiceBear core 10.7.0/styles 10.6.0 são apenas dependências de desenvolvimento; o runtime reutiliza `react-native-svg`.

A checagem de compatibilidade apontou versões recomendadas mais recentes dentro do SDK 58. Foram alinhados Expo ~58.0.23, Constants ~58.0.15, Linking ~58.0.16, Router ~58.0.30, SplashScreen ~58.0.13 e Safe Area Context ~5.11.1. Após o alinhamento, `expo install --check` passou.

Validação final: TypeScript e ESLint passaram; **37 testes de domínio e 38 testes de interface web passaram**. Casos novos verificam catálogo de SVGs locais, compatibilidade com emojis antigos, seleção/prévia, sincronização de Home e Ajustes, persistência após recarga, fechar sem salvar, dados financeiros preservados e ausência de requisições externas no fluxo. O botão Salvar foi confirmado no viewport; galeria inspecionada visualmente em tela de 320 px. Exportações web e bundles Android/iOS passaram. Nenhum teste em aparelho físico foi realizado.

## Ajuste — interpretação de metas e despesas no Chat IA

O interpretador local distingue pedidos de metas de relatos de receitas/despesas. Solicita propósito ou valor ausentes, identifica almoço como alimentação e exige confirmação antes de registrar. A confirmação também aceita “sim” e o cancelamento aceita “cancelar”. Criar uma meta começa com zero guardado e não altera o saldo. A pergunta pendente é persistida junto ao histórico e pode ser retomada após recarga. Campos opcionais preservam a compatibilidade dos dados anteriores, sem migração destrutiva ou novas dependências.

Arquivos: `src/domain/features.ts` (interpretação e contexto), `src/domain/finance.ts` (validação dos novos campos), `src/state/finance-store.ts` (confirmação atômica), `src/app/(tabs)/chat.tsx` (cartão de confirmação da meta), `tests/chat-intents.test.mjs`, `tests/e2e/chat-intents.spec.ts`, README e este registro.

Cobertura nova: frase de videogame do usuário, objetivo informado em duas mensagens, gasto com almoço com/sem valor, receitas, cancelamentos, datas e quantidades distintas de dinheiro, rejeição de valores inválidos/ambíguos, prevenção de confirmação duplicada, falha de persistência sem alteração do estado e recarga durante a conversa. Os fluxos web verificam a meta na aba Metas, despesa no Extrato e saldo atualizado na Home, em 390 × 844 e 320 × 740.

TypeScript, ESLint, os 46 testes de domínio e os 44 testes de interface web passaram. A exportação web e a geração dos bundles Android/iOS passaram. Nenhum teste em dispositivo físico ou emulador nativo foi realizado. O chat permanece uma simulação por regras locais, sem API de IA ou compreensão irrestrita de linguagem natural.

## 11/11/2026 — dependências e avisos de acessibilidade web

O estado encontrado tinha Expo 52.0.49 e eslint-config-expo 6.0.0 instalados com React 19.3.0, React Native 0.88.1 e módulos do SDK 58. `expo install --check` apontava incompatibilidades; o lint falhava ao importar `eslint-config-expo/flat`. Foram restaurados Expo SDK 58 (instalado 58.0.24) e eslint-config-expo 58.0.4. LinearGradient, Linking, Router, SplashScreen e StatusBar foram alinhados às revisões recomendadas pelo SDK. O instalador adicionou o config plugin do StatusBar. React e React DOM permanecem 19.3.0; `npm ls react --parseable --all` aponta uma única instalação.

As mensagens enviadas pelo usuário foram reproduzidas no navegador em desenvolvimento: `Invalid ARIA attribute ariaHidden` e `Received false for a non-boolean attribute accessible`. A origem era o SVG dos avatares: o parser convertia `aria-hidden` em camelCase e a prop nativa era encaminhada ao DOM. O gerador agora remove o atributo do XML; `ProfileAvatar` aplica `aria-hidden` diretamente na web e `accessible={false}` no Android/iOS, mantendo o nome acessível no contêiner. Os IDs e o desenho dos avatares foram preservados. O teste da galeria foi ampliado para conferir os atributos do DOM e mensagens de console.

A atualização do Router alterou a ocultação das rotas web para `inert`; os testes detectaram elementos das abas inativas nas consultas por acessibilidade. `Screen` e o chat agora também aplicam `aria-hidden` conforme `useIsFocused`, sem desmontar telas nem alterar os dados. O fluxo de receitas, despesas e chat é novamente verificado na suíte completa.

Verificações finais: Expo Doctor 20/20, `expo install --check`, TypeScript, ESLint, 46 testes de domínio e 44 testes de interface web passaram. Após as correções, o navegador com React em desenvolvimento percorreu onboarding, todas as abas, seleção/salvamento de avatar e recarga sem avisos ou erros de console. Exportações web e bundles Android/iOS passaram. Não houve teste em aparelho físico ou emulador nativo. Para recarregar as dependências na sessão de desenvolvimento existente, encerrar o Metro e iniciar `npx expo start --clear`.

## 11/11/2026 — reorganização do repositório

O app foi movido para `/mnt/DEV/DEVTEAM/economizou/frontend`, e a API para a pasta irmã `backend/`. Código, assets, scripts, testes e configurações do app foram comparados por hash antes e após a movimentação e permaneceram iguais. Dependências locais e arquivos gerados também foram preservados; a documentação de execução foi ajustada.

No novo diretório passaram TypeScript, ESLint, 46 testes de domínio, exportação web e 44 testes de interface nas resoluções 390 × 844 e 320 × 740. O histórico Git permanece na raiz do projeto. Para desenvolver, abrir a nova raiz no editor e executar os comandos npm dentro de `frontend/`. Reiniciar qualquer Metro aberto no caminho antigo.

## Etapa 3 — cadastro, login e sessão — 11/11/2026

Adicionadas telas de cadastro/login no tema existente, com validação, foco no primeiro campo inválido, mostrar/ocultar senha, processamento e mensagens da API. Expo Router protege todas as telas financeiras e aguarda a restauração antes de renderizá-las. O onboarding existente foi preservado e usa o nome autenticado. Ajustes permite atualizar nome/avatar na API e sair da sessão.

O serviço HTTP centralizado usa `EXPO_PUBLIC_API_URL`, timeout e HTTPS em produção. Android/iOS usam `expo-secure-store` ~58.0.3, instalado pelo Expo e configurado no app. Web usa cookie HttpOnly e CSRF, sem Bearer em armazenamento JavaScript. A sessão é validada por `/me` ao abrir, periodicamente e ao voltar ao primeiro plano. Falha de rede na restauração oferece reconexão; expiração/revogação conhecidas bloqueiam a área financeira. Falha de logout mantém a sessão e informa que é necessário tentar novamente.

Autenticação e finanças têm estados separados. Os repositórios financeiros usam namespace por API/usuário e o provider é remontado ao trocar de conta. Contas novas começam sem transações/metas fictícias. A chave antiga `@econimizou/finance` permanece intacta, sem importação automática ou envio à API. As personalizações de uma conta já existente são preservadas. A Home informa sobre dados antigos disponíveis para uma migração futura consentida.

Arquivos principais: `src/domain/auth.ts`, `src/constants/api.ts`, `src/data/auth-api.ts`, `token-storage.ts`, `token-storage.web.ts`, `account-finance-repository.ts`, `finance-repository.ts`, `src/state/auth-store.ts`, `auth-context.tsx`, `finance-context.tsx`, `src/components/auth-screen.tsx`, `auth-form.tsx`, `src/app/_layout.tsx`, `login.tsx`, `register.tsx`, `onboarding.tsx`, `(tabs)/configuracoes.tsx`, `(tabs)/index.tsx`, `privacidade.tsx`, `app.json`, `.env.example`, dependências, `scripts/test-e2e.mjs`, testes e README.

Resultados:

- `npm run typecheck` e `npm run lint`: passaram.
- `npm test`: **61 testes passaram**. Incluem restauração, persistência segura, expiração, falhas de rede/armazenamento, logout, isolamento de contas/API, dados antigos intactos, validação de URL e respostas atrasadas de sessões anteriores.
- `npm run test:e2e`: **56 testes passaram**, em 390 × 844 e 320 × 740. São 44 fluxos financeiros existentes e 12 verificações de autenticação. Cadastro/login usam a API real de teste, sem simular autenticação. Verificam sessão após recarga, cookies HttpOnly, navegação protegida, logout, duplicidade, falhas de conexão, onboarding, preservação do armazenamento antigo e isolamento financeiro entre duas contas.
- Exportação web e bundles Android/iOS passaram. `expo install --check` passou e Expo Doctor concluiu **20/20 verificações**.
- Backend integrado: **49 testes/423 asserções** passaram; `/health` principal retornou HTTP 200 com banco conectado.

Não houve teste em aparelho físico ou emulador nativo; exportar bundles não verifica execução do SecureStore em dispositivo. Recuperação de senha ficou fora por solicitação do usuário. As finanças continuam locais e não são sincronizadas com o backend. O ambiente e os comandos estão em `../backend/docs/auth.md`.
