import { expect, test } from '@playwright/test';

test('opções sociais informam disponibilidade sem autenticar em login e cadastro', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/api/auth/')) requests.push(request.url()); });

  for (const screen of ['login', 'cadastro']) {
    if (screen === 'cadastro') await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click();
    await expect(page.getByText('ou continue com', { exact: true })).toBeVisible();
    for (const provider of ['Google', 'Outlook']) {
      const button = page.getByRole('button', { name: `Continuar com ${provider}`, exact: true });
      await expect(button).toBeVisible();
      await button.click();
      await expect(page.getByText(`Login com ${provider} estará disponível em breve.`, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('tab')).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});
