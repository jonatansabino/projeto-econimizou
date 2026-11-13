
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

## Cadastro e personalização opcional — 13/11/2026

O formulário existente mantém nome completo, e-mail, senha e confirmação, com mínimo de oito caracteres, limite em bytes, mostrar/ocultar dentro dos inputs preenchidos, erros por campo, foco no primeiro erro também retornado pela API, carregamento e trava contra reenvio. O indicador de força é orientativo; a decisão final continua no Shield. Não há autenticação social nova.

Após cadastrar e autenticar, a rota protegida `personalizacao` apresenta nascimento opcional em calendário até hoje, quatro objetivos opcionais e renda opcional com máscara brasileira. Continuar aceita todos os campos vazios; Pular persiste somente a conclusão. Na falha de rede/servidor ao pular, permite seguir na sessão do aplicativo sem afirmar que salvou a conclusão no servidor; pode reapresentar na próxima abertura. Depois segue o onboarding existente, quando necessário. Usuários anteriores não são forçados ao novo fluxo.

Editar Perfil reutiliza `PersonalizationFields` para consultar, editar ou remover opcionais. Nome/avatar mantêm a atualização local existente; nascimento, objetivo e renda ficam no perfil da API. A renda não cria receitas nem altera saldos. Não há cálculo de idade ou recomendações por idade. O calendário reutilizado bloqueia a seleção de datas futuras quando recebe `maximumDate`. A seleção de objetivo expõe também `aria-checked` para acessibilidade web.

Arquivos principais: `src/app/personalizacao.tsx`, `src/components/personalization-fields.tsx`, `src/domain/personalization.ts`, `src/domain/auth.ts`, `src/state/auth-store.ts`, `src/app/_layout.tsx`, `src/components/auth-form.tsx`, `src/components/date-picker.tsx`, `src/app/(tabs)/configuracoes.tsx`, `src/app/privacidade.tsx`, `tests/personalization.test.mjs`, `tests/e2e/personalization.spec.ts`, `tests/e2e/auth.spec.ts`, `tests/e2e/existing-user.ts` e documentação compartilhada.

Validação final:

- TypeScript e ESLint passaram.
- **67 testes de domínio passaram**: opcionais, datas civis/bissextas/futuras, valores em centavos/zero/limite seguro, força/limite em bytes, preservação de metadados e pular offline isolado por usuário, além dos testes anteriores.
- **66 testes Playwright passaram**, em 390 × 844 e 320 × 740. Os oito novos casos (quatro fluxos em duas resoluções) verificam erros de cadastro/confirmação/Shield, campo com foco, clique duplo com uma única requisição, personalização completa e persistida, edição posterior e remoção dos dados, continuar vazio, pular, recarga sem repetir, falha de API sem falsa conclusão e falha de rede ao pular. A suíte anterior de finanças, navegação, teclado com altura reduzida, modais, avatares e onboarding continua passando.
- Exportação web e bundles Android/iOS passaram, sem novas dependências.
- Backend: **52 testes/464 asserções passaram**. Migrations antigas preservadas e apenas a complementar aplicada; `/health` respondeu HTTP 200.

Testes de interface usaram a API real de teste em 8082 e banco isolado; simulação de respostas foi restrita aos cenários explícitos de erro. Nenhum usuário fictício foi adicionado ao banco principal pelo procedimento de teste. Não houve execução em Windows, aparelho físico ou emulador nativo. Nenhum dado financeiro existente foi importado, apagado ou sincronizado.

## Nascimento com Dia/Mês/Ano — 13/11/2026

Substituído apenas o nascimento do cadastro complementar/perfil por três seletores lado a lado, no formato DD/MM/AAAA, com componentes React Native e Sheet reutilizados. Sem novas dependências. Dias e anos usam opções em grade com rolagem; meses incluem número e nome. O preenchimento continua opcional e o botão Não informar nascimento limpa os três valores.

`src/domain/birth-date.ts` calcula os dias de cada mês e anos bissextos (incluindo 1900 e 2000), limita ano/mês/dia até hoje e limpa um dia que deixa de existir ao trocar mês/ano. Não substitui silenciosamente o aniversário por outro dia. Uma escolha incompleta é mantida como rascunho, informada visualmente e rejeitada pela validação existente ao continuar; apenas a data completa segue como YYYY-MM-DD. Não houve mudança no contrato da API, migrations, demais campos ou calendário das transações.

