import type { Page } from '@playwright/test';
import { createMockData } from '../../src/data/mock-data';

// Testes de regressão representam quem já utiliza o app. Onboarding tem testes próprios.
export async function existingUser(page: Page) {
  const seed = createMockData();
  seed.onboarding = { completed: true };
  await page.addInitScript((data) => {
    const key = '@econimizou/finance';
    if (localStorage.getItem(key) !== null) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    data.transactions.forEach((transaction) => { transaction.date = date; });
    localStorage.setItem(key, JSON.stringify(data));
  }, seed);
}
