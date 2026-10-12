import { expect, test, type Page } from '@playwright/test';

const tableCode = 'abcdefg234567abc';
const token = 'a'.repeat(64);
const bill = {
  table: 'T5',
  restaurant_name: 'Test Resto',
  currency: 'DZD',
  baridimob_rip: '007999990000000000000000',
  baridimob_phone: null,
  discount_dzd: 0,
  total_dzd: 2400,
  paid_dzd: 0,
  pending_dzd: 0,
  items: [{ name: 'Pizza', quantity: 2, unit_price_dzd: 1200, line_total_dzd: 2400 }]
};

async function mockTableBill(page: Page, stripeAvailable = false) {
  await page.route('**/api/public/table-session', async route => {
    expect(route.request().postDataJSON()).toEqual({ code: tableCode });
    await route.fulfill({ json: { token } });
  });
  await page.route('**/api/public/table-bill', async route => {
    expect(route.request().postDataJSON()).toEqual({ token });
    await route.fulfill({ json: { bill } });
  });
  await page.route('**/api/public/guest-payments', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          stripeAvailable,
          stripeMode: stripeAvailable ? 'test' : null,
          currency: 'EUR',
          eurToDzd: stripeAvailable ? 150 : null
        }
      });
      return;
    }
    await route.continue();
  });
}

test('affiche l’addition et ne stocke pas le jeton de session', async ({ page }) => {
  await mockTableBill(page);
  await page.goto(`/t/${tableCode}`);

  await expect(page.getByRole('heading', { name: 'Votre addition' })).toBeVisible();
  await expect(page.getByText('Test Resto')).toBeVisible();
  await expect(page.getByText('Pizza')).toBeVisible();
  await expect(page.getByText(/Reste à payer/)).toBeVisible();
  await expect(page.getByRole('button', { name: /BaridiMob/ })).toBeEnabled();

  const stored = await page.evaluate(() =>
    JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie
  );
  expect(stored).not.toContain(token);
});

test('envoie une demande BaridiMob qui reste en attente de vérification', async ({ page }) => {
  await mockTableBill(page);
  let submitted: unknown;
  await page.route('**/api/public/guest-payments', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { stripeAvailable: false, stripeMode: null, currency: 'EUR', eurToDzd: null } });
      return;
    }
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { paymentId: 'payment-id', status: 'pending_manual' } });
  });

  await page.goto(`/t/${tableCode}`);
  await page.getByRole('button', { name: /J’ai effectué le transfert/ }).click();

  await expect(page.getByRole('status')).toContainText('Demande BaridiMob envoyée');
  expect(submitted).toMatchObject({
    token,
    tableCode,
    amountDzd: 2400,
    tipDzd: 0,
    method: 'baridimob'
  });
  expect((submitted as { idempotencyKey?: string }).idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
});

test('redirige vers Stripe lorsque le serveur renvoie un lien Checkout', async ({ page }) => {
  await mockTableBill(page, true);
  let submitted: unknown;
  await page.route('**/api/public/guest-payments', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: { stripeAvailable: true, stripeMode: 'test', currency: 'EUR', eurToDzd: 150 }
      });
      return;
    }
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        paymentId: 'stripe-payment-id',
        checkoutUrl: 'https://checkout.stripe.com/c/pay/test-session'
      }
    });
  });
  await page.route('https://checkout.stripe.com/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<title>Stripe Checkout test</title>' })
  );

  await page.goto(`/t/${tableCode}`);
  await page.getByRole('button', { name: /Carte bancaire · Stripe/ }).click();
  await Promise.all([
    page.waitForURL('https://checkout.stripe.com/c/pay/test-session'),
    page.getByRole('button', { name: /Payer .* par carte/ }).click()
  ]);

  expect(submitted).toMatchObject({
    token,
    tableCode,
    amountDzd: 2400,
    tipDzd: 0,
    method: 'stripe'
  });
});