Arquivos desta alteração: `src/components/birth-date-picker.tsx`, `src/domain/birth-date.ts`, `src/components/personalization-fields.tsx`, `tests/birth-date.test.mjs`, `tests/e2e/personalization.spec.ts` e os registros de contexto/validação.

Validações: TypeScript e ESLint passaram; **71 testes de domínio passaram**; **10 casos E2E de personalização passaram** em 390 × 844 e 320 × 740. Cobrem alinhamento dos três seletores, seleção em ordem independente, persistência real de 2000-02-29, edição do perfil, opcionais, bloqueio de data parcial, limpeza de 29/02 ao trocar para ano comum, ausência de opções futuras e campos existentes preservados. Exportações web e bundles Android/iOS passaram. A captura em 320 px foi inspecionada visualmente, sem sobreposição. A suíte E2E financeira completa e o backend não foram repetidos nesta alteração restrita ao seletor; os resultados completos anteriores permanecem registrados acima. Não houve teste em aparelho físico ou emulador nativo.

## Nascimento conforme imagem: dropdown com busca — 13/11/2026

Após a referência visual fornecida pelo usuário, o nascimento foi refeito com três campos de largura igual e sem separadores entre eles, no bloco escuro “Data de nascimento” com texto auxiliar. A skill image-to-code foi usada para analisar os detalhes da referência existente e conferir capturas do resultado, mantendo a imagem enviada como fonte visual.

Os campos abrem listas suspensas ancoradas, com busca, rolagem, fundo cinza-escuro, opção selecionada com check e fechamento por seleção, Escape, clique fora ou voltar do Android. A sobreposição usa Modal transparente, sem painel centralizado nem grades. Em telas pequenas, a lista tem largura mínima legível; a posição e altura consideram espaço disponível, Safe Area e teclado. Android/iOS usam linhas de toque de 44 px. A medição de teclado nativa é restrita às plataformas nativas para compatibilidade web.

A validação de datas, anos bissextos, opcionais e formato YYYY-MM-DD permanece em `src/domain/birth-date.ts`. Não houve alteração no backend, nos demais campos ou no calendário de transações. Arquivos desta revisão: `src/components/birth-date-picker.tsx`, `src/components/personalization-fields.tsx`, `tests/e2e/personalization.spec.ts`, contexto e este registro.

TypeScript e ESLint passaram; os **71 testes de domínio passaram**; os **12 casos de interface de personalização passaram** nas duas resoluções. Os novos testes verificam busca por dia/mês/ano, ausência de resultados, posição abaixo do campo, seleção persistida ao fechar, Escape, clique fora, colunas iguais e popup dentro da viewport com altura reduzida a 440 px. Capturas foram inspecionadas em 320 px e desktop, incluindo a correção da borda dupla da busca. Exportação web passou; bundles Android/iOS gerados. Não houve execução em aparelho físico ou emulador nativo; os testes completos financeiros e backend não foram repetidos nesta revisão visual.

## Etapa 1 — paleta da Data de nascimento — 13/11/2026

Apenas as cores da seção de nascimento foram alinhadas aos campos existentes. `birth-date-picker.tsx` usa agora `colors.surface` no container/lista, `colors.background` nos campos/pesquisa, `colors.border` nas bordas e no fundo da opção selecionada, `colors.text` nos textos, `colors.muted` nos auxiliares e `colors.primary` nas setas, check, seleção e foco. A sombra também usa a paleta. Não foram adicionadas cores ao tema.

Os estilos `card`, `title`, `hint`, `label`, `trigger`, `value`, `dropdown`, `search`, `searchInput`, `optionText` e `selected` foram atualizados. Os novos estados visuais `focused` e `errorBorder` usam o verde do tema e o `ui.error.color` já compartilhado pelos formulários. Desabilitado mantém a opacidade existente e usa seta em cor secundária. `personalization-fields.tsx` apenas informa o erro existente ao BirthDatePicker para destacar a borda; a mensagem continua a mesma.

Layout, busca, seleção, digitação na pesquisa, validações e salvamento não mudaram. Nenhum arquivo do backend, banco principal, avatar ou tela de Ajustes foi alterado nesta tarefa. Os registros anteriores neste documento continuam sendo históricos de outras etapas.

