// Test de bout en bout contre le Supabase lié (.env). Comptes jetables, nettoyage final.
const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const { createClient } = require('@supabase/supabase-js');
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = () => createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
const stamp = Date.now();
const pw = 'Tmp-' + stamp + '-Aa1!';
let fails = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const created = { users: [], restaurants: [], chips: [] };

async function login(email) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error) throw new Error('login ' + email + ': ' + error.message);
  return c;
}

(async () => {
  try {
    // 1. Invitation propriétaire -> mot de passe (simule le clic sur l'e-mail)
    const ownerEmail = `owner-${stamp}@example.com`;
    const link = await admin.auth.admin.generateLink({ type: 'invite', email: ownerEmail, options: { data: { display_name: 'Resto Test' } } });
    check('invitation générée', !link.error, link.error?.message);
    const ownerId = link.data.user.id; created.users.push(ownerId);
    const inviteClient = anon();
    const verify = await inviteClient.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'invite' });
    check('lien d’invitation valide -> session', !verify.error && !!verify.data.session, verify.error?.message);
    const upd = await inviteClient.auth.updateUser({ password: pw });
    check('le restaurateur choisit son mot de passe', !upd.error, upd.error?.message);

    // 2. Provisionnement (comme POST /api/admin/restaurants)
    const slug = `test-${stamp}`;
    const prov = await admin.rpc('admin_provision_restaurant', { p_name: 'Resto Test ' + stamp, p_slug: slug, p_google_url: null, p_logo_url: null, p_owner: ownerId, p_tables: 3 });
    check('restaurant créé', !prov.error, prov.error?.message);
    const restId = prov.data; created.restaurants.push(restId);
    const prof = await admin.from('app_users').select('role,restaurant_id').eq('id', ownerId).single();
    check('propriétaire = restaurant_admin du bon restaurant', prof.data?.role === 'restaurant_admin' && prof.data?.restaurant_id === restId);
    const chips = await admin.from('chips').select('id,table_number,status').eq('restaurant_id', restId);
    check('3 tables/puces créées', chips.data?.length === 3);

    // 3. Connexion du restaurateur
    const owner = await login(ownerEmail);
    const mine = await owner.from('restaurants').select('id');
    check('restaurateur ne voit que son restaurant', mine.data?.length === 1 && mine.data[0].id === restId);
    const others = await owner.from('chips').select('restaurant_id');
    check('restaurateur ne voit aucune puce d’un autre restaurant', others.data?.every(c => c.restaurant_id === restId));
    const hijack = await owner.from('restaurants').update({ slug: 'hack' + stamp }).eq('id', restId);
    const slugNow = await admin.from('restaurants').select('slug').eq('id', restId).single();
    check('restaurateur ne peut pas changer son identifiant (réservé au propriétaire du logiciel)', slugNow.data.slug === slug, hijack.error?.message || '');
    const sub = await owner.from('subscriptions').update({ status: 'active' }).eq('restaurant_id', restId).select();
    check('restaurateur ne peut pas modifier son abonnement', !sub.data?.length);
    const role = await owner.from('app_users').update({ role: 'super_admin' }).eq('id', ownerId).select();
    const roleNow = await admin.from('app_users').select('role').eq('id', ownerId).single();
    check('restaurateur ne peut pas se promouvoir super-admin', roleNow.data.role === 'restaurant_admin', role.error?.message || '');
    const brand = await owner.from('restaurants').update({ brand_color: '#2fa38a' }).eq('id', restId).select();
    check('restaurateur peut changer sa couleur', brand.data?.length === 1, brand.error?.message || '');

    // 4. Scanner QR : puce libre
    const free = `${'a'.repeat(8)}-${'1'.repeat(4)}-${'2'.repeat(4)}-${'3'.repeat(4)}-${String(stamp).padStart(12, '0').slice(-12)}`;
    const ins = await admin.from('chips').insert({ id: free, activation_code_hash: 'f'.repeat(64), status: 'inactive' });
    check('puce vierge préparée', !ins.error, ins.error?.message); created.chips.push(free);
    const scan = await owner.rpc('scan_chip_table', { p_chip: free, p_name: 'Terrasse 1' });
    check('scan : table enregistrée', !scan.error && scan.data?.[0]?.created === true, scan.error?.message);
    const rename = await owner.rpc('scan_chip_table', { p_chip: free, p_name: 'Salon' });
    check('scan : table renommée', !rename.error && rename.data?.[0]?.label === 'Salon' && rename.data?.[0]?.created === false, rename.error?.message);
    const dup = await owner.rpc('scan_chip_table', { p_chip: chips.data[0].id, p_name: 'Salon' });
    check('scan : nom en double refusé', !!dup.error, dup.error?.code || '');
    const stranger = await admin.from('chips').select('id').neq('restaurant_id', restId).not('restaurant_id', 'is', null).limit(1);
    if (stranger.data?.[0]) {
      const steal = await owner.rpc('scan_chip_table', { p_chip: stranger.data[0].id, p_name: 'Vol' });
      check('scan : puce d’un autre restaurant refusée', !!steal.error, steal.error?.code || '');
    }
    const unknown = await owner.rpc('scan_chip_table', { p_chip: '00000000-0000-4000-8000-000000000000', p_name: 'X' });
    check('scan : QR inconnu refusé', !!unknown.error, unknown.error?.code || '');

    // 5. Compte serveur (comme POST /api/dashboard/servers)
    const srvEmail = `server-${stamp}@example.com`;
    const srvRow = await admin.from('servers').insert({ restaurant_id: restId, name: 'Serveur Test' }).select('id').single();
    const cu = await admin.auth.admin.createUser({ email: srvEmail, password: pw, email_confirm: true, user_metadata: { display_name: 'Serveur Test' } });
    check('compte serveur créé', !cu.error, cu.error?.message); created.users.push(cu.data.user.id);
    const none = await admin.from('app_users').select('id').eq('id', cu.data.user.id);
    check('sans le restaurateur, aucun profil (pas d’accès)', none.data?.length === 0);
    const up = await admin.from('app_users').upsert({ id: cu.data.user.id, role: 'server', restaurant_id: restId, server_id: srvRow.data.id, display_name: 'Serveur Test' }, { onConflict: 'id' });
    check('profil serveur rattaché', !up.error, up.error?.message);
    const server = await login(srvEmail);
    const sScan = await server.rpc('scan_chip_table', { p_chip: free, p_name: 'Pirate' });
    check('serveur ne peut pas scanner/renommer', !!sScan.error, sScan.error?.code || '');
    const sRest = await server.from('restaurants').select('id');
    check('serveur ne voit que son restaurant', sRest.data?.length === 1);
    const sUpd = await server.from('restaurants').update({ name: 'Hack' }).eq('id', restId).select();
    check('serveur ne peut pas modifier le restaurant', !sUpd.data?.length);
    const sSrv = await server.from('servers').insert({ restaurant_id: restId, name: 'Faux' }).select();
    check('serveur ne peut pas créer d’autres serveurs', !!sSrv.error || !sSrv.data?.length);

    // 6. Inscription libre impossible
    const su = await anon().auth.signUp({ email: `rogue-${stamp}@example.com`, password: pw });
    check('inscription publique refusée', !!su.error, su.error?.message || 'ATTENTION : signup ouvert');
    if (su.data?.user) created.users.push(su.data.user.id);
  } catch (e) {
    console.log('FAIL exception', e.message); fails++;
  } finally {
    for (const c of created.chips) await admin.from('chips').delete().eq('id', c);
    for (const r of created.restaurants) {
      await admin.from('app_users').delete().eq('restaurant_id', r);
      for (const t of ['reviews', 'dining_tables', 'chips', 'servers', 'subscriptions']) await admin.from(t).delete().eq('restaurant_id', r);
      const d = await admin.from('restaurants').delete().eq('id', r);
      if (d.error) console.log('nettoyage restaurant:', d.error.message);
    }
    for (const u of created.users) await admin.auth.admin.deleteUser(u);
    console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE');
    process.exit(fails ? 1 : 0);
  }
})();
