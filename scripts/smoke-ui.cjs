const { chromium } = require('@playwright/test');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
(async () => {
  const b = await chromium.launch(); let fails = 0;
  const ok = (n, c, x = '') => { console.log(`${c ? 'OK  ' : 'FAIL'} ${n} ${x}`); if (!c) fails++; };
  for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(BASE + '/'); await p.waitForTimeout(2000);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${label} : pas de défilement horizontal`, sw <= 1, String(sw));
    await p.mouse.wheel(0, 2500); await p.waitForTimeout(1200);
    await p.screenshot({ path: `scripts/shot-${label}.png` });
    ok(`${label} : accueil sans erreur`, errs.length === 0, errs.join(' | ').slice(0, 300));
    for (const r of ['/login', '/avis', '/tarifs']) { const x = await p.goto(BASE + r); console.log(`     ${r} -> ${x.status()}`); }
    await ctx.close();
  }
  const c = await b.newContext(); const p = await c.newPage();
  for (const r of ['/caisse', '/dashboard', '/admin']) { await p.goto(BASE + r); await p.waitForTimeout(1500); const t = await p.innerText('body'); ok(`${r} sans connexion -> aucune donnée, invite à se connecter`, p.url().includes('/login') || /Se connecter/.test(t), p.url()); }
  const api = await p.request.post(BASE + '/api/admin/restaurants', { data: {} }); ok('API admin sans session refusée', [401, 403].includes(api.status()), String(api.status()));
  const api2 = await p.request.post(BASE + '/api/dashboard/tables/scan', { data: { chipId: '00000000-0000-4000-8000-000000000000', name: 'T1' } }); ok('API scan sans session refusée', [401, 403].includes(api2.status()), String(api2.status()));
  const api3 = await p.request.get(BASE + '/api/pos/sales'); ok('API ventes sans session refusée', [401, 403].includes(api3.status()), String(api3.status()));
  await b.close(); console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUT PASSE'); process.exit(fails ? 1 : 0);
})();