TypeScript, ESLint e os 12 testes E2E existentes de personalização passaram em 390 × 844 e 320 × 740, usando a API/banco de teste já disponíveis. Abertura, pesquisa, seleção, opcionais, datas inválidas, persistência e edição existentes continuam passando. A captura web de 320 px foi inspecionada visualmente. Contraste calculado: texto/surface 15,85:1; muted/surface 7,09:1; texto/background 17,84:1; primary/seleção 6,87:1. Exportação web e bundles Android/iOS passaram. Não havia validação em dispositivo físico ou emulador nativo nesta execução; os bundles verificam compilação, não aparência nativa em execução. Os testes de domínio/backend não foram repetidos nesta alteração visual.

## Opcionais sempre acessíveis no perfil — 13/11/2026

`PersonalizationFields` mantém “Não informar nascimento” sempre visível, mesmo sem data, em personalização e Editar perfil. Removido o botão “Prefiro informar depois” da renda; o campo permanece opcional e pode ser limpo diretamente. O rascunho usa atualizações funcionais para mesclar cada campo com o estado atual. A constante de placeholders sem uso foi removida de BirthDatePicker, preservando a edição manual que deixou os campos vazios.

TypeScript e ESLint passaram sem avisos. Os 12 casos de personalização passaram em 390 × 844 e 320 × 740. Os testes verificam o botão de nascimento inicialmente vazio e após reabrir o perfil, ausência do botão de renda, limpeza direta do campo, persistência como null, nascimento, busca e demais fluxos existentes. A limpeza aguarda a confirmação do valor controlado antes de desfocar, evitando uma corrida de automação. Alterações recentes de capitalização dos textos foram preservadas e a exportação web foi atualizada antes da validação final. Nenhuma mudança de backend ou regra financeira. Nesta tarefa não foram repetidos testes físicos/nativos, bundles nativos ou a suíte backend.

## Remover “Não informar nascimento” — 13/11/2026

Removido o botão externo de `personalization-fields.tsx`. `birth-date-picker.tsx` mantém o nascimento opcional e oferece “Limpar data” dentro do dropdown somente quando houver data/rascunho preenchido, preservando a possibilidade de salvar null depois da edição. Testes adaptados para confirmar ausência do botão externo e limpeza pelo seletor. TypeScript, ESLint, exportação web e os 12 E2E de personalização em duas resoluções passaram. Sem alterações de backend, regras de data ou demais campos.

## Etapa 2 — Avatar e foto de perfil — 13/11/2026

Implementado somente o editor de imagem em personalização pós-cadastro e Editar Perfil. A imagem circular/câmera abre um único fluxo de opções, catálogo DiceBear, prévia e confirmação de remoção. O catálogo não aparece inicialmente; a escolha da prévia altera somente o rascunho. Gravação ocorre em Continuar/Salvar perfil, com bloqueio de envio duplicado e feedback. Fechar o formulário descarta os rascunhos. Home e Ajustes compartilham `profile.photoRef`; `avatar` permanece como fallback/último DiceBear.

Persistência: Android/iOS usam `Paths.document`, com diretórios separados por API/conta e referência relativa. Web usa Blob no IndexedDB, nunca Base64/URL temporária no AsyncStorage. JPEG/PNG/WebP até 10 MiB; HEIC/HEIF apenas no mobile quando decodificável. Recorte quadrado e JPEG 512 × 512, 85%, até 2 MiB. A API continua recebendo apenas os campos anteriores; foto/ref/URI não são enviados. O perfil local é salvo antes da conclusão remota; erro da API restaura somente o perfil, sem reverter registros financeiros. Limpeza de imagens antigas consulta referências persistidas e preserva arquivos em caso de dúvida. Resultados atrasados do seletor são descartados.

### Arquivos desta etapa

Criados:

- `src/components/profile-image-editor.tsx`
- `src/domain/profile-photo.ts`
- `src/data/photo-storage.ts` e `src/data/photo-storage.web.ts`
- `src/data/photo-cleanup.ts`
- `src/services/save-profile-photo.ts`
- `src/state/profile-photo-context.tsx`
- `src/state/use-profile-image-editor.ts`
- `tests/profile-photo.test.mjs`
- `tests/e2e/profile-photo.spec.ts`

Atualizados:

- `src/components/profile-avatar.tsx`
- `src/domain/finance.ts`
- `src/state/finance-store.ts` e `src/state/finance-context.tsx`
- `src/app/personalizacao.tsx`
- `src/app/(tabs)/index.tsx` e `src/app/(tabs)/configuracoes.tsx`
- `tests/e2e/avatar.spec.ts`, `tests/e2e/app.spec.ts` e `tests/e2e/personalization.spec.ts`
- `app.json`, `package.json`, `package-lock.json`, `README.md`, `VALIDATION.md` e `../CONTEXTO.md`.

