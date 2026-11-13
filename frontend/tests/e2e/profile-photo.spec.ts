/// <reference types="node" />
import { expect, test, type Page, type FileChooser } from '@playwright/test';
import { resolve } from 'node:path';
import { existingUser, TEST_API_URL } from './existing-user';

const fixture = resolve('assets/images/icon.png');
const accounts = new WeakMap<Page, string>();
async function profile(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).profile, accounts.get(page)!);
}
async function edit(page: Page) {
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Editar Perfil', exact: true }).click();
}
async function menu(page: Page) { await page.getByRole('button', { name: 'Alterar foto de perfil', exact: true }).click(); }
async function upload(page: Page, file: Parameters<FileChooser['setFiles']>[0] | string = fixture) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher foto da galeria', exact: true }).click();
  await (await chooser).setFiles(file);
}
async function selectPhoto(page: Page) {
  await menu(page); await upload(page);
  await expect(page.getByRole('img', { name: 'Prévia da foto escolhida', exact: true }).locator('img')).toBeVisible();
  await page.getByRole('button', { name: 'Usar foto', exact: true }).click();
}
async function blobs(page: Page) {
  return page.evaluate(() => new Promise<{ key: string; type: string; size: number }[]>((resolve, reject) => {
    const request = indexedDB.open('economizou-profile-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result; const values: { key: string; type: string; size: number }[] = [];
      const cursor = db.transaction('photos').objectStore('photos').openCursor();
      cursor.onsuccess = () => { const row = cursor.result; if (row) { values.push({ key: String(row.key), type: row.value.type, size: row.value.size }); row.continue(); } else { db.close(); resolve(values); } };
    };
  }));
}

test.beforeEach(async ({ page }) => { const account = await existingUser(page); accounts.set(page, account.key); });

test('upload real normaliza JPEG, salva Blob por conta, persiste no reload e não envia imagens à API', async ({ page }, testInfo) => {
  const payloads: string[] = [];
  page.on('request', request => { if (request.url() === `${TEST_API_URL}/api/auth/profile`) payloads.push(request.postData() ?? ''); });
  await edit(page);
  const before = await profile(page);
  const finances = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('@econimizou/finance:account:'))!)!).transactions);
  await selectPhoto(page);
  expect(await profile(page)).toEqual(before);
  const draftImage = page.getByRole('img', { name: 'Prévia da imagem do perfil', exact: true }).locator('img');
  await expect(draftImage).toHaveJSProperty('naturalWidth', 512);
  await page.screenshot({ path: `test-results/profile-photo-draft-${testInfo.project.name}.png`, animations: 'disabled' });
  expect(await blobs(page)).toEqual([]);
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  const image = page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('img');
  await expect(image).toBeVisible();
  const saved = await profile(page);
  expect(saved.photoRef).toMatch(/^photo-/);
  const records = await blobs(page);
  expect(records).toHaveLength(1); expect(records[0].type).toBe('image/jpeg'); expect(records[0].size).toBeLessThanOrEqual(2 * 1024 * 1024);
  expect(records[0].key).toContain(saved.photoRef);
  expect(await image.evaluate((element: HTMLImageElement) => [element.naturalWidth, element.naturalHeight])).toEqual([512, 512]);
  await page.getByRole('tab', { name: 'Início', exact: true }).click();
  await expect(image).toBeVisible(); await page.reload(); await expect(image).toBeVisible();
  expect(payloads.length).toBe(1); expect(payloads[0]).not.toMatch(/photoRef|blob:|data:image|base64/);
  expect(await page.evaluate(() => localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('@econimizou/finance:account:'))!))).not.toMatch(/blob:|data:image|base64/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('@econimizou/finance:account:'))!)!).transactions)).toEqual(finances);
});

