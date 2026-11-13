import { localDate } from './finance.ts';

export type BirthDatePart = 'day' | 'month' | 'year';
export function birthDateParts(value: string) {
  const [year = '', month = '', day = ''] = value.split('-');
  return { day, month, year };
}
export function birthDateOptions(value: string, today = localDate()): Record<BirthDatePart, string[]> {
  const parts = birthDateParts(value);
  const [year, month, day] = today.split('-').map(Number);
  const currentYear = Number(parts.year) === year;
  const monthLimit = currentYear ? month : 12;
  // Sem ano escolhido, fevereiro oferece 29 até a seleção definir se é bissexto.
  let dayLimit = parts.month ? new Date(Number(parts.year) || 2000, Number(parts.month), 0).getDate() : 31;
  if (currentYear && Number(parts.month) === month) dayLimit = Math.min(dayLimit, day);
  return {
    day: Array.from({ length: dayLimit }, (_, i) => String(i + 1).padStart(2, '0')),
    month: Array.from({ length: monthLimit }, (_, i) => String(i + 1).padStart(2, '0')),
    year: Array.from({ length: year - 1900 + 1 }, (_, i) => String(year - i)),
  };
}
export function selectBirthDatePart(value: string, part: BirthDatePart, selected: string, today = localDate()) {
  if (selected && !birthDateOptions(value, today)[part].includes(selected)) return value;
  const parts = { ...birthDateParts(value), [part]: selected };
  const serialize = () => parts.day || parts.month || parts.year ? `${parts.year}-${parts.month}-${parts.day}` : '';
  if (parts.month && !birthDateOptions(serialize(), today).month.includes(parts.month)) {
    parts.month = ''; parts.day = '';
  }
  if (parts.day && !birthDateOptions(serialize(), today).day.includes(parts.day)) parts.day = '';
  return serialize();
}