Alterações anteriores já presentes na árvore de trabalho foram preservadas; esta etapa não modificou backend/migrations, autenticação ou a organização de Ajustes.

### Validação executada

- `npm run typecheck`: passou.
- `npm run lint`: passou, sem avisos.
- `npm test`: **79/79** testes de domínio passaram. Os novos casos cobrem formatos/limites, metadados opcionais, isolamento do rollback, falha de gravação/API e troca de sessão.
- `npm run test:e2e`: exportou a Web e executou a suíte completa contra a API/banco de teste isolados. Na última execução completa, **85/86** passaram; o único caso restante usava uma busca ambígua por chave de armazenamento depois de criar um segundo perfil. A fixture foi corrigida para ler a chave exata da conta.
- `npx playwright test tests/e2e/profile-photo.spec.ts`: **14/14** passaram após essa correção, nas resoluções 390 × 844 e 320 × 740. Assim, os **86 cenários distintos** da suíte foram validados, combinando a execução completa com a reexecução específica. Falhas anteriores do aviso de sucesso e do teste de posicionamento do nascimento também foram corrigidas e passaram na execução completa: aviso usa anúncio não urgente; dropdown pode abrir acima ou abaixo conforme espaço disponível.
- Upload real de PNG pelo seletor do navegador: JPEG final 512 × 512/até 2 MiB, Blob no IndexedDB, rascunho sem gravação antecipada, persistência após recarga, Home/Ajustes, remoção com DiceBear anterior, cancelamento do seletor/prévia/formulário, arquivo inválido/acima do limite, armazenamento indisponível, API 503 com rollback, arquivo ausente/corrompido, referência de outra conta e preservação de arquivo ainda referenciado. Payloads reais da API e AsyncStorage verificados sem imagem/Base64/URI. Personalização verifica persistência antes de concluir remotamente e continuidade após onboarding. Capturas da imagem e catálogo conferidas visualmente.
- `npx expo export --platform android --platform ios --output-dir /tmp/economizou-photo-native-final`: passou; bundles Hermes das duas plataformas gerados. Não é compilação de APK/IPA nem execução em aparelho.
- `npx expo install --check` e `npx expo-doctor`: módulos novos compatíveis; Doctor passou **19/20** verificações. Pendência já existente de patch do Expo instalado: **58.0.24**, recomendação atual **~58.0.25**. A versão do Expo não foi alterada nesta etapa.

## Etapa 3 — Reorganização dos Ajustes — 13/11/2026

Redesenho completo da tela de Ajustes (`configuracoes.tsx`) com organização por cards e seções:
- **Cabeçalho:** Avatar DiceBear/foto com nome, e-mail e botão/ação "Editar Perfil".
- **Minha Conta:** Dados pessoais (com seletor de nascimento e objetivo), Foto de perfil (com DiceBear e galeria) e Alterar senha (tela dedicada `/alterar-senha` com força de senha e indicação de pendência na API).
- **Minhas Finanças:** Minha renda (com valor planejado e dia de recebimento), Categorias (`/categorias`) e Limites de gastos (`/limites`).
- **Preferências:** Central de Notificações, Segurança e Privacidade, switches para Ocultar valores, Notificações simuladas, Animações suaves e Ver tutorial novamente.
- **Sair da Conta:** Botão destacado com modal de confirmação.

Validação:
- `npm run typecheck`: passou sem erros.
- `npm run lint`: passou sem erros ou avisos.
- `npm test`: **80/80** testes de domínio passaram.
- `expo export --platform web`: 23 rotas estáticas exportadas com sucesso.
- `expo export --platform android` e `ios`: bundles nativos Hermes gerados com sucesso.

## Separação de Renda Planejada de Receitas Registradas — 13/11/2026

- Mensagem explicativa em Ajustes → Minha renda e formulários de personalização: *"A renda informada será usada para planejamento e não altera seu saldo. Para registrar dinheiro recebido, utilize o Extrato."*
- Renda prevista (`monthlyIncomeCents`) e dia habitual de recebimento (`incomeDay`) mantidos estritamente como preferências de planejamento.
- Cálculos de saldo total, receitas do mês, despesas do mês, extrato e relatórios mantidos exclusivamente calculados a partir de `transactions`.
- Testes: novo arquivo `tests/planned-income.test.mjs` validando isolamento do saldo, recálculo em edições/exclusões de transações e prevenção de duplicidade (**83/83 testes de domínio aprovados**).
- TypeScript e ESLint: 0 erros.