test('cancelar prévia, seletor e formulário não altera a foto; remoção restaura o último DiceBear', async ({ page }) => {
  await edit(page); await menu(page);
  await expect(page.getByRole('button', { name: 'Remover foto personalizada', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Escolher avatar', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher avatar Brisa', exact: true }).click();
  await page.getByRole('button', { name: 'Usar avatar', exact: true }).click();
  await selectPhoto(page);
  await page.getByRole('button', { name: 'Fechar Editar Perfil', exact: true }).click();
  expect((await profile(page)).photoRef).toBeFalsy(); expect(await blobs(page)).toEqual([]);
  await edit(page); await menu(page); await upload(page);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher foto da galeria', exact: true }).click();
  await (await chooser).setFiles([]);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  // Alguns navegadores emitem cancel, outros dependem do botão explícito.
  if (await page.getByRole('button', { name: 'Escolher foto da galeria', exact: true }).isVisible()) await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await menu(page); await page.getByRole('button', { name: 'Escolher avatar', exact: true }).click();
  await page.getByRole('button', { name: 'Escolher avatar Brisa', exact: true }).click(); await page.getByRole('button', { name: 'Usar avatar', exact: true }).click();
  await selectPhoto(page); await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('img')).toBeVisible();
  const saved = await profile(page);
  await edit(page); await menu(page); await page.getByRole('button', { name: 'Remover foto personalizada', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(await profile(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Remover foto personalizada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar remoção da foto', exact: true }).click(); expect(await profile(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('svg')).toBeVisible();
  expect((await profile(page)).avatar).toBe('dicebear:adventurer:2'); expect((await profile(page)).photoRef).toBeNull();
  await expect.poll(() => blobs(page)).toEqual([]);
});

test('rejeita arquivo inválido e acima de 10 MiB sem alterar o perfil', async ({ page }) => {
  await edit(page); const before = await profile(page); await menu(page);
  await upload(page, { name: 'invalido.png', mimeType: 'image/png', buffer: Buffer.from('<svg></svg>') });
  await expect(page.getByText('Use uma imagem JPEG, PNG ou WebP.', { exact: true })).toBeVisible();
  await upload(page, { name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(page.getByText('Escolha uma imagem de até 10 MB.', { exact: true })).toBeVisible();
  expect(await profile(page)).toEqual(before); expect(await blobs(page)).toEqual([]);
});

test('falha no IndexedDB preserva imagem anterior e permite tentar novamente', async ({ page }) => {
  await edit(page); const before = await profile(page); await selectPhoto(page);
  await page.evaluate(() => { Object.defineProperty(window, 'indexedDB', { configurable: true, get() { throw new Error('storage_denied'); } }); });
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toBeEnabled();
  expect(await profile(page)).toEqual(before);
  await expect(page.getByRole('textbox', { name: 'Seu nome', exact: true })).toBeVisible();
});

test('erro remoto reverte somente perfil local; foto anterior continua válida', async ({ page }) => {
  await edit(page); await selectPhoto(page); await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('img')).toBeVisible();
  const previous = await profile(page); await edit(page); await selectPhoto(page);
  await page.route(`${TEST_API_URL}/api/auth/profile`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'API indisponível para teste' }) }));
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByText('API indisponível para teste', { exact: true })).toBeVisible();
  expect(await profile(page)).toEqual(previous);
  await expect.poll(async () => (await blobs(page)).length).toBe(1);
  await page.getByRole('button', { name: 'Fechar Editar Perfil', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('img')).toBeVisible();
});

test('arquivo ausente usa fallback; referências de outra conta não revelam suas fotos', async ({ page }) => {
  await edit(page); await selectPhoto(page); await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('img')).toBeVisible();
  const saved = await profile(page);
  const account = await existingUser(page);
  await page.reload();
  await page.evaluate(({ key, ref }) => { const data = JSON.parse(localStorage.getItem(key)!); data.profile.photoRef = ref; localStorage.setItem(key, JSON.stringify(data)); }, { key: account.key, ref: saved.photoRef });
  // Outra conta do mesmo navegador aponta para o ID, mas não possui o Blob em seu escopo.
  await page.reload(); await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('svg')).toBeVisible();
});

test('imagem corrompida usa fallback e limpeza preserva referência ainda usada por outro perfil', async ({ page }) => {
  await edit(page); await selectPhoto(page); await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('img')).toBeVisible();
  await page.evaluate(async () => {
    const key = Object.keys(localStorage).find(key => key.startsWith('@econimizou/finance:account:'))!;
    const data = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(`${key}-outro-perfil`, JSON.stringify(data));
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('economizou-profile-photos', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result; const tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').put(new Blob(['corrompido'], { type: 'image/jpeg' }), `${key}|${data.profile.photoRef}`);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  });
  await page.reload(); await expect(page.getByRole('img', { name: 'Avatar de Jonatan', exact: true }).locator('svg')).toBeVisible();
  await page.getByRole('button', { name: 'Editar Perfil', exact: true }).click(); await menu(page);
  await page.getByRole('button', { name: 'Remover foto personalizada', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar remoção da foto', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar Perfil', exact: true })).toBeVisible();
  expect((await profile(page)).photoRef).toBeNull(); expect(await blobs(page)).toHaveLength(1);
});
