// Test navigateur de bout en bout (app locale + Supabase lié). Comptes jetables, nettoyage final.
const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('@playwright/test');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BASE = 'http://localhost:3000';
const stamp = Date.now();
const pw = 'Tmp-' + stamp + '-Aa1!';
let fails = 0; const users = []; let restId;
const check = (n, ok, x = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${n} ${x}`); if (!ok) fails++; };

async function ui(browser, email) {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', pw);
  await page.click('button[type=submit]');
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 });
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch();
  try {
    const ownerEmail = `owner-${stamp}@example.com`, srvEmail = `server-${stamp}@example.com`;
    const o = await admin.auth.admin.createUser({ email: ownerEmail, password: pw, email_confirm: true }); users.push(o.data.user.id);
    const r = await admin.rpc('admin_provision_restaurant', { p_name: 'Resto Test ' + stamp, p_slug: 'test-' + stamp, p_google_url: null, p_logo_url: null, p_owner: o.data.user.id, p_tables: 2 });
    restId = r.data; check('restaurant prêt', !r.error, r.error?.message);
    await admin.from('pos_products').insert({ restaurant_id: restId, name: 'Pizza Test', price_dzd: 1200 });

    // Le restaurateur crée un serveur via la vraie API (cookies de session du navigateur)
    const { ctx: oc, page: op } = await ui(browser, ownerEmail);
    check('restaurateur connecté -> ' + new URL(op.url()).pathname, !op.url().includes('/login'));
    const resp = await op.evaluate(async ([email, p]) => {
      const x = await fetch('/api/dashboard/servers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Serveur Test', email, password: p }) });
      return { status: x.status, body: await x.text() };
    }, [srvEmail, pw]);
    check('API : le restaurateur crée un serveur', resp.status === 201, resp.status + ' ' + resp.body.slice(0, 120));
    const su = await admin.from('app_users').select('id,role').eq('role', 'server').eq('restaurant_id', restId);
    if (su.data?.[0]) users.push(su.data[0].id);
    check('profil serveur créé', su.data?.length === 1);

    await op.goto(BASE + '/dashboard'); await op.waitForLoadState('networkidle');
    const dash = await op.content();
    check('dashboard : scanner QR présent', dash.includes('Scanner un QR code'));
    await oc.close();

    const { ctx: sc, page: sp } = await ui(browser, srvEmail);
    await sp.waitForLoadState('networkidle');
    check('serveur redirigé vers la caisse', new URL(sp.url()).pathname.startsWith('/caisse'), sp.url());
    const body = await sp.textContent('body');
    check('serveur voit le menu (Pizza Test)', body.includes('Pizza Test'));
    check('serveur ne voit pas Gestion ni Clôture Z', !/Gestion|Cl[ôo]ture/i.test(body));
    const forbidden = await sp.evaluate(async () => (await fetch('/api/dashboard/tables/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chipId: '00000000-0000-4000-8000-000000000000', name: 'x' }) })).status);
    check('API : le serveur ne peut pas scanner (403)', forbidden === 403, String(forbidden));
    await sp.goto(BASE + '/dashboard'); await sp.waitForLoadState('networkidle');
    check('serveur renvoyé hors du dashboard', !new URL(sp.url()).pathname.startsWith('/dashboard'), sp.url());
    await sc.close();

    const pub = await browser.newPage();
    await pub.goto(BASE + '/inscription'); await pub.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {}); check('/inscription -> /login', new URL(pub.url()).pathname === '/login', pub.url());
    const home = await pub.goto(BASE + '/'); check('accueil 200', home.status() === 200);
    const errors = []; pub.on('pageerror', e => errors.push(e.message));
    await pub.goto(BASE + '/'); await pub.waitForTimeout(2500);
    check('accueil sans erreur JS', errors.length === 0, errors.join(' | '));
  } catch (e) { console.log('FAIL exception', e.message); fails++; }
  finally {
    await browser.close();
    if (restId) {
      await admin.from('pos_products').delete().eq('restaurant_id', restId);
      await admin.from('app_users').delete().eq('restaurant_id', restId);
      for (const t of ['dining_tables', 'chips', 'servers', 'subscriptions']) await admin.from(t).delete().eq('restaurant_id', restId);
      const d = await admin.from('restaurants').delete().eq('id', restId); if (d.error) console.log('nettoyage:', d.error.message);
    }
    for (const u of users) await admin.auth.admin.deleteUser(u);
    console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE'); process.exit(fails ? 1 : 0);
  }
})();