Dependências adicionadas pelo Expo: `expo-image-picker ~58.0.10`, `expo-file-system ~58.0.13` e `expo-image-manipulator ~58.0.16`. Plugin permite fotos e bloqueia câmera/microfone.

Limitações de validação: não há `adb`/Xcode/dispositivo/emulador disponível; galeria nativa, permissões negadas/limitadas, recuperação de atividade Android, decodificação HEIC/HEIF e reinício nativo precisam de teste em development build. A Web foi executada em Chromium; outros navegadores não foram testados. As fotos são locais, sem sincronização entre dispositivos. A suíte PHP do backend não foi repetida, pois nenhum arquivo do backend foi alterado nesta etapa.

## Etapa 22 — Contas a pagar e a receber — 13/11/2026

### Escopo e regras implementadas

- Rota protegida `/contas`, acessível na Home em Próximos compromissos → Ver todas. Duas abas de tipo, cadastro/edição/exclusão, categoria, máscara monetária, vencimento/calendário e observações, pesquisa, filtros por situação e MM/AAAA ou todos os períodos, lista ordenada por vencimento e histórico efetivo.
- Valores em centavos inteiros seguros. Status persistidos pending/settled; atraso derivado de vencimento anterior ao dia local atual. Cores, ícones e texto distinguem situações. Os resumos de pendências usam vencimento; os de pagamentos/recebimentos usam data efetiva. Atraso é subconjunto do pendente, sem somar duas vezes.
- Modal de confirmação permite data efetiva até hoje e valor diferente do previsto. O comando grava conta confirmada e transação efetiva em um único snapshot do repositório existente, antes de publicar sucesso. Identificador determinístico de transação e vínculo bidirecional (`transactionId`/`commitmentId`), validação de integridade e fila de gravações impedem duplicações.
- Uma conta confirmada tem fluxo explícito para editar apenas a previsão (mantendo o Extrato), corrigir valor/data efetivos (mesmo lançamento), desfazer confirmação e excluir especificamente o lançamento, ou excluir só o compromisso preservando a transação. A exclusão conjunta exige escolher esse botão específico. Editar uma transação vinculada pelo Extrato sincroniza o efetivo; excluir diretamente ou trocar seu tipo é bloqueado, com acesso a Contas.
- Home inclui próximos compromissos, quantidades pendentes/previstas/atrasadas e projeção. Saldo atual mantém o cálculo anterior, somente com transações registradas. Projeção usa saldo atual + recebimentos pendentes − pagamentos pendentes com vencimento de hoje até 30 dias adiante; não inclui atrasos anteriores ao horizonte nem renda planejada. Valores respeitam ocultação.
- Recorrência mensal cria regra e previsões até 12 meses à frente (a partir da primeira ocorrência, ou do mês atual quando posterior), ampliando na abertura/retomada e mudança de data. Cursor durável e IDs por regra/mês impedem duplicar ou recriar ocorrências excluídas. Dias 29/30/31 são limitados ao último dia do mês sem perder a âncora original. Editar regra afeta apenas pendências futuras; mantém tipo/mês inicial. Encerrar impede novas ocorrências, preservando as existentes. Nunca cria transações automaticamente.
- Campos opcionais commitments/commitmentRecurrences preservam a versão 2 e dados antigos sem conversão destrutiva ou inserção de mocks. Não foi necessário alterar a versão do esquema. Dono é determinado pelo repositório/chave já existente por API/conta; não se aceita dono pelo formulário. Auditoria em createdAt/updatedAt; datas financeiras continuam civis YYYY-MM-DD. A validação de data foi extraída sem mudança de comportamento para civil-date.ts, evitando dependência circular no novo domínio.
- Se falhar a ampliação automática de recorrências ao carregar, o snapshot anterior continua acessível com erro e tentativa manual. Falhas de confirmação preservam tanto o compromisso quanto o Extrato anterior. Categorias referenciadas por contas/regras não podem ser excluídas nem mudar de tipo.

### Arquivos desta etapa

Criados:

