import { isCivilDate, localDate, summarize, formatMoney, type Category, type Transaction, type TransactionInput } from './finance.ts';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposal?: TransactionInput;
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

export function interpretCommand(text: string, categories: Category[], transactions: Transaction[], now = new Date()): { text: string; proposal?: TransactionInput } {
  const normalized = normalize(text);
  const match = /^(gastei|paguei|recebi|ganhei)\s+(?:r\$\s*)?(\d[\d.,]*)(?:\s+(.*))?$/i.exec(text.trim());
  if (match) {
    try {
      const amountCents = parseMoney(match[2]);
      const type = /^(recebi|ganhei)$/i.test(match[1]) ? 'income' : 'expense';
      const detail = (match[3] ?? '').replace(/^(no|na|em|com|de|do|da)\s+/i, '').trim() || (type === 'expense' ? 'Gasto pelo chat' : 'Receita pelo chat');
      const detailKey = normalize(detail);
      const hints = /almoco|jantar|lanche|mercado|cafe|comida|restaurante/.test(detailKey) ? 'alimentacao'
        : /uber|onibus|metro|gasolina|transporte/.test(detailKey) ? 'transporte'
        : /aluguel|luz|agua|moradia/.test(detailKey) ? 'moradia'
        : /cinema|lazer|show/.test(detailKey) ? 'lazer'
        : /salario/.test(detailKey) ? 'salario' : '';
      const compatible = categories.filter((item) => item.type === type);
      const category = compatible.find((item) => detailKey.includes(normalize(item.name)))
        ?? compatible.find((item) => hints && normalize(item.name) === hints)
        ?? compatible.find((item) => normalize(item.name) === (type === 'expense' ? 'outros' : 'renda extra')) ?? compatible[0];
      if (!category) return { text: 'Crie uma categoria compatível em Ajustes antes de registrar essa transação.' };
      return { text: `Entendi! Confira os dados abaixo. Só vou registrar após sua confirmação.`, proposal: { description: detail, amountCents, type, categoryId: category.id, date: localDate(now) } };
    } catch { return { text: 'Não consegui interpretar o valor. Tente: “Gastei R$ 45,00 no almoço”.' }; }
  }
  if (/saldo|resumo|quanto/.test(normalized)) {
    const totals = summarize(transactions, localDate(now).slice(0, 7));
    return { text: `Seu saldo é ${formatMoney(totals.balanceCents)}. Neste mês, entraram ${formatMoney(totals.incomeCents)} e saíram ${formatMoney(totals.expenseCents)}.` };
  }
  if (/econom|dica|meta/.test(normalized)) return { text: 'Uma ideia para começar: revise pequenos gastos recorrentes e defina uma reserva que caiba no seu orçamento. A aba Metas tem sugestões simuladas para você avaliar.' };
  return { text: 'Sou um assistente local simulado. Posso mostrar seu “saldo”, sugerir formas de “economizar” e preparar registros como “Gastei R$ 45 no almoço” ou “Recebi R$ 200 de renda extra”.' };
}

export function transactionTotals(transactions: Transaction[]) {
  const incomeCents = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amountCents, 0);
  const expenseCents = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amountCents, 0);
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}
