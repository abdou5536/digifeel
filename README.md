# Digifeel

Logiciel pour restaurants : le client scanne une puce NFC ou un QR code posé sur sa table, laisse un avis (enregistré dans l'application puis publié sur Google) et peut consulter/payer l'addition de sa table. Chaque restaurant dispose d'un espace isolé ; vous (superadmin) gérez tous les restaurants.

## Architecture

```
Client (NFC/QR)  ->  /r/<slug-restaurant>/t/<numero-table>
                          |  (retrouve la puce de la table)
                          v
                     /r/<id-puce>  : page d'avis -> enregistrement -> redirection vers Google

Navigateur ──> Next.js 16 (app/ pages + app/api/ routes) ──> Supabase (Postgres + Auth)
                 /login /dashboard (restaurateur, serveur)        RLS : chaque ligne porte restaurant_id,
                 /admin (superadmin)                              la base refuse l'accès aux autres restaurants
```

- `app/` : pages et routes API (Next.js). `src/components/next/` : interfaces (glassmorphism).
- `supabase/migrations/` : schéma complet, règles de sécurité (RLS) et fonctions. `supabase/rollback/` : retours arrière.
- `scripts/seed.mjs` : données de démo. `tests/` : tests (vitest, base PGlite pour tester RLS et migrations).
- Rôles : `super_admin`, `restaurant_admin`, `server` (+ `reseller`, `kitchen` existants).
- Isolation : un restaurateur ne lit/écrit que les lignes de son `restaurant_id` (règles RLS, testées). Les mots de passe sont hachés par Supabase Auth (bcrypt). Les écritures sensibles passent par des fonctions SQL côté base.
- Les anciennes pages `/app/*` (localStorage) et le dossier `server/` (Express) sont conservés mais ne font pas partie du produit multi-restaurants (voir `AUDIT.md`).

## Lancer en local

Prérequis : Node 20+, un projet Supabase gratuit (voir Déploiement, étapes 1 à 3).

```powershell
npm install
Copy-Item .env.example .env      # puis remplir les clés Supabase dans .env
npm run seed                      # crée superadmin + 3 restaurants de démo
npm run dev                       # http://localhost:3000
```

Vérifications : `npm run lint`, `npm test`, `npm run build`.

## Comptes de démo

Mot de passe de TOUS les comptes : `Demo-Digifeel-2026!`

| Rôle | Email | Accès |
|---|---|---|
| Superadmin | superadmin@digifeel.demo | /admin (tous les restaurants) |
| Admin – Le Comptoir d'Alger | admin@comptoir-alger.demo | /dashboard |
| Admin – Pizzeria Bella Vita | admin@bella-vita.demo | /dashboard |
| Admin – Café Oasis | admin@cafe-oasis.demo | /dashboard |
| Serveur | serveur@comptoir-alger.demo, serveur@bella-vita.demo, serveur@cafe-oasis.demo | /dashboard |

Liens publics à tester : `/r/comptoir-alger/t/1`, `/r/bella-vita/t/1`, `/r/cafe-oasis/t/1`.
Changez ces mots de passe avant toute utilisation réelle.

## Ajouter un restaurant

1. Connectez-vous en superadmin, ouvrez `/admin`.
2. Formulaire « Créer un restaurant » : nom, email du restaurateur, mot de passe provisoire, lien Google (facultatif, le restaurateur peut le coller lui-même), nombre de tables.
3. Pour chaque table, téléchargez le QR code (ou écrivez l'adresse `/r/<slug>/t/<n>` sur la puce NFC). « +5 tables » en ajoute d'autres ; « Désactiver » suspend le restaurant (avis refusés, dashboard bloqué).
4. Le restaurateur se connecte, colle son lien Google dans Réglages (et son logo, adresse https).

Comment obtenir le lien Google : fiche Google Business > « Demander des avis » > copier le lien.

## Déployer en démo (Vercel + Supabase, gratuits)

Choix : Next.js tourne nativement sur Vercel (zéro configuration serveur) et Supabase fournit base + authentification gratuites ; pas de backend séparé à maintenir.

1. **Supabase** : supabase.com > New project (région proche, notez le mot de passe de base). Attendez la fin de création.
2. **Clés** : Project Settings > API : copiez `Project URL`, `anon public` et `service_role`.
3. **Base** : installez le CLI puis appliquez les migrations (Project Settings > General donne la « Reference ID »).
   ```powershell
   npx supabase login
   npx supabase link --project-ref VOTRE_REFERENCE_ID
   npx supabase db push
   ```
   (Alternative sans CLI : SQL Editor > coller et exécuter chaque fichier de `supabase/migrations/` dans l'ordre des noms.)
4. **Auth** : Authentication > Providers > Email : pour la démo, désactivez « Confirm email » si vous voulez des inscriptions immédiates.
5. **Remplir .env** puis semer les données :
   ```powershell
   Copy-Item .env.example .env
   notepad .env      # collez les 3 clés Supabase + deux secrets aléatoires
   npm run seed
   ```
   Secret aléatoire : `[Convert]::ToBase64String((1..32 | % {Get-Random -Max 256}))`
6. **Tester le build** : `npm run build` doit finir sans erreur.
7. **GitHub** : poussez le projet (`git add . ; git commit -m "Digifeel multi-restaurants" ; git push`).
8. **Vercel** : vercel.com > Add New > Project > importez le dépôt GitHub. Framework : Next.js (détecté). Dans « Environment Variables », ajoutez toutes les variables obligatoires de `.env.example` (`APP_ORIGIN` = l'adresse Vercel finale, ex. `https://digifeel.vercel.app`). Cliquez Deploy.
9. **Redirections Auth** : Supabase > Authentication > URL Configuration : Site URL = votre adresse Vercel ; ajoutez `https://votre-site.vercel.app/**` dans Redirect URLs.
10. Ouvrez `https://votre-site.vercel.app/login` et connectez-vous avec un compte de démo.

Ne déployez jamais le fichier `.env` : il est ignoré par git, les variables se saisissent dans Vercel. Le projet fournit aussi un déploiement Cloudflare (`DEPLOIEMENT.md`), plus complexe.

## Ce qui fonctionne / reste à faire

Fonctionne : multi-restaurants isolés (RLS), comptes et rôles, superadmin (création, activation, tables/QR), liens `/r/<slug>/t/<n>`, avis + redirection Google, dashboard (avis, serveurs, exports Excel/PDF), seed de démo, 194 tests.
À faire : paiement en ligne réel et abonnements (Stripe/CCP présents mais non branchés à la démo), import en masse des puces NFC, unification/suppression des anciennes pages localStorage et du backend Express, onglets de dashboard séparés (tout est sur une page), mot de passe oublié.
## Déploiement sur Google Cloud Run

Prérequis : un projet Google Cloud avec facturation, et `gcloud` installé.

```bash
gcloud run deploy digifeel --source . --region europe-west1 --allow-unauthenticated \
  --set-build-env-vars NEXT_PUBLIC_SUPABASE_URL=...,NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=...,ACTIVATION_CODE_PEPPER=...,RATE_LIMIT_PEPPER=...,AUTH_BOOTSTRAP_TOKEN=...,APP_ORIGIN=https://VOTRE-URL
```

Préférez Secret Manager (`--set-secrets`) pour les clés secrètes. Une fois l'URL connue, mettez-la dans `APP_ORIGIN` et dans Supabase > Authentication > URL Configuration. Le lien de démo est ensuite `https://VOTRE-URL/r/comptoir-alger/t/1`.