- `src/domain/commitments.ts`: modelos, integridade, status, resumos, projeção e geração mensal.
- `src/domain/civil-date.ts`: validador de data civil compartilhado, extraído sem alterar regras.
- `src/data/commitment-operations.ts`: comandos financeiros independentes das telas e integrados à gravação atômica existente.
- `src/app/contas.tsx`: tela de Contas e fluxos de gerenciamento/correção.
- `src/components/commitment-form.tsx`: formulário e confirmação efetiva.
- `src/components/commitment-row.tsx`: apresentação reutilizável das situações.
- `src/components/upcoming-commitments.tsx`: resumo da Home e projeção.
- `tests/commitments.test.mjs` e `tests/e2e/commitments.spec.ts`.

Modificados:

- `src/domain/finance.ts`: campos opcionais, vínculo da transação e validação integrada; cálculos existentes preservados.
- `src/state/finance-store.ts`: comandos, expansão na abertura, sincronização de vínculos e proteção de categorias/exclusão de transações vinculadas.
- `src/state/finance-context.tsx`: atualização das recorrências pela data local e retomada do aplicativo.
- `src/app/_layout.tsx`: proteção/navegação da nova rota.
- `src/app/(tabs)/index.tsx`: seção Próximos compromissos.
- `src/app/transacao.tsx`: aviso e acesso à gestão do compromisso vinculado.
- `tests/e2e/app.spec.ts`, `tests/e2e/onboarding.spec.ts`, `tests/e2e/settings.spec.ts`: seletores adaptados aos nomes atuais de Ajustes e ao formulário de múltiplas fontes de renda, já existente antes desta etapa. A implementação dessas funcionalidades não foi alterada.
- `README.md`, `VALIDATION.md` e `../CONTEXTO.md`.

Nenhuma dependência adicionada. Nenhum arquivo do backend, migration ou configuração de banco foi alterado nesta etapa; alterações anteriores da árvore de trabalho foram preservadas. Os testes E2E utilizam autenticação existente contra API/banco de teste isolados, sem modificar dados do banco principal.

### Integração futura

A interface usa os comandos do estado compartilhado e o repositório financeiro existente. A API deverá implementar contas/regras por usuário autenticado, consulta por período, confirmação/correção atômicas e idempotentes com transações, FKs/unicidade, paginação e sincronização consentida. Os modelos locais não substituem essas garantias do servidor. Não foram implementados endpoints financeiros, cartões ou financiamentos.

### Resultados executados

- Antes da implementação: TypeScript, ESLint e **104/104** testes de domínio passaram.
- Ao concluir: `npm run typecheck`, `npm run lint` (sem avisos) e `npm test`: **127/127** testes de domínio passaram, com 23 casos novos de contas, integridade e recorrências.
- `npm run test:e2e -- tests/e2e/commitments.spec.ts`: **10/10** casos novos passaram em Chromium, 390 × 844 e 320 × 740.
- `npm run test:e2e`: suíte completa executada. Na última execução completa, **104/106** passaram; os 2 restantes ainda procuravam o antigo botão “Gerenciar Categorias” nos Ajustes, cujo nome atual é “Categorias”. O seletor foi corrigido sem alterar a tela.
- Reexecução com exportação Web atualizada: `npm run test:e2e -- tests/e2e/app.spec.ts tests/e2e/commitments.spec.ts --grep 'configurações:|previsão, confirmação|corrigir confirmado|validação, cancelar|recorrência mensal:|falha de persistência'`: **12/12** passaram (10 novos + 2 de Ajustes). Assim, os **106 cenários distintos** foram validados combinando a suíte completa e a reexecução após correção. Os testes antigos de tutorial e renda também foram adaptados aos nomes/formulário atuais e passaram na execução completa; não houve alteração de suas funcionalidades.
- Domínio: previsões não movimentam saldo, pagamento/recebimento com valor efetivo diferente, confirmação concorrente, gravação única/rollback, atraso/virada de ano, projeção sem dupla contagem, resumos por data efetiva, CRUD, correções e exclusões vinculadas, atualização do relatório, persistência por nova instância, categorias referenciadas, dados v2 antigos, isolamento por API/usuário, recorrência sem duplicação/recriação, meses curtos/bissextos, encerramento, limite do ano 9999 e falha de expansão na abertura preservando dados acessíveis.
- Interface: navegação desde Home, previsão sem transação, confirmação por clique duplo, Extrato/Relatórios/Home, recebimento, correção efetiva, exclusão preservando lançamento, campos inválidos/foco, rascunho cancelado, pesquisa/período/status, atrasos, ocultação, recorrência/encerramento, recarga e falha de AsyncStorage sem confirmação parcial. Captura de Contas em 320 px conferida visualmente após estabilizar a transição da tela.
- `npx expo export --platform android --platform ios --output-dir /tmp/economizou-22-native-final`: passou para os dois bundles Hermes. Exportações estáticas Web passaram no processo E2E. `git diff --check` passou para os arquivos desta etapa.

