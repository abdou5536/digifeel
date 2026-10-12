# Déploiement Vercel + Supabase

La cible retenue pour le site est Vercel, avec Supabase pour Postgres et Auth. `vercel.json` configure le build Next.js. Les environnements de préproduction et de production doivent utiliser des projets Supabase distincts : les données de test ne doivent jamais rejoindre la production.

## 1. Vérifier avant déploiement

La CI GitHub exécute les contrôles TypeScript, les tests unitaires/RLS, le test de charge local, le build Next.js, les E2E Playwright et un audit des dépendances critiques. Les tests de base de données utilisent PGlite ; ils ne prouvent pas les limites de capacité, la disponibilité ni la restauration d'un projet Supabase hébergé.

Avant d'ouvrir l'inscription aux restaurants :

1. Importez le dépôt GitHub dans Vercel avec **Next.js** comme framework.
2. Ajoutez les variables de `.env.example` dans **Settings → Environment Variables**. Mettez les clés serveur uniquement dans Vercel, jamais dans des variables `NEXT_PUBLIC_*`.
3. Séparez les valeurs des environnements **Preview** et **Production**. Les previews utilisent le projet Supabase de test et une `APP_ORIGIN` de preview ; la production utilise exclusivement les clés et l'URL Supabase de production.
4. Configurez le domaine de production dans Vercel, puis réglez `APP_ORIGIN` sur son origine HTTPS exacte.
5. Dans Supabase → Authentication → URL Configuration, définissez le domaine de production et les URL de redirection autorisées nécessaires.
6. Reliez le CLI Supabase au projet de test, vérifiez le projet lié, puis appliquez les migrations :

   ```powershell
   npx supabase login
   npx supabase link --project-ref <REF_DU_PROJET_DE_TEST>
   npx supabase migration list
   npx supabase db push
   npx supabase migration list
   ```

   Répétez uniquement après validation sur le projet de test pour la production, en vérifiant le ref avant `db push`. Ne collez jamais un jeton ou un mot de passe dans le dépôt ou le chat.
7. Configurez SMTP, confirmation d'e-mail, récupération de compte, limites Auth et durées de session dans Supabase.
8. Créez le compte super-admin, puis exécutez `docs/TEST-MANUEL.md` avec des comptes et données de test avant la première vraie inscription.

Les pushes/merges Git vers la branche de production configurée créent un déploiement Vercel ; les autres branches peuvent créer des previews. Protégez `main` avec revue et vérifications CI obligatoires. Avant un déploiement de schéma, faites une sauvegarde et prévoyez un retour arrière compatible.

## 2. Variables et secrets

Les valeurs exactes obligatoires sont listées dans `.env.example`. En production, fournissez les variables Supabase publiques (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) et les secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `ACTIVATION_CODE_PEPPER`, `RATE_LIMIT_PEPPER`, `AUTH_BOOTSTRAP_TOKEN`). Les deux peppers doivent être des valeurs aléatoires distinctes d'au moins 32 caractères. Ne réutilisez jamais les clés du projet de test.

Les paramètres Stripe, e-mail, Google/Gemini ou BaridiMob sont facultatifs selon les fonctionnalités activées. Stripe reste désactivé tant que compte, webhook, conformité locale et encaissements de test n'ont pas été validés. `STRIPE_LIVE_PAYMENTS_ENABLED=true` ne doit être ajouté qu'après autorisation explicite et test réel contrôlé.

## 3. Webhook Stripe (facultatif)

La fonction `supabase/functions/stripe-webhook/index.ts` valide la signature Stripe et traite les événements de paiement/abonnement de façon idempotente. Déployez-la séparément sur le projet Supabase concerné et définissez son secret dans Supabase :

```powershell
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase functions deploy stripe-webhook
```

Configurez dans Stripe l'URL `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` et uniquement les événements nécessaires documentés dans `README.md`. Commencez avec des clés et webhooks TEST. Ne considérez pas un paiement comme validé avant confirmation par le webhook et vérification de l'écriture dans le journal.

## 4. Mises à jour de l'application Windows

Le client Electron ouvre le site HTTPS hébergé ; le site web est mis à jour par les déploiements Vercel. Les mises à jour du client Windows sont publiées dans les releases GitHub et proposées par `electron-updater`.

Pour une release Windows, incrémentez ensemble `version` dans `package.json` et `package-lock.json`, fusionnez le code validé dans `main`, définissez la variable GitHub Actions `DIGIFEEL_APP_URL` à l'origine HTTPS de production et poussez l'étiquette `v<version>` (par exemple `v1.0.1`). Le workflow `release-windows.yml` vérifie version, lint, tests, test de charge, build, E2E et vulnérabilités critiques avant de publier l'installateur et `latest.yml`. Il utilise le `GITHUB_TOKEN` limité au dépôt.

L'installateur n'est pas signé numériquement ; un certificat de signature de code Windows est nécessaire pour réduire les avertissements SmartScreen. Une mise à jour du client Electron n'annule pas un changement incompatible du schéma Supabase.

## 5. Retour arrière et sauvegarde

Pour revenir en arrière sur le site, utilisez **Vercel → Deployments → déploiement précédent → Instant Rollback**. Contrôlez ensuite le domaine de production et `GET /api/health`. Un rollback de code ne restaure pas le schéma ou les données Supabase ; ne rétrogradez pas le code si une migration destructive/incompatible a déjà été appliquée sans procédure de compatibilité.

Vérifiez sur le plan Supabase la fréquence et la rétention réelles des sauvegardes, puis effectuez une restauration complète sur un projet de test au moins avant lancement et périodiquement. La procédure est dans `RESTAURATION.md`. Les tests de chiffrement présents dans le dépôt ne remplacent pas un test de restauration hébergé.

## 6. Capacité et surveillance

Les requêtes métier filtrent par restaurant et s'appuient sur des index dédiés ; l'isolation RLS est testée. `npm run test:load` mesure localement une page indexée et un agrégat sur 100 000 avis répartis entre 5 000 restaurants. Ce test synthétique n'est pas un test de charge Vercel/Supabase et ne garantit ni un nombre maximal de restaurants, ni une capacité/latence en production.

Avant et après lancement, surveillez les erreurs de fonctions Vercel, la latence/connexions/quotas Supabase et les réponses de `GET /api/health`. Définissez une sonde externe, des alertes de quota et un plan d'augmentation des ressources Supabase à partir de mesures. Aucun Sentry n'est actuellement configuré. Les vérifications réelles du projet Supabase, du domaine, de la restauration, de l'e-mail et du matériel de caisse restent à effectuer dans les comptes du propriétaire.
