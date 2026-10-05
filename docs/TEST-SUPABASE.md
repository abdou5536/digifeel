# Projet Supabase de TEST — procédure (À FAIRE PAR VOUS, ~15 min)

Règle : ce projet ne contient que des données FICTIVES. Ne jamais y copier la base de production.

1. supabase.com → New project (nom `digifeel-test`, région proche). Noter le mot de passe de la base.
2. Installer la CLI : `npm i -D supabase` (déjà possible via `npx supabase`).
3. Lier et appliquer les migrations :
   ```
   npx supabase login
   npx supabase link --project-ref <REF_DU_PROJET_TEST>
   npx supabase db push
   ```
   Contrôle : dans l'éditeur SQL, `select count(*) from public.bills;` doit répondre 0 (sans erreur).
4. Créer `.env.local` (git-ignoré) avec l'URL, la clé `anon` et la clé `service_role` du projet TEST uniquement.
5. Déployer le webhook (clés Stripe TEST seulement) :
   ```
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. Vérifier la restauration (voir RESTAURATION.md) et noter date + résultat dans la table de RESTAURATION.md.
7. Dites-moi « projet de test prêt » : j'écris alors les tests de bout en bout réels (Playwright contre ce projet), puis l'écran client complet.

Retour arrière d'une migration : `supabase/rollback/<nom>.down.sql`, dans l'ordre inverse des migrations.