Não houve execução em aparelho físico, emulador Android/iOS ou Windows. Não foi gerado APK/IPA; os bundles verificam a compilação JavaScript/Hermes. Persistência/reinício foram verificados no navegador e por novas instâncias do estado/repositório nos testes de domínio, não em aparelho nativo. A suíte PHP não foi repetida porque não houve mudança de backend. Fotos, autenticação e finanças anteriores tiveram suas regressões de interface executadas.

## Categorias no MariaDB, por usuário — 13/11/2026

Nova integração de categorias com a API existente. GET/POST `/api/categories`, PATCH/DELETE `/api/categories/{id}` usam o transporte autenticado já existente, Bearer mobile e cookie HttpOnly/CSRF Web. O cliente envia `X-Account-ID` como confirmação da conta esperada; o servidor sempre determina o dono pelo Shield. Respostas atrasadas de outra sessão são descartadas; trocar cookies em outra aba não permite gravar categorias na conta errada.

Novas categorias, edição e exclusão aguardam confirmação do servidor e gravação do cache. Consulta ao abrir/retomar, a cada 60 s e pelo botão de atualização. Consulta lenta não bloqueia gravações financeiras e não sobrescreve edição posterior. Categorias locais antigas têm envio explícito com chave idempotente, retomável sem duplicar; preserva IDs/referências e não envia transações, contas, metas, fotos ou dados sem dono. O cache v2 mantém campos opcionais `remoteId`/`archived`. Exclusão lógica e consulta completa preservam registros referenciados por históricos locais. Categorias arquivadas não aparecem como novas opções; histórico permanece íntegro. Tipo no banco é fixo para proteger referências em outros aparelhos. Não houve integração dos demais registros financeiros.

### Arquivos desta integração

Backend:

- Criados `app/Controllers/Api/CategoriesController.php`, `app/Database/Migrations/2026-11-13-000005_AddCategorySynchronization.php`, `tests/feature/CategoriesApiTest.php` e `docs/categories.md`.
- Atualizados `app/Models/CategoryModel.php`, `app/Config/Routes.php`, `app/Config/Cors.php`, `README.md`, `docs/auth.md`, `docs/database.md` e `VALIDATION.md`.

Frontend:

- Criados `src/domain/categories.ts`, `tests/categories-api.test.mjs` e `tests/e2e/categories-api.spec.ts`.
- Atualizados `src/domain/finance.ts`, `src/domain/auth.ts`, `src/data/auth-api.ts`, `src/state/auth-store.ts`, `src/state/finance-store.ts`, `src/state/finance-context.tsx`, `src/app/categorias.tsx`, `src/app/transacao.tsx`, `src/components/commitment-form.tsx`, `src/data/commitment-operations.ts`, `tests/e2e/auth.spec.ts`, `README.md` e `VALIDATION.md`.
- Atualizado `../CONTEXTO.md`. Nenhuma dependência adicionada ou migration anterior modificada. Alterações preexistentes na árvore de trabalho foram preservadas.

### Validação executada

