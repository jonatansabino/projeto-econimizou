import { localDate, type FinanceData } from '../domain/finance.ts';

// Executado apenas quando não há dados salvos; as datas acompanham a primeira abertura.
export function createMockData(now = new Date()): FinanceData {
  const date = localDate(now);
  return {
    version: 2,
    onboarding: { completed: false },
    profile: { name: 'Jonatan', avatar: '💰' },
    preferences: { hideAmounts: false, notificationsEnabled: true, animationsEnabled: true },
    categories: [
      { id: 'salary', name: 'Salário', type: 'income' },
      { id: 'extra', name: 'Renda extra', type: 'income' },
      { id: 'food', name: 'Alimentação', type: 'expense' },
      { id: 'home', name: 'Moradia', type: 'expense' },
      { id: 'transport', name: 'Transporte', type: 'expense' },
      { id: 'leisure', name: 'Lazer', type: 'expense' },
      { id: 'other', name: 'Outros', type: 'expense' },
    ],
    transactions: [
      { id: 'mock-salary', description: 'Salário do mês', amountCents: 520000, type: 'income', categoryId: 'salary', date },
      { id: 'mock-rent', description: 'Aluguel', amountCents: 150000, type: 'expense', categoryId: 'home', date },
      { id: 'mock-market', description: 'Supermercado', amountCents: 28650, type: 'expense', categoryId: 'food', date },
      { id: 'mock-lunch', description: 'Almoço', amountCents: 4500, type: 'expense', categoryId: 'food', date },
      { id: 'mock-transport', description: 'Transporte', amountCents: 1800, type: 'expense', categoryId: 'transport', date },
    ],
    chatMessages: [{ id: 'welcome', role: 'assistant', text: 'Olá! Sou seu assistente financeiro simulado. Diga “Gastei R$ 45 no almoço” para preparar um registro, ou peça seu saldo. Você sempre confirma antes de salvar.' }],
    recommendations: [
      { id: 'rec-food', title: 'Planeje as refeições da semana', description: 'Revise seus gastos com alimentação e experimente levar almoço de casa em um dia da semana.', status: 'pending' },
      { id: 'rec-reserve', title: 'Defina uma reserva mensal', description: 'Escolha um valor que caiba no orçamento e acompanhe manualmente sua reserva em uma meta.', status: 'pending' },
      { id: 'rec-subscriptions', title: 'Revise suas assinaturas', description: 'Liste serviços recorrentes e avalie quais ainda fazem sentido para você.', status: 'pending' },
    ],
    notifications: [{ id: 'welcome-notification', title: 'Boas-vindas ao Econimizou!', body: 'Seus dados iniciais são fictícios. Comece registrando uma transação ou criando uma meta.', date, read: false }],
    goals: [{ id: 'mock-emergency', name: 'Reserva de emergência', targetCents: 1500000, savedCents: 250000 }],
  };
}
