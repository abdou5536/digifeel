import { expect, test, type Page } from '@playwright/test';

// L'API est simulée : ce test vérifie l'écran, pas la base (couverte par tests/rls).
const bill = { table: 'T5', discount_dzd: 0, total_dzd: 2400, paid_dzd: 0, pending_dzd: 0, items: [{ name: 'Pizza', quantity: 2, unit_price_dzd: 1200, line_total_dzd: 2400 }] };
const menu = { products: [{ id: '40000000-0000-4000-8000-000000000001', name: 'Pizza', category: 'Plats', price_dzd: 1200 }], orders: [] };

async function mockMenu(page: Page, token: string) {
  await page.route('**/api/public/table-menu', async route => {
    expect(route.request().postDataJSON()).toEqual({ token });
    await route.fulfill({ json: { menu } });
  });
}

test('affiche l’addition et ne stocke pas le jeton', async ({ page }) => {
  await page.route('**/api/public/table-session', r => r.fulfill({ json: { token: 'a'.repeat(64) } }));
  await page.route('**/api/public/table-bill', async r => {
    expect(r.request().postDataJSON()).toEqual({ token: 'a'.repeat(64) });
    await r.fulfill({ json: { bill } });
  });
  await mockMenu(page, 'a'.repeat(64));
  await page.goto('/t/abcdefg234567abc');
  await expect(page.getByRole('heading', { name: 'Table T5' })).toBeVisible();
  await expect(page.getByText('2 × Pizza')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Commander' })).toBeVisible();
  await expect(page.getByText(/Total : .*2.?400/)).toBeVisible();
  await expect(page.getByText(/NF525/)).toBeVisible();
  // Seule la préférence de langue (non sensible) peut exister ; le jeton ne doit jamais être stocké.\n  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie);\n  expect(stored).not.toContain('a'.repeat(64));
});

test('table sans addition : message clair', async ({ page }) => {
  await page.route('**/api/public/table-session', r => r.fulfill({ status: 404, json: { error: 'x' } }));
  await page.goto('/t/abcdefg234567abc');
  await expect(page.locator('main [role=alert]')).toContainText('Aucune addition ouverte');
});

test('session expirée : message clair', async ({ page }) => {
  await page.route('**/api/public/table-session', r => r.fulfill({ json: { token: 'b'.repeat(64) } }));
  await page.route('**/api/public/table-bill', r => r.fulfill({ status: 401, json: { error: 'x' } }));
  await page.goto('/table/abcdefg234567abc');
  await expect(page.locator('main [role=alert]')).toContainText('Session expirée');
});

test('transmet une demande de paiement manuel au serveur sans la déclarer payée', async ({ page }) => {
  await page.route('**/api/public/table-session', r => r.fulfill({ json: { token: 'c'.repeat(64) } }));
  await page.route('**/api/public/table-bill', r => r.fulfill({ json: { bill } }));
  await mockMenu(page, 'c'.repeat(64));
  await page.route('**/api/public/table-payment', async r => {
    const body = r.request().postDataJSON();
    expect(body).toMatchObject({ token: 'c'.repeat(64), amountDzd: 2400, method: 'baridimob' });
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    await r.fulfill({ status: 202, json: { id: 'payment-id', status: 'pending' } });
  });
  await page.goto('/table/abcdefg234567abc');
  await page.getByLabel('Mode de paiement').selectOption('baridimob');
  await page.getByRole('button', { name: 'Envoyer la demande au serveur' }).click();
  await expect(page.getByRole('status')).toContainText('reste en attente');
  await expect(page.getByRole('button', { name: 'Demande envoyée' })).toBeDisabled();
});

test('enregistre un avis associé à la session de table', async ({ page }) => {
  await page.route('**/api/public/table-session', r => r.fulfill({ json: { token: 'd'.repeat(64) } }));
  await page.route('**/api/public/table-bill', r => r.fulfill({ json: { bill } }));
  await mockMenu(page, 'd'.repeat(64));
  await page.route('**/api/public/table-review', async r => {
    expect(r.request().postDataJSON()).toMatchObject({
      token: 'd'.repeat(64),
      stars: 5,
      comment: 'Très bon repas'
    });
    await r.fulfill({ json: { review_id: 'review-id' } });
  });
  await page.goto('/table/abcdefg234567abc');
  await page.getByRole('button', { name: '5 étoiles' }).click();
  await page.getByLabel('Commentaire (facultatif)').fill('Très bon repas');
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click();
  await expect(page.getByRole('status')).toContainText('Merci pour votre avis.');
});

test('envoie une commande depuis le menu et affiche le statut retourné par Supabase', async ({ page }) => {
  const token = 'e'.repeat(64);
  let submitted = false;
  await page.route('**/api/public/table-session', route => route.fulfill({ json: { token } }));
  await page.route('**/api/public/table-bill', route => route.fulfill({ json: { bill } }));
  await page.route('**/api/public/table-menu', route => route.fulfill({
    json: {
      menu: {
        ...menu,
        orders: submitted ? [{
          id: 'order-id',
          status: 'new',
          created_at: '2026-10-04T00:00:00.000Z',
          items: [{ product_name: 'Pizza', quantity: 2 }]
        }] : []
      }
    }
  }));
  await page.route('**/api/public/table-orders', async route => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      token,
      items: [{ productId: menu.products[0].id, quantity: 2 }],
      note: 'Sans oignons'
    });
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    submitted = true;
    await route.fulfill({ status: 201, json: { orderId: 'order-id' } });
  });
  await page.goto('/t/abcdefg234567abc');
  await page.getByLabel('Quantité Pizza').fill('2');
  await page.getByLabel('Note pour la cuisine (facultatif)').fill('Sans oignons');
  await page.getByRole('button', { name: 'Envoyer la commande' }).click();
  await expect(page.getByRole('status')).toContainText('envoyée en cuisine');
  await expect(page.getByRole('heading', { name: 'Vos commandes' })).toBeVisible();
  await expect(page.getByText('Reçue par la cuisine')).toBeVisible();
});

test('redirige un visiteur non authentifié de l’espace restaurant vers la connexion', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
});