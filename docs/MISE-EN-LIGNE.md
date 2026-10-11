# Mise en ligne de Digifeel

Durée : environ 1 heure. Coûts : Supabase et Vercel ont une offre gratuite suffisante pour démarrer.

## 1. Base de données (Supabase)
1. Créez un projet sur supabase.com (région Europe).
2. Dans **SQL Editor**, exécutez **tous** les fichiers de `supabase/migrations/` dans l'ordre alphabétique (du plus ancien `202610020001_initial_schema.sql` au plus récent `202610240001_brand_color.sql`). Sans la dernière migration, la caisse ne se charge pas.
3. Dans **Project Settings → API**, notez l'URL, la clé `anon` et la clé `service_role` (secrète).

## 2. Hébergement (Vercel)
1. Poussez le projet sur GitHub, puis sur vercel.com : **Add New → Project** et choisissez le dépôt (Next.js est détecté).
2. Dans **Settings → Environment Variables**, renseignez au minimum :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ACTIVATION_CODE_PEPPER`, `RATE_LIMIT_PEPPER` : deux chaînes aléatoires de 32 caractères ou plus, différentes
   - `APP_ORIGIN` : l'adresse finale, par ex. `https://digifeel.votredomaine.com`
   - `AUTH_BOOTSTRAP_TOKEN` : long secret aléatoire, pour créer votre compte super-admin
   - `TRUST_PROXY_HOPS=1`
   Les autres (Stripe, SMTP, CCP…) sont facultatives. Voir `.env.example`.
3. Déployez, puis ajoutez votre domaine dans **Settings → Domains**.

## 3. Votre compte super-admin
Créez-le une seule fois avec le jeton `AUTH_BOOTSTRAP_TOKEN` (voir `README.md`), puis connectez-vous sur `/login`.

## 4. Créer un restaurant client
Depuis votre espace super-admin : nom, e-mail du patron, mot de passe (10 caractères minimum), devise, nombre de tables. Envoyez au patron l'adresse du site, son e-mail et son mot de passe. Il se connecte et configure lui-même :
- **Réglages** : logo, couleur de marque (ou photo du restaurant pour la déduire), TVA, lien Google.
- **Caisse → Produits** : import de la carte depuis un fichier Excel/CSV (colonnes nom, catégorie, prix).
- **Serveurs** : création d'un compte par serveur avec mot de passe (8 caractères minimum).

## 5. Tablettes et impression au comptoir
- Chaque serveur ouvre l'adresse du site sur sa tablette et se connecte avec son compte.
- Il ouvre une table, ajoute les plats, puis **Envoyer la commande au comptoir**.
- Sur le PC de la caisse, connecté en patron, cochez **Impression automatique au comptoir** : les tickets s'impriment tout seuls.
- Impression sans boîte de dialogue : avec l'application Windows Digifeel (installateur `npm run dist:win`, à définir avec `DIGIFEEL_APP_URL=https://votre-domaine`), qui imprime sur l'imprimante par défaut. Dans Chrome, lancez-le avec `--kiosk-printing`.
- La fenêtre de la caisse doit rester ouverte sur ce PC.

## 6. À tester avant le premier client
Créez un restaurant de test, puis suivez `docs/TEST-MANUEL.md` avec une vraie tablette et une vraie imprimante : ce parcours n'a pas été essayé sur du matériel réel.
