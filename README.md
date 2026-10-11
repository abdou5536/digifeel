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
- `tests/` : tests Vitest, avec des fixtures synthétiques réservées aux tests et PGlite pour vérifier RLS et migrations.
- Rôles : `super_admin`, `restaurant_admin`, `server`, `kitchen` et `reseller`.
- Isolation : un restaurateur ne lit/écrit que les lignes de son `restaurant_id` (règles RLS, testées). Les mots de passe sont hachés par Supabase Auth (bcrypt). Les écritures sensibles passent par des fonctions SQL côté base.
- La création du restaurant démarre une période d’essai du tableau de bord de 30 jours. Pour imposer une expiration de session en production, configurez **Supabase > Authentication > Sessions** (durée maximale et inactivité) sur le projet déployé ; cette règle dépend de la configuration du projet, pas du dépôt, et les limites disponibles dépendent de l’offre Supabase.
- Les anciennes pages `/app/*` (localStorage) et le dossier `server/` (Express) sont conservés mais ne font pas partie du produit multi-restaurants (voir `AUDIT.md`).

## Lancer en local

Prérequis : Node 20+, un projet Supabase gratuit (voir Déploiement, étapes 1 à 3).

```powershell
npm install
Copy-Item .env.example .env      # puis remplir les clés Supabase dans .env
npm run dev                       # http://localhost:3000
```

Vérifications : `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`.

### Présentation vidéo du portfolio

Ouvrez `/portfolio`, puis choisissez **Télécharger la présentation vidéo**. Le navigateur prépare une vidéo d’environ 20 secondes et propose son téléchargement en MP4 s’il prend en charge cet encodage, sinon en WebM. La vidéo est générée localement dans le navigateur ; elle n’est pas envoyée à un service externe. Les chiffres d’illustration sont fictifs et les fonctions restant à finaliser sont signalées dans la présentation.

### Dossier client du portfolio

Dans `/portfolio`, le PDF complet et les exemples PDF/Excel sont téléchargeables séparément. Tous les chiffres des fichiers exemples sont fictifs. Pour (re)générer les trois fichiers proposés au téléchargement :

```powershell
npm run portfolio:build
```

Les fichiers sont écrits dans `public/portfolio-files/`. Le rapport de démonstration reprend les mêmes données et le même moteur PDF/Excel que les exports du logiciel ; il ne constitue pas un document fiscal et n’inclut pas de ventilation TVA.

## Application Windows

Digifeel pour Windows ouvre le site HTTPS hébergé du restaurant dans une fenêtre Electron sécurisée. L’URL est obligatoire : aucun domaine de production n’est défini dans ce dépôt. Cette enveloppe ne rend pas encore la caisse utilisable hors ligne ; elle affiche un message et propose une reconnexion en cas de coupure.

Pour tester l’application de bureau en développement, démarrez `npm run dev` dans un premier terminal, puis dans un second :

```powershell
npm run desktop:dev
```

Pour créer l’installateur Windows NSIS (Node.js 20+, dépendances installées, accès Internet et URL HTTPS du site) :

```powershell
$env:DIGIFEEL_APP_URL = "https://VOTRE-DOMAINE"
npm run dist:win
```

L’installateur et le désinstallateur sont générés dans `release/`. L’installation propose le dossier de destination et crée les raccourcis Démarrer et Bureau. La fenêtre se souvient de sa taille, et le menu **Affichage** permet le plein écran. Les mises à jour sont proposées depuis les versions publiées dans les releases GitHub de `abdou5536/digifeel` ; publier une version exige une release correspondante et un `GH_TOKEN` configuré de manière sécurisée dans l’environnement de publication. L’installateur local n’est pas signé : avant vente ou diffusion, il faut un certificat de signature de code Windows pour limiter les avertissements SmartScreen.

## Créer le premier super-administrateur

Créez un utilisateur avec son propre e-mail et un mot de passe fort dans Supabase Authentication > Users. Une fois l'utilisateur confirmé, exécutez cette requête dans le SQL Editor en remplaçant l'adresse :

```sql
update public.app_users
set role = 'super_admin', restaurant_id = null, server_id = null
where id = (
  select id from auth.users where lower(email) = lower('VOTRE_ADRESSE_EMAIL')
);
```

Vérifiez qu'une seule ligne a été modifiée. Les environnements de production ne doivent pas être alimentés par des comptes, restaurants ou ventes fictifs.

## Ajouter un restaurant

