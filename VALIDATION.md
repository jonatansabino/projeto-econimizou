# Validação atual — etapas 14 a 17

Em 03/11/2026, as quatro etapas foram implementadas e validadas separadamente. Resultado final: **34 testes de domínio e 28 testes de interface passaram**, além de TypeScript, ESLint, compatibilidade das dependências, exportação web e bundles Android/iOS.

Arquivos modificados por etapa, resultados intermediários, preservação dos dados e limitações: [VALIDATION_STAGES_14_17.md](./VALIDATION_STAGES_14_17.md).

A execução em aparelho físico/emulador e o comportamento de teclado e áreas seguras nativos continuam pendentes. Nenhum teste físico foi realizado.

---

# Histórico — implementação inicial

Data: 03/11/2026.

## Resultados

- `npm run typecheck`: passou.
- `npm run lint`: passou, sem erros ou avisos de lint.
- `npm test`: **22 testes passaram**.
- `npx expo install --check`: dependências compatíveis com SDK 58.
- `npm run test:e2e`: **16 testes de interface passaram**, em Chromium, nos tamanhos 390 × 844 e 320 × 740, com fuso America/Sao_Paulo. Inclui também verificação em largura de 1280 px.
- `npm run export:web`: passou, com todas as rotas exportadas.
- `npx expo export --platform android --platform ios --output-dir dist-native`: passou, gerando bundles Hermes para ambas as plataformas.

## Domínio, store e persistência

Os testes cobrem cálculos em centavos, saldo histórico versus totais mensais, datas civis, formatos monetários brasileiros, filtros combinados, agregação por categoria, cadastro/edição/exclusão de transações, assinaturas do estado, dados vazios sem reinserção de mocks, gravações concorrentes, publicação após salvar, falhas de leitura/escrita e preservação de dados inválidos ou de versão desconhecida.

Também validam interpretação de comandos do chat, confirmação obrigatória, cancelamento, proteção contra dupla confirmação e gravação atômica de mensagem e transação; criação/edição/exclusão de metas, preferências, perfil, decisões de recomendações, categorias com proteção de referências, leitura e desativação de novos avisos, restauração em nova instância e migração da versão 1 para a 2 sem perder os dados anteriores.

## Interface real da versão web

1. Home com saldos esperados, sino, leitura de avisos, atalhos, relatórios, filtro de categoria e navegação pelas abas.
2. Cadastro de despesa, rejeição de data inválida, pesquisa, filtros de tipo/categoria e intervalo personalizado, edição, cancelamento de exclusão e exclusão confirmada.
3. Cadastro de receita com categoria compatível, atualização do saldo e relatório.
4. Chat com proposta pendente restaurada após recarga, confirmação atualizando Home e Extrato e cancelamento sem gravação financeira.
5. Metas com progresso de 25% e 50%, edição, exclusão, aceite/recusa de recomendações e restauração após recarregar.
6. Nome/avatar editáveis, CRUD de categorias, bloqueio de exclusão de categoria usada, preferências persistidas, tela de privacidade e rota inexistente com retorno ao início.
7. Dados inválidos no armazenamento web preservados pela tela de erro, botão de nova tentativa e recuperação após tornar o armazenamento disponível.
8. Virada de mês simulada no relógio do navegador: receitas/despesas do novo mês zeram, filtros acompanham o novo mês e o saldo histórico é preservado.

A persistência real da implementação web de AsyncStorage foi verificada com recarga de página e abertura de nova página no mesmo contexto do navegador. Capturas da Home, formulário, Chat e modal de meta foram inspecionadas visualmente. Artefatos ficam em `test-results/`, ignorado pelo Git.

## Limites da validação

Não foi realizado build de instalação nem teste em aparelho/emulador Android ou iOS; ADB não está disponível nesta sessão. Exportação de bundles não substitui build nativo. Teclado virtual, áreas seguras de aparelhos específicos e persistência após encerramento do processo nativo devem ser verificados em dispositivo compatível com SDK 58.

O assistente e as recomendações são simulações locais. A tela de segurança é demonstrativa, sem autenticação/biometria reais. Metas e recomendações não movimentam dinheiro no extrato.

## Ajuste — editar receitas do mês pela Home

O card de visão geral agora oferece **Editar receitas do mês**. Para uma receita, abre diretamente o formulário existente com o valor preenchido; para várias, permite escolher um registro do mês. Sem receitas no mês, oferece **Adicionar receita do mês** com tipo Receita pré-selecionado. A edição mantém o identificador da transação e recalcula os totais compartilhados, sem criar duplicações ou modificar receitas de outros meses.

Arquivos deste ajuste: `src/components/financial-summary.tsx`, `tests/e2e/monthly-income.spec.ts` e `README.md`.

Validação do ajuste: TypeScript e ESLint passaram; **34 testes de domínio e 34 testes de interface web passaram**, incluindo seis execuções novas (três cenários em duas resoluções). Foram verificados o exemplo R$ 5.200 → R$ 6.000, sincronização com Extrato/Relatórios, recarga, múltiplas receitas, preservação de outros meses e cadastro quando não há receita. Exportações web e bundles Android/iOS passaram. Não foram realizados testes em aparelho físico.
