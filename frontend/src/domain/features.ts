import { formatMoney, isCivilDate, localDate, summarize, type Category, type Goal, type Transaction, type TransactionInput, type TransactionType } from './finance.ts';

export type GoalProposal = Omit<Goal, 'id'>;
export type ChatRequest =
  | { kind: 'goal'; name?: string; targetCents?: number }
  | { kind: 'transaction'; draft: Omit<TransactionInput, 'amountCents'> };
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposal?: TransactionInput;
  goalProposal?: GoalProposal;
  request?: ChatRequest;
  status?: 'pending' | 'confirmed' | 'cancelled';
};
export type Recommendation = { id: string; title: string; description: string; status: 'pending' | 'accepted' | 'ignored' };
export type Notification = { id: string; title: string; body: string; date: string; read: boolean };
export type TransactionFilters = { query?: string; type?: string; categoryId?: string; start?: string; end?: string };
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function parseMoney(value: string, allowZero = false): number {
  const raw = value.trim().replace(/^R\$\s*/i, '');
  // Formato brasileiro: 1.234,56; aceita também 1234.56, sem milhares.
  if (!/^(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)$/.test(raw)) throw new Error('Informe um valor como 45,00 ou 1.234,56.');
  const clean = raw.includes(',') || /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const [whole, fraction = ''] = clean.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0 || (!allowZero && cents === 0)) throw new Error('O valor deve ser positivo e estar dentro do limite suportado.');
  return cents;
}
export const inputMoney = (cents: number) => `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
export function displayDate(value: string) { return value.split('-').reverse().join('/'); }
export function parseDate(value: string) {
  const civil = /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split('/').reverse().join('-') : value;
  if (!isCivilDate(civil)) throw new Error('Informe uma data válida no formato DD/MM/AAAA.');
  return civil;
}
export function filterTransactions(transactions: Transaction[], filters: TransactionFilters = {}) {
  const query = normalize(filters.query ?? '');
  return transactions.filter((item) =>
    (!query || normalize(item.description).includes(query)) &&
    (!filters.type || filters.type === 'all' || item.type === filters.type) &&
    (!filters.categoryId || item.categoryId === filters.categoryId) &&
    (!filters.start || item.date >= filters.start) && (!filters.end || item.date <= filters.end)
  ).map((item, index) => ({ item, index })).sort((a, b) => b.item.date.localeCompare(a.item.date) || b.index - a.index).map(({ item }) => item);
}
export function periodRange(period: string, now = new Date()) {
  const end = localDate(now);
  if (period === 'month') return { start: `${end.slice(0, 7)}-01`, end: `${end.slice(0, 7)}-31` };
  if (period === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: localDate(first), end: localDate(last) };
  }
  if (period === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { start: localDate(start), end };
  }
  return {};
}
export function categoryTotals(transactions: Transaction[], categories: Category[]) {
  return categories.filter((category) => category.type === 'expense').map((category) => ({
    ...category, total: transactions.filter((item) => item.type === 'expense' && item.categoryId === category.id).reduce((sum, item) => sum + item.amountCents, 0),
  })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
}

export type ChatResponse = Pick<ChatMessage, 'text' | 'proposal' | 'goalProposal' | 'request'>;

export function chatDecision(text: string): boolean | undefined {
  const value = normalize(text).replace(/[!?. ,]+$/g, '');
  if (/^(sim|confirmo|confirmar|pode salvar|pode criar|sim pode salvar|sim pode criar|sim por favor)$/.test(value)) return true;
  if (/^(nao|cancelar|cancela|desisto|esquece|deixa pra la|nao quero mais)$/.test(value)) return false;
  return undefined;
}

function readAmount(text: string) {
  // Datas, horários e quantidades de pessoas não são valores financeiros.
  const source = text.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{1,2}:\d{2}\b/g, ' ');
  const currency = /(?:R\$\s*[-−]?\s*\d[\d.,]*|[-−]?\b\d[\d.,]*\s*(?:reais|real)\b)/gi;
  const marked = [...source.matchAll(currency)].map((match) => match[0]);
  const signaled = [...source.matchAll(/\b(?:gastei|paguei|recebi|ganhei|custou|por|foi|deu|preciso de|juntar|guardar|economizar|valor de)\s+([-−]?\d[\d.,]*)/gi)].map((match) => match[1]);
  const bare = [...source.matchAll(/(^|[^\w])([-−]?\d[\d.,]*)/g)].filter((match) => !/^\s*(?:amigos|pessoas|horas|minutos|dias|meses|anos|vezes|parcelas|itens|x\b)/i.test(source.slice((match.index ?? 0) + match[0].length))).map((match) => match[2]);
  const candidates = marked.length ? marked : signaled.length ? signaled : bare;
  if (candidates.length > 1 || /\b(?:e|mais)\s+(?:R\$\s*)?\d/i.test(source)) return { detail: source.replace(currency, ''), issue: 'multiple' as const };
  if (!candidates.length) return { detail: source, issue: 'missing' as const };
  const raw = candidates[0];
  const detail = source.replace(raw, ' ').replace(/\s+/g, ' ').trim();
  // Um verbo como "gastei 2 horas" não deve criar uma despesa de dois reais.
  const quantity = source.indexOf(raw) + raw.length;
  if (!marked.length && /^\s*(?:amigos|pessoas|horas|minutos|dias|meses|anos|vezes|parcelas|itens)\b/i.test(source.slice(quantity))) return { detail: source, issue: 'missing' as const };
  try {
    return { detail, amountCents: parseMoney(raw.replace(/\s*(?:reais|real)$/i, '').replace(/\.$/, '')), issue: undefined };
  } catch { return { detail, issue: 'invalid' as const }; }
}

function chooseCategory(description: string, type: TransactionType, categories: Category[]) {
  const key = normalize(description);
  const hint = /almoc|jant|lanch|mercado|cafe|comida|restaurante|aliment/.test(key) ? 'alimentacao'
    : /uber|onibus|metro|gasolina|transporte/.test(key) ? 'transporte'
    : /aluguel|luz|agua|moradia/.test(key) ? 'moradia'
    : /cinema|lazer|show/.test(key) ? 'lazer' : /salario/.test(key) ? 'salario' : '';
  const compatible = categories.filter((item) => item.type === type);
  return compatible.find((item) => key.includes(normalize(item.name)))
    ?? compatible.find((item) => hint && normalize(item.name) === hint)
    ?? compatible.find((item) => normalize(item.name) === (type === 'expense' ? 'outros' : 'Renda Extra')) ?? compatible[0];
}
function goalName(text: string) {
  const detail = text.match(/\bpara\s+(?:eu\s+)?(.+)/i)?.[1]
    ?? text.match(/\b(?:quero|pretendo|vou|gostaria de)\s+(comprar\b.+)/i)?.[1]
    ?? text.match(/\b(?:meta|economia)\s+(?:chamada|de|com o nome)\s+(.+)/i)?.[1];
  if (!detail) return undefined;
  const clean = detail.replace(/\s+(?:e\s+)?(?:preciso|quero)\s+(?:de|juntar|guardar|economizar)\b.*$/i, '')
    .replace(/\b(?:que custa|no valor de|custa|por|de)\s*$/i, '').replace(/[.,!?:;]+$/g, '').trim();
  if (!clean || clean.length > 100 || !/[a-zÀ-ÿ]/i.test(clean)) return undefined;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
function goalResponse(request: Extract<ChatRequest, { kind: 'goal' }>, issue?: string): ChatResponse {
  if (!request.name) return { text: 'Para que você quer economizar? Dê um nome para sua meta, como “Comprar um videogame”.', request };
  if (!request.targetCents || issue) return { text: `${issue === 'multiple' ? 'Encontrei mais de um valor. ' : issue === 'invalid' ? 'O valor informado não é válido. ' : ''}Qual é o valor total que você quer juntar para a meta “${request.name}”? Informe em reais, por exemplo R$ 3.000,00.`, request: { kind: 'goal', name: request.name } };
  return { text: 'Preparei sua meta de economia. Confira e confirme para criar. Nenhum dinheiro será movimentado.', goalProposal: { name: request.name, targetCents: request.targetCents, savedCents: 0 } };
}
function expenseDescription(text: string, type: TransactionType) {
  const clean = text.replace(/^(?:eu\s+)?(?:hoje\s+|ontem\s+)?/i, '').replace(/^(?:gastei|paguei|recebi|ganhei)\b\s*/i, '')
    .replace(/\b(?:e\s+)?(?:gastei|paguei|custou|foi|deu)\s*$/i, '').replace(/^(?:no|na|em|com|de|do|da|por)\s+/i, '')
    .replace(/\balmocei\b/i, 'Almoço').replace(/\bjantei\b/i, 'Jantar').replace(/\blanchei\b/i, 'Lanche')
    .replace(/\b(?:hoje|ontem)\b/gi, '').replace(/\b(?:por|de|no valor de)\s*$/i, '').replace(/[.,!?:;]+$/g, '').replace(/\s+/g, ' ').trim();
  return clean || (type === 'expense' ? 'Gasto pelo chat' : 'Receita pelo chat');
}
function transactionResponse(draft: Omit<TransactionInput, 'amountCents'>, amount: ReturnType<typeof readAmount>, categories: Category[]): ChatResponse {
  const category = categories.find((item) => item.id === draft.categoryId && item.type === draft.type) ?? chooseCategory(draft.description, draft.type, categories);
  if (!category) return { text: 'Crie uma categoria compatível em Ajustes antes de registrar essa Transação.' };
  const current = { ...draft, categoryId: category.id };
  if (!amount.amountCents) return { text: `${amount.issue === 'multiple' ? 'Encontrei mais de um valor. Registre um movimento por vez. ' : amount.issue === 'invalid' ? 'O valor informado não é válido. ' : ''}Qual foi o valor ${draft.type === 'expense' ? 'gasto' : 'recebido'} em “${draft.description}”? Informe em reais, por exemplo R$ 45,00.`, request: { kind: 'transaction', draft: current } };
  return { text: 'Entendi! Confira os dados abaixo. Só vou registrar após sua confirmação.', proposal: { ...current, amountCents: amount.amountCents } };
}

export function interpretCommand(text: string, categories: Category[], transactions: Transaction[], now = new Date(), context?: ChatRequest): ChatResponse {
  const normalized = normalize(text).replace(/\s+/g, ' ');
  if (chatDecision(text) === false) return { text: 'Tudo bem, cancelei este pedido. Nenhuma meta ou Transação foi criada.' };
  if (/^(?:eu )?(?:nao|nunca) (?:gastei|paguei|recebi|ganhei|almocei|comprei|quero|pretendo)/.test(normalized)) return { text: 'Entendido. Não vou preparar nenhum registro com essa mensagem.' };
  const wantsGoal = /\b(?:quero|preciso|criar|crie|nova|montar|fazer|pretendo|gostaria)\b/.test(normalized) && /\b(?:meta|economia|economizar|poupar|juntar|guardar)\b/.test(normalized)
    || /\b(?:quero|pretendo|gostaria de) comprar\b/.test(normalized);
  if (wantsGoal) {
    const amount = readAmount(text);
    const name = goalName(amount.detail) ?? (context?.kind === 'goal' ? context.name : undefined);
    return goalResponse({ kind: 'goal', ...(name ? { name } : {}), ...(amount.amountCents ? { targetCents: amount.amountCents } : {}) }, amount.issue);
  }
  if (/\b(?:vou|quero|pretendo) (?:gastar|pagar|almocar)\b/.test(normalized)) return { text: 'Esse parece ser um gasto planejado. Para registrar uma despesa, conte um gasto que já aconteceu e informe o valor.' };
  if (/saldo|resumo/.test(normalized) || /^(?:quanto|qual|mostre|ver)\b/.test(normalized) && /gastei|despesas|receitas/.test(normalized)) {
    const totals = summarize(transactions, localDate(now).slice(0, 7));
    return { text: `Seu saldo é ${formatMoney(totals.balanceCents)}. Neste mês, entraram ${formatMoney(totals.incomeCents)} e saíram ${formatMoney(totals.expenseCents)}.`, ...(context ? { request: context } : {}) };
  }
  const income = /\b(?:recebi|ganhei|entrou|receita)\b/.test(normalized);
  const expense = /\b(?:gastei|paguei|almocei|jantei|lanchei|comprei|despesa|gasto)\b/.test(normalized);
  if (income && expense) return { text: 'Identifiquei receita e despesa na mesma mensagem. Envie um movimento por vez, com seu valor.' };
  if (income || expense) {
    const type = income ? 'income' : 'expense';
    const amount = readAmount(text);
    let description = expenseDescription(amount.detail, type);
    const previous = context?.kind === 'transaction' && context.draft.type === type ? context.draft : undefined;
    if (/^(Gasto|Receita) pelo chat$/.test(description) && previous) description = previous.description;
    const category = chooseCategory(description, type, categories);
    let date = localDate(now);
    if (/\bontem\b/.test(normalized)) { const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); date = localDate(yesterday); }
    const explicit = text.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0];
    if (explicit) { try { date = parseDate(explicit); } catch { return { text: 'A data informada não é válida. Informe novamente o gasto com uma data válida.' }; } }
    return transactionResponse({ description, type, categoryId: category?.id ?? '', date: previous && !explicit && !/\b(?:hoje|ontem)\b/.test(normalized) ? previous.date : date }, amount, categories);
  }
  if (context) {
    const amount = readAmount(text);
    if (context.kind === 'goal') {
      const name = context.name ?? (amount.issue === 'missing' ? text.trim().replace(/[.!?]+$/, '').slice(0, 100) : undefined);
      return goalResponse({ ...context, ...(name ? { name } : {}), ...(amount.amountCents ? { targetCents: amount.amountCents } : {}) }, context.targetCents && !context.name ? undefined : amount.issue);
    }
    return transactionResponse(context.draft, amount, categories);
  }
  if (/econom|dica|meta/.test(normalized)) return { text: 'Uma ideia para começar: revise pequenos gastos recorrentes e defina uma reserva que caiba no orçamento. Se quiser criar uma meta, diga “Quero economizar para comprar um videogame”.' };
  return { text: 'Sou um assistente local simulado. Posso preparar metas, despesas e receitas. Exemplos: “Quero economizar para comprar um videogame”, “Almocei por R$ 45” ou “Recebi R$ 200 de Renda Extra”. Sempre peço confirmação antes de salvar.' };
}

export function transactionTotals(transactions: Transaction[]) {
  const incomeCents = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountCents, 0);
  const expenseCents = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountCents, 0);
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}
