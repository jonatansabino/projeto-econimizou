
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
