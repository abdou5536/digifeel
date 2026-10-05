# DEPLOIEMENT.md — Cloudflare Workers + retour arrière

## Environnements
| Env | Où | Données | Variables |
|---|---|---|---|
| Développement | `npm run dev` | **fictives uniquement**, projet Supabase dédié | `.env.local` (jamais commité) |
| Test (preview) | Worker de préproduction Cloudflare | fictives, projet Supabase de test | secrets et variables de l'environnement de préproduction |
| Production | Cloudflare Workers + Static Assets | réelles | secrets et variables de production |

## En-têtes de sécurité
`public/_headers` définit les en-têtes des fichiers statiques servis par Cloudflare Workers Static Assets. Les réponses SSR/API du Worker ne passent pas par ce fichier : les mêmes en-têtes sont posés par `next.config.ts`, à partir de `src/config/securityHeaders.ts`. Le test `tests/security/headers.test.ts` vérifie leur cohérence. Limite connue : la CSP garde `'unsafe-inline'` pour les scripts (vinext injecte des scripts inline) ; le passage aux nonces est une amélioration à planifier.

## Webhooks Stripe (Edge Functions Supabase)
La fonction `supabase/functions/stripe-webhook/index.ts` vérifie la signature `Stripe-Signature`, puis appelle la RPC idempotente `settle_provider_payment`. Elle est déployée indépendamment du Worker applicatif :
```
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase functions deploy stripe-webhook
```
Configurez l'URL `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` dans Stripe et abonnez-vous aux événements `payment_intent.succeeded` et `payment_intent.payment_failed`. N'utilisez que des clés et événements Stripe TEST. Le webhook et la RPC existent, mais la création d'intentions Stripe n'est pas encore branchée au parcours client : le paiement par carte ne doit pas être présenté comme fonctionnel.

## Déployer
```
npm ci
npm run lint
npm test
npm run build:cloudflare
npm run deploy:cloudflare
```
La configuration `wrangler.jsonc` et les scripts `build:cloudflare` / `deploy:cloudflare` utilisent vinext pour déployer le Worker et ses assets statiques. Pour un nouveau poste/projet, installez la CLI Supabase puis créez un jeton localement (ne le collez pas dans le chat) :
```
npx supabase login
npx supabase link --project-ref <REF_DU_PROJET_DE_TEST>
```
Vérifiez soigneusement le ref : utilisez un projet de test, jamais la production, avant la validation des migrations. Après avoir lié le CLI au projet Supabase de l'environnement visé, appliquez les migrations :
```
npx supabase db push
```
Vérifiez les parcours après déploiement. Configurez séparément les secrets Cloudflare/Supabase et n'inscrivez jamais leurs valeurs dans Git.

Configurez notamment le secret applicatif qui sert au hachage des empreintes de limitation :
```
npx wrangler secret put RATE_LIMIT_PEPPER
```
La variable doit contenir une valeur aléatoire d'au moins 32 caractères et être identique sur les instances d'un même environnement.
Configurez aussi des règles de limitation Cloudflare pour `POST /api/public/table-session` et `POST /api/public/table-payment` afin de limiter l'ouverture automatisée de sessions et les demandes abusives. La limitation des avis est en plus vérifiée en base (6 par heure et empreinte).
Ajoutez également des règles pour `POST /api/public/table-orders` et `/api/public/table-orders/status` (ainsi qu'une protection adaptée pour `/api/public/table-menu`) : les RPC valident le jeton, le catalogue et les quantités, mais le rate limiting réseau protège contre les rafales de requêtes. Les statuts de commande sont actualisés toutes les 15 secondes tant qu'une commande est suivie.

Les commandes invitées sont créées par `submit_guest_table_order` dans la migration `202610120001_guest_table_orders.sql`. La transaction ajoute les articles au grand livre au prix courant du catalogue et crée la commande visible par la cuisine. Le retour arrière correspondant est `supabase/rollback/202610120001_guest_table_orders.down.sql` ; les commandes et articles déjà écrits sont conservés.

## Retour arrière
Les versions Worker précédentes sont conservées. Listez les déploiements, identifiez l'ID de la version à restaurer, puis créez un rollback :
```
npx wrangler deployments list
npx wrangler rollback <VERSION_ID>
```
Vous pouvez aussi ouvrir Cloudflare Dashboard → Workers & Pages → `digifeel` → Deployments et restaurer une version précédente. Vérifiez ensuite `/api/health` et les parcours d'authentification. Un rollback de code ne restaure PAS le schéma ni les données Supabase ; les migrations destructives nécessitent un script down relu et une sauvegarde. Voir [RESTAURATION.md](RESTAURATION.md).

## Surveillance
La route `GET /api/health` répond avec un statut JSON. À faire côté exploitation : créer une sonde externe sur `https://<domaine>/api/health` et configurer un outil de suivi d'erreurs. Aucun DSN Sentry n'est actuellement branché dans le code.