- TypeScript e ESLint passaram sem avisos; **143/143** testes de domínio passaram (16 novos). Cobrem CRUD/API, importação explícita e interrompida, preservação de IDs/registros, outra instância sem cache, falha de rede/cache, histórico com categoria arquivada/ausente, tipo fixo, payload restrito/Bearer/CSRF, sessão trocada, logout com falha, consultas lentas e preservação de erros financeiros.
- `npm run test:e2e`: **114/114** passaram na execução final completa, em Chromium 390 × 844 e 320 × 740. Oito casos novos verificam API real/MariaDB, CRUD, importação sem duplicações, manutenção dos vínculos, recarga, mesma conta em outro contexto de navegador, isolamento de outra conta e ausência de sucesso offline. A expectativa antiga que permitia somente chamadas de autenticação foi atualizada para permitir GET/OPTIONS de categorias, continuando a proibir envio automático de dados antigos.
- `docker compose exec -T app composer test`: **57 testes / 503 asserções**, todos passaram no MariaDB isolado. Incluem ausência de autenticação, dono forjado, leitura/edição/exclusão de outra conta, unicidade por usuário, idempotência, soft delete/recriação, tipo fixo, conta esperada divergente e CORS DELETE, além das regressões existentes de FKs/Models/autenticação.
- Migration complementar aplicada no banco principal com `php spark migrate --all`; conferido histórico antes/depois: somente a nova versão entrou no batch 5, migrations anteriores mantiveram versões/batches/horários. Nova execução não reaplicou migrations. Nenhuma tabela, linha existente ou volume foi removido. PHPUnit e E2E não foram executados simultaneamente.
- Exportação estática Web passou no E2E. `npx expo export --platform android --platform ios --output-dir /tmp/economizou-categories-native-final` passou para os dois bundles Hermes. `git diff --check` passou nos arquivos alterados.

Sem execução em dispositivo/emulador nativo ou Windows, nem APK/IPA. A simulação de outro aparelho foi feita com outro contexto de navegador, sem cache compartilhado. As demais finanças e fotos continuam locais; não foi implementada sincronização financeira geral.

## Base financeira principal no banco e reinício global — 13/11/2026

Por solicitação do usuário, retirado o envio/importação de categorias antigas. Contas iniciam sem categorias ou transações fictícias. Receitas, despesas e categorias usam o MariaDB como fonte principal; o cache é secundário. GET `/api/finance` consulta um snapshot por usuário; POST `/api/finance/transactions` grava alterações atomicamente, com geração da base, revisão e identificadores estáveis. CRUD manual, Chat e confirmação/correção de contas usam a mesma gravação. A API bloqueia conflitos, categorias de outro usuário e requisições de gerações anteriores. Cache indisponível após confirmação remota não duplica nem descarta o lançamento real.

Migration aditiva `2026-11-13-000006_AddFinancialSynchronization` aplicada, acrescentando chave de cliente em transactions e tabela financial_state. Com autorização explícita para todas as contas, executado no banco principal `php spark finance:reset --all-users --confirm`. Foram preservados **2 usuários e 2 perfis**; as tabelas financeiras operacionais ficaram vazias. Antes da execução já havia zero transações/categorias/metas no banco; o comando também girou as chaves para invalidar caches antigos. Não houve exclusão de volumes ou credenciais. Caches financeiros são reiniciados ao abrir/conectar, preservando perfis/preferências/fotos. Dados locais antigos sem dono não são enviados. CONTEXTO.md não foi alterado nesta solicitação.

Arquivos principais novos: backend `FinanceController.php`, `FinancialState.php`, `FinancialReset.php`, comando `ResetFinance.php`, migration 000006 e `FinanceApiTest.php`; frontend `domain/remote-finance.ts`, testes de domínio e `bank-finance.spec.ts`. Integração em TransactionModel, CategoriesController, Routes/Cors, transporte autenticado, AuthStore/FinanceStore/Context, repositório por conta, formulários e mensagens de privacidade. Fixtures dos E2E agora preparam registros reais exclusivamente na API/banco isolados, sem importar dados da aplicação. Ajustes visuais preexistentes do usuário em Categorias foram preservados.

Validação final: TypeScript/ESLint sem avisos; **151/151** testes de domínio; **62 testes PHP / 563 asserções**; **120/120 E2E** na execução completa final, Chromium 390 × 844 e 320 × 740. Testados início vazio, receitas/despesas, CRUD, mesma conta em outro navegador, isolamento de outra conta, falha de API sem lançamento apenas local, repetição de formulário, confirmação pelo Chat/contas, limpeza global preservando usuários/perfis, invalidação de escrita antiga, revisão, rollback integral e dez consultas HTTP simultâneas. Consultas usam bloqueio exclusivo na obtenção da linha de estado para evitar deadlock por upgrade de lock. Exportação Web e bundles Hermes Android/iOS passaram. `/health` retornou status ok e database connected após a limpeza.

Não houve execução nativa em aparelho/emulador, build APK/IPA ou Windows. Metas, previsões, mensagens e fotos criadas após o reinício continuam locais; apenas seus lançamentos efetivos entram no banco. O comando de limpeza não é executado automaticamente pelo launcher.
