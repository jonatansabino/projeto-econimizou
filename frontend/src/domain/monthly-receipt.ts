import { formatMoney, type Transaction } from './finance.ts';

export type MonthlyReceiptProgress = {
  plannedCents: number;
  receivedCents: number;
  percent: number;
  visualPercent: number;
  differenceCents: number;
  isExceeded: boolean;
  isReached: boolean;
  surplusCents: number;
  remainingCents: number;
  referenceMonth: string;
  referenceMonthLabel: string;
  message: string;
};

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function formatMonthYear(referenceMonth: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) {
    return referenceMonth;
  }
  const [yearStr, monthStr] = referenceMonth.split('-');
  const monthIndex = Number(monthStr) - 1;
  const monthName = MONTH_NAMES[monthIndex] ?? monthStr;
  return `${monthName} de ${yearStr}`;
}

export function monthlyIncomeReceived(transactions: Transaction[], referenceMonth: string): number {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) return 0;
  let total = 0;
  for (const t of transactions) {
    if (t.type === 'income' && t.date.slice(0, 7) === referenceMonth) {
      total += t.amountCents;
    }
  }
  return total;
}

export function calculateMonthlyReceipt(
  plannedCents: number | null | undefined,
  receivedCents: number,
  referenceMonth: string
): MonthlyReceiptProgress | null {
  if (
    plannedCents == null ||
    !Number.isSafeInteger(plannedCents) ||
    plannedCents <= 0
  ) {
    return null;
  }

  const safeReceived = Number.isSafeInteger(receivedCents) && receivedCents >= 0 ? receivedCents : 0;
  const percent = Math.round((safeReceived / plannedCents) * 100);
  const visualPercent = Math.min(100, Math.max(0, percent));
  const isExceeded = safeReceived > plannedCents;
  const isReached = safeReceived === plannedCents;
  const differenceCents = Math.abs(plannedCents - safeReceived);
  const surplusCents = isExceeded ? safeReceived - plannedCents : 0;
  const remainingCents = !isExceeded && !isReached ? plannedCents - safeReceived : 0;
  const referenceMonthLabel = formatMonthYear(referenceMonth);

  let message = `Você registrou ${percent}% da sua renda prevista neste mês.`;
  if (isExceeded) {
    message = `Você superou sua renda prevista em ${formatMoney(surplusCents)} neste mês!`;
  } else if (isReached) {
    message = 'Você atingiu 100% da sua renda prevista neste mês!';
  } else if (safeReceived === 0) {
    message = 'Você registrou 0% da sua renda prevista neste mês.';
  }

  return {
    plannedCents,
    receivedCents: safeReceived,
    percent,
    visualPercent,
    differenceCents,
    isExceeded,
    isReached,
    surplusCents,
    remainingCents,
    referenceMonth,
    referenceMonthLabel,
    message,
  };
}
