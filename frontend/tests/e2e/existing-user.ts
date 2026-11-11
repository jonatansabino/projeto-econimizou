import type { Page } from '@playwright/test';
import { createMockData } from '../../src/data/mock-data';
import { accountStorageKey } from '../../src/data/account-finance-repository';

export const TEST_API_URL = process.env.TEST_API_URL ?? 'http://127.0.0.1:8082';
export async function registerAccount(page: Page, name = 'Jonatan') {
  const headers = { Origin: 'http://127.0.0.1:8097', 'X-Auth-Client': 'web' };
  const csrfResponse = await page.request.get(`${TEST_API_URL}/api/auth/csrf`, { headers });
  if (!csrfResponse.ok()) throw new Error('Não foi possível preparar a API de teste.');
  const { csrf_token } = await csrfResponse.json();
  const credentials = { name, email: `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}@example.test`, password: 'RioVerde!7824#', password_confirmation: 'RioVerde!7824#' };
  const response = await page.request.post(`${TEST_API_URL}/api/auth/register`, { headers: { ...headers, 'X-CSRF-Token': csrf_token }, data: credentials });
  if (response.status() !== 201) throw new Error(`Falha de cadastro na API isolada: HTTP ${response.status()}`);
  const { user } = await response.json();
  return { ...credentials, user, key: accountStorageKey(TEST_API_URL, user.id) };
}

// Sessão real da API isolada; mocks financeiros são apenas fixtures locais de regressão.
export async function existingUser(page: Page) {
  const seed = createMockData(); seed.onboarding = { completed: true };
  const account = await registerAccount(page, seed.profile.name);
  await page.addInitScript(({ data, key }) => {
    if (localStorage.getItem(key) !== null) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    data.transactions.forEach((transaction) => { transaction.date = date; });
    localStorage.setItem(key, JSON.stringify(data));
  }, { data: seed, key: account.key });
  return account;
}
