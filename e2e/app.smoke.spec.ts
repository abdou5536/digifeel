import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('health endpoint reports the service as ready', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    service: 'digifeel'
  });
});

test('main public and cashier pages render without a blank screen', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const route of ['/', '/caisse', '/avis', '/portfolio']) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} should respond successfully`).toBe(true);
    await expect(page.locator('body')).not.toBeEmpty();
    expect((await page.locator('body').innerText()).trim(), `${route} should show content`).not.toBe('');
  }

  expect(pageErrors).toEqual([]);
});

test('portfolio renders and exports a downloadable presentation video', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/portfolio');
  const prepareVideo = page.getByRole('button', { name: 'Préparer et télécharger la présentation vidéo Digifeel' });
  await expect(prepareVideo).toBeVisible();
  await prepareVideo.click();

  const videoLink = page.getByRole('link', { name: /Télécharger la vidéo (MP4|WEBM)/ });
  await expect(videoLink).toBeVisible({ timeout: 45_000 });
  await expect(videoLink).toHaveAttribute('download', /^Digifeel-presentation-client\.(mp4|webm)$/);
  const [download] = await Promise.all([page.waitForEvent('download'), videoLink.click()]);
  expect(download.suggestedFilename()).toMatch(/^Digifeel-presentation-client\.(mp4|webm)$/);
  const videoPath = await download.path();
  expect(videoPath).not.toBeNull();
  const video = await readFile(videoPath!);
  expect(video.length).toBeGreaterThan(100_000);
  const isMp4 = video.toString('ascii', 4, 8) === 'ftyp';
  const isWebm = video.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  expect(isMp4 || isWebm).toBe(true);
});

test('portfolio provides the complete PDF and consistent report examples', async ({ page }) => {
  await page.goto('/portfolio');

  const samples = [
    { label: 'Télécharger le portfolio complet (PDF)', filename: 'Digifeel-Portfolio-client.pdf', signature: '%PDF' },
    { label: 'Exemple de rapport PDF', filename: 'Digifeel-rapport-client-exemple.pdf', signature: '%PDF' },
    { label: 'Exemple Excel', filename: 'Digifeel-rapport-client-exemple.xlsx', signature: 'PK' }
  ];

  for (const sample of samples) {
    const link = page.getByRole('link', { name: sample.label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('download', sample.filename);
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    expect(download.suggestedFilename()).toBe(sample.filename);
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const contents = await readFile(filePath!);
    expect(contents.length).toBeGreaterThan(1_000);
    expect(contents.toString('ascii', 0, sample.signature.length)).toBe(sample.signature);
  }

  await expect(page.getByText('Aperçu illustratif · chiffres fictifs')).toBeVisible();
});