1. Connectez-vous en superadmin, ouvrez `/admin`.
2. Formulaire « Créer un restaurant » : nom, email du restaurateur, mot de passe provisoire, lien Google (facultatif, le restaurateur peut le coller lui-même), nombre de tables.
3. **Tarif d'installation QR : 9 € par table, en une fois** (nombre de tables × 9 €). Les puces NFC pour les serveurs sont facultatives et font l'objet d'un devis séparé. Le prix de référence est en euros ; toute conversion en dinars est indicative et doit être confirmée au moment de l'accord.
4. Pour chaque table, téléchargez le QR code (ou écrivez l'adresse `/r/<slug>/t/<n>` sur la puce NFC). « +5 tables » en ajoute d'autres ; « Désactiver » suspend le restaurant (avis refusés, dashboard bloqué).
5. Le restaurateur se connecte, colle son lien Google dans Réglages (et son logo, adresse https). Il peut aussi renseigner son RIP et son téléphone BaridiMob pour que les clients règlent leur addition.

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
4. **Auth** : Authentication > Providers > Email : gardez la confirmation des adresses e-mail activée en production.
5. **Remplir .env** :
   ```powershell
   Copy-Item .env.example .env
   notepad .env      # collez les 3 clés Supabase + deux secrets aléatoires
   ```
   Secret aléatoire : `[Convert]::ToBase64String((1..32 | % {Get-Random -Max 256}))`
6. **Tester le build** : `npm run build` doit finir sans erreur.
7. **GitHub** : poussez le projet (`git add . ; git commit -m "Digifeel multi-restaurants" ; git push`).
8. **Vercel** : vercel.com > Add New > Project > importez le dépôt GitHub. Framework : Next.js (détecté). Dans « Environment Variables », ajoutez toutes les variables obligatoires de `.env.example` (`APP_ORIGIN` = l'adresse Vercel finale, ex. `https://digifeel.vercel.app`). Cliquez Deploy.
9. **Redirections Auth** : Supabase > Authentication > URL Configuration : Site URL = votre adresse Vercel ; ajoutez `https://votre-site.vercel.app/**` dans Redirect URLs.
10. Créez le premier super-administrateur selon la procédure ci-dessus, puis ouvrez `https://votre-site.vercel.app/login`.

Ne déployez jamais le fichier `.env` : il est ignoré par git, les variables se saisissent dans Vercel. Le projet fournit aussi un déploiement Cloudflare (`DEPLOIEMENT.md`), plus complexe.

### Paiements des additions (sans abonnement client)

- **BaridiMob** : chaque restaurateur renseigne son RIP et, s’il le souhaite, son téléphone dans `/dashboard`. Le client effectue le transfert puis envoie une demande ; l’équipe vérifie la réception et confirme le paiement depuis la caisse. Cette étape est manuelle : Digifeel ne vérifie pas directement les virements.
- **Stripe** : ajoutez `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_EUR_TO_DZD` (taux explicite, DZD par EUR) et `APP_ORIGIN` dans l’environnement de déploiement. Déployez `supabase/functions/stripe-webhook` et configurez Stripe pour appeler `/functions/v1/stripe-webhook` avec les événements `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated` et `customer.subscription.deleted`. Les clés `sk_test_...` activent le mode test ; ne passez à `sk_live_...` qu’après validation, avec `STRIPE_LIVE_PAYMENTS_ENABLED=true`. Stripe encaisse en EUR ; vérifiez le taux affiché et les exigences de paiement applicables en Algérie avant l’activation réelle.

### Menus IA et abonnement de gestion

- L’abonnement IA et gestion coûte **19 € par mois**, sans période d’essai pour ces fonctions. Deux menus IA sont offerts ; chaque menu publié dispose de son propre lien public et d’un QR code téléchargeable. Une souscription payante active débloque les synthèses IA des ventes déjà saisies dans la caisse. L’essai du tableau de bord existant reste séparé.
- Le menu IA et l’assistant de gestion utilisent `GEMINI_API_KEY`. Les menus et leurs compteurs sont isolés par restaurant (RLS). La synthèse présente le chiffre d’affaires, les ventes et les annulations ; elle ne calcule pas les dépenses, marges, TVA ou déclarations et ne remplace pas une comptabilité certifiée.
- L’achat de l’abonnement passe par Stripe Checkout en EUR et ses méthodes disponibles selon le pays et le compte Stripe. Le webhook ci-dessus synchronise les statuts et Stripe Billing Portal permet au gérant de gérer sa souscription. BaridiMob reste un transfert manuel et ne prélève ni ne renouvelle automatiquement un abonnement.
- Avant toute activation en mode réel, configurez et testez le webhook et le portail client dans Stripe, puis vérifiez l’éligibilité du compte Stripe et les règles de paiement applicables à votre pays. Sans `GEMINI_API_KEY`, les fonctions IA affichent une erreur de configuration et ne facturent pas de génération.

## Ce qui fonctionne / reste à faire

Fonctionne : multi-restaurants isolés (RLS), comptes et rôles, superadmin (création, activation, tables/QR), liens `/r/<slug>/t/<n>`, avis + redirection Google, dashboard (avis, serveurs, exports Excel/PDF), menus IA partageables avec deux créations gratuites et QR téléchargeable, synthèse IA des ventes sur abonnement, paiements d’addition BaridiMob (manuel) et Stripe, souscription Stripe Checkout et webhook, installation QR à 9 € par table avec NFC sur devis séparé, portfolio avec dossier PDF complet et exemples PDF/Excel fictifs téléchargeables sur `/portfolio`.
À faire : validation du compte Stripe et des exigences locales avant encaissement réel, import en masse des puces NFC, unification/suppression des anciennes pages localStorage et du backend Express, onglets de dashboard séparés (tout est sur une page), mot de passe oublié.
## Déploiement sur Google Cloud Run

Prérequis : un projet Google Cloud avec facturation, et `gcloud` installé.

```bash
gcloud run deploy digifeel --source . --region europe-west1 --allow-unauthenticated \
  --set-build-env-vars NEXT_PUBLIC_SUPABASE_URL=...,NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=...,ACTIVATION_CODE_PEPPER=...,RATE_LIMIT_PEPPER=...,AUTH_BOOTSTRAP_TOKEN=...,APP_ORIGIN=https://VOTRE-URL
```

Préférez Secret Manager (`--set-secrets`) pour les clés secrètes. Une fois l'URL connue, mettez-la dans `APP_ORIGIN` et dans Supabase > Authentication > URL Configuration.
