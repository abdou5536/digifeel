# AUDIT DIGIFEEL — Étape 1 (lecture seule, aucune correction appliquée)

Date : 2026-10-04 · Branche : `chore/production-readiness-audit`
Méthode : lecture du code, des migrations SQL, `npm audit`, `curl` sur le serveur local, `git`. Rien n'a été modifié hors ce fichier.

Légende état : **NON CONFORME** (problème constaté, preuve donnée) · **PARTIEL** (existe mais incomplet) · **OK (vérifié)** (preuve donnée, sans prétendre à l'exhaustivité) · **NON VÉRIFIABLE** (nécessite une action humaine).

## 0. Constat structurant (à lire en premier)

Le dépôt contient **trois architectures différentes** qui coexistent :

| # | Architecture | Où | Données | Utilisée par |
|---|---|---|---|---|
| A | Next.js + **Supabase** (RLS, RPC `security definer`) | `app/api/**`, `supabase/migrations/**` | Base réelle multi-utilisateurs | `/login`, `/caisse` (hors démo), `/admin`, `/dashboard`, `/activate`, `/r/[chipId]`, API publique scan/avis |
| B | Services **100 % navigateur** (`localStorage`) | `src/services/restaurant.ts` (≈2 400 lignes) | Données **locales à chaque navigateur**, codes PIN en clair, comptes démo | `/app/**`, `/t/[code]` (addition client), cuisine, pourboires, fidélité, étoiles & primes, revendeurs (UI), `/admin/demo`, `/inscription` |
| C | **Express + PostgreSQL** (`pg`) + sessions + Stripe test | `server/index.ts` (≈1 500 lignes) | Base séparée (`DATABASE_URL`) | Ancienne app Vite (`src/App.tsx`, `dev:legacy`) |

**Conséquence :** aujourd'hui, les fonctions que le brief veut sécuriser (additions, paiements, primes, abonnements, revendeurs, scan `/t/:code`) vivent majoritairement dans l'architecture B, qui **n'a ni serveur, ni isolation entre restaurants, ni droits d'accès appliqués côté serveur**. Les règles « un restaurant ne voit jamais les données d'un autre » ne peuvent pas être vérifiées sur B car il n'y a pas de frontière serveur : chaque navigateur détient ses propres données. Ce n'est pas un bug à corriger ponctuellement ; c'est un **choix d'architecture à trancher avec vous** (voir section « Décisions requises »).

## 1. Tableau d'audit (classé par gravité)

| # | Point | État | Risque | Preuve | Correction proposée |
|---|---|---|---|---|---|
| 1 | Aucune donnée métier réelle possible dans `/app/**` et `/t/[code]` : tout est en `localStorage` | NON CONFORME | **Critique** | `src/services/restaurant.ts:414` (`STORAGE_KEY`), `:704`/`:810` lecture/écriture `localStorage` ; 11 composants `src/components/next/*` importent ce service | Migrer addition, lignes, avis, pourboires, tables, menu vers Supabase avec RLS (voir décision D1) |
| 2 | Paiements = **simulation** ; aucune route Stripe dans l'app Next (le webhook n'existe que dans l'ancien Express) | NON CONFORME | **Critique** | `src/services/paymentProvider.ts` renvoie `SIM-…` « paid » sans montant serveur ; `ls app/api` : aucune route `payments/` ; `.env.example` référence `/api/payments/stripe/webhook` qui n'existe pas côté Next | Étape 3 : provider Stripe **mode test**, montants serveur, idempotence, webhook signé, grand livre |
| 3 | PIN en clair et PIN prévisibles dans le code (`2025`, `2401`…) ; PIN généré par `Math.random()` | NON CONFORME | **Critique** (si B reste en prod) | `restaurant.ts:418-421`, `:561`, `:1695`, `:1969` | Supprimer avec la migration B→A ; auth Supabase uniquement |
| 4 | **Tout le projet est hors git** : `app/`, `src/lib`, `src/services`, `supabase/`, `proxy.ts`, `next.config.ts`… sont « non suivis » ; 65 fichiers modifiés/non suivis ; dernier commit = ancien Vite | NON CONFORME | **Critique** (aucun historique ni retour arrière possible) | `git status --short` → 65 entrées ; `git ls-files app` → 0 fichier ; `git log` : dernier commit « fix vite esbuild dependency » | Commits atomiques sur la branche (je les ferai en Étape 2, après votre accord) |
| 5 | **Aucun test automatique** (ni Vitest, ni Playwright), **aucune CI** | NON CONFORME | **Élevé** | Recherche `*.test.*`, `*.spec.*`, `vitest.config*`, `playwright.config*` : 0 résultat ; pas de dossier `.github/` ; `package.json` sans vitest/playwright | Étapes 5 et 6 |
| 6 | **Aucun en-tête de sécurité** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | NON CONFORME | **Élevé** | `curl -I http://localhost:3000/caisse` → aucun des en-têtes ; `next.config.ts` ne définit que `poweredByHeader:false` ; `public/_headers` ne contient que le cache | `headers()` dans `next.config.ts` + CSP testée |
| 7 | Dépendances vulnérables : **11 vulnérabilités (7 hautes)**, dont `xlsx` (prototype pollution + ReDoS, **pas de correctif**) | NON CONFORME | **Élevé** | `npm audit --omit=dev` → « 11 vulnerabilities (4 moderate, 7 high) » ; `xlsx : No fix available` | Remplacer `xlsx` par `exceljs`/export CSV ; mettre à jour le reste ; `npm audit` bloquant en CI |
| 8 | Pas d'**audit log** des actions sensibles (prix, lien Google, suppression, validation paiement, export) | NON CONFORME | **Élevé** | Aucune table `audit_log` dans `supabase/migrations/*` (19 tables listées, aucune d'audit) ; aucune écriture de journal dans `app/api/**` | Table `audit_log` + écriture via RPC dans chaque action sensible |
| 9 | Pas de **zod** : validation manuelle route par route | PARTIEL | **Moyen/Élevé** | `package.json` sans `zod` ; validations `typeof`/regex dans `app/api/**` (cohérentes mais non centralisées) | Schémas zod partagés ; refus des champs inconnus |
| 10 | **IP du client falsifiable** pour le rate limiting (`x-forwarded-for` pris tel quel) | NON CONFORME | **Élevé** | `src/lib/security.ts` : `cf-connecting-ip \|\| x-forwarded-for[0]` sans notion de proxy de confiance ; `TRUST_PROXY_HOPS` documenté dans `.env.example` mais **non utilisé** par ce fichier | Ne prendre l'IP que d'un proxy de confiance configuré ; limiter aussi par chip |
| 11 | Rate limiting : scan (40/60 s) et avis (6/h) via SQL ; **aucune limite** sur connexion/activation/POS/ventes côté Next | PARTIEL | **Élevé** | `initial_schema.sql:360` (scan), `:406` (avis) ; `app/api/chips/activate`, `pos/*`, `login` sans appel à `consume_rate_limit` | Étendre `consume_rate_limit` ; verrouillage après essais ratés (voir 13) |
| 12 | Pas de **suivi d'erreurs** ni d'alerte de disponibilité ; **pas de route `/api/health`** côté Next | NON CONFORME | **Élevé** | `curl /api/health` → 404 ; pas de `sentry` dans `package.json` | Sentry (DSN en variable d'env) + `/api/health` + sonde externe |
| 13 | Auth : verrouillage après échecs, réinitialisation e-mail, expiration de session | NON VÉRIFIABLE | **Élevé** | Dépend de la configuration du projet Supabase Auth (hébergé) : non lisible depuis le dépôt. Aucune page « mot de passe oublié » dans `app/` | **À FAIRE PAR MOI** : régler Supabase Auth (rate limits, durée JWT, SMTP) ; page de réinitialisation à créer |
| 14 | Sauvegardes : rien de documenté ni scripté ; aucun `RESTAURATION.md` | NON CONFORME | **Élevé** | Aucun fichier de ce type dans le dépôt ; pas de dossier `scripts/` | Étape 4 |
| 15 | Page `/t/:code` : pas de jeton de session lié à l'addition, ni expiration après paiement | NON CONFORME | **Élevé** | `app/t/[code]/page.tsx` passe le code brut à `GuestTableExperience` (service B) ; aucun jeton | Jeton signé lié à `bill_id`, TTL court, invalidé au paiement (après migration D1) |
| 16 | Export **Excel/PDF** : cohérence avec l'écran non testée ; `xlsx` vulnérable (cf. 7) | NON VÉRIFIABLE | **Moyen** | Utilitaires `src/utils/accountingExport.ts`, `pdfGenerator.ts` ; aucun test | Tests Vitest comparant totaux écran/export |
| 17 | Données personnelles en `localStorage` (avis, e-mails, restaurants, serveurs) | NON CONFORME | **Moyen/Élevé** | `src/context/AppContext.tsx:161-522` (≈12 clés dont `STORAGE_KEY_EMAIL_LOGS`, `STORAGE_KEY_WAITERS`, `STORAGE_KEY_REVIEWS`) | Disparaît avec la suppression de l'ancienne app (architecture C) |
| 18 | CORS / cookies : pas de politique CORS explicite côté Next ; cookies gérés par `@supabase/ssr` | PARTIEL | **Moyen** | Aucun `Access-Control-*` renvoyé (curl) ; options de cookies par défaut de `@supabase/ssr` (`src/lib/supabase/server.ts`) | Vérifier `Secure/HttpOnly/SameSite` en environnement HTTPS ; garder same-origin strict |
| 19 | Conformité : mentions NF525, règles de la prime, conservation, export/suppression RGPD | PARTIEL | **Moyen** | Mentions NF525 présentes dans `GuestTableExperience.tsx:48` et `HelpExperience.tsx:16` ; pas dans les **réglages** ; pas de fonction d'export/suppression de données ; modales `PrivacyPolicyModal`/`TermsOfServiceModal` à relire | Étape 7 + **validation par un juriste (À FAIRE PAR MOI)** |
| 20 | Trois environnements, `.env.example` complet | PARTIEL | **Moyen** | `.env.example` existe (clés Supabase, Stripe test, SMTP…) mais mélange variables des architectures A et C ; **`SENTRY_DSN`, `NEXT_PUBLIC_APP_ENV`… absentes** | Un fichier par environnement documenté |
| 21 | Performance : index présents sur colonnes principales, **pas de pagination** testée, pas de jeu de données de charge | PARTIEL | **Moyen** | Index : `initial_schema.sql:116-122`, `restaurant_pos.sql:87-91`, `reseller_portal.sql:87-90` ; `app/api/pos/sales` limite à 100 sans curseur ; aucun test avec 100 000 avis | Pagination par curseur + script de charge (40 restos / 100 k avis) |
| 22 | `vercel.json` obsolète (framework `vite`, sortie `dist`) alors que l'app est Next.js | NON CONFORME | **Moyen** | `vercel.json` : `"framework":"vite"`, rewrite global vers `index.html` — déploiement Vercel casserait les routes Next | Supprimer/adapter ; décider de la cible d'hébergement (Next/Cloudflare/Vercel) |
| 23 | Déploiement / retour arrière en une commande | NON CONFORME | **Moyen** | Scripts `deploy:vinext` seulement ; pas de procédure de rollback ; `wrangler.jsonc` non validé | Étape 6 |
| 24 | Secrets hors git | **OK (vérifié)** | — | `.env` ignoré (`.gitignore:11 .env*`) et non suivi (`git ls-files` → seul `.env.example`) ; `git grep` de `sk_live`, `whsec_`, JWT, `AIza…`, `BEGIN` : 0 secret (seul un garde `sk_test_` dans `server/index.ts:35`) | À maintenir : scan de secrets en CI |
| 25 | RLS activée sur **toutes** les tables Supabase | **OK (vérifié)** | — | 19 tables créées, 19 `enable row level security` ; policies : 12+3+5+12 ; fonctions publiques (`record_public_scan`, `submit_public_review`, `consume_rate_limit`) révoquées pour `anon/authenticated` et accordées à `service_role` | Prouver l'isolation par **tests d'intrusion automatisés** (Étape 2) : la présence d'une policy n'est pas une preuve de son exactitude |
| 26 | Routes serveur sensibles contrôlent le rôle côté serveur | **OK (vérifié partiel)** | — | `app/api/admin/*` : `role !== 'super_admin'` → 403 ; `pos/catalog` écriture : `restaurant_admin` seulement ; `/admin` : redirection serveur si non super-admin (corrigé précédemment dans cette session) | Couvrir par tests de rôles (serveur ≠ export/facturation, revendeur limité à ses clients) |
| 27 | Anti-injection / XSS | **OK (vérifié partiel)** | — | `git grep dangerouslySetInnerHTML` → 0 ; requêtes via client Supabase paramétré / RPC ; `isValidGoogleReviewUrl` liste blanche de domaines (`security.ts`) | CSP (point 6) pour défense en profondeur |
| 28 | Qualité statique | **OK (vérifié)** | — | `npm run lint` (tsc) : succès ; `npm run build` : succès (38 routes) | Garder bloquant en CI |
| 29 | Commission sur paiements désactivée | NON VÉRIFIABLE | — | Aucune logique de commission côté Next ; les commissions revendeurs existent côté SQL (`reseller_commissions`) | Test explicite en Étape 3 |

## 2. Décisions prises par le propriétaire (enregistrées)

- **D1 — Source de vérité unique : Supabase.** Migration des parcours `localStorage` vers Supabase, dans cet ordre : `/t` (scan, addition, paiement, avis), puis `/app` (Salle, avis, serveurs). Pendant la migration, `/app/**` et `/t/**` non migrés sont masqués derrière un drapeau de fonctionnalité (désactivé par défaut en production, 404). Express (architecture C) n'est retiré qu'une fois toutes ses fonctions reprises ; l'historique git est conservé.
- **D2 — Hébergement : Cloudflare Workers + Static Assets.** Décision mise à jour après vérification de compatibilité : l'application Next.js/vinext utilise SSR et des API ; sa configuration actuelle (`wrangler.jsonc`, `@vinext/cloudflare`) déploie un Worker, pas un site Pages statique. Déployer uniquement les assets Pages supprimerait le runtime SSR/API. Les en-têtes statiques sont définis via `public/_headers`, et les réponses SSR/API reçoivent les mêmes en-têtes via `next.config.ts`. Les webhooks Stripe sont gérés par les Edge Functions Supabase. La procédure de déploiement et de rollback est documentée dans `DEPLOIEMENT.md`.
- **D3 — Rôle `kitchen`** (cohérent avec `restaurant_admin`, `server`, `reseller`) : lecture des commandes de son restaurant et changement de statut uniquement. Migration avec retour arrière (down), politiques RLS et tests d'intrusion automatiques.

Impact sur le tableau : lignes 1, 15 (D1), en-têtes (D2, à vérifier sous `_headers` de Cloudflare et non `next.config.ts`), rôles (D3).
## 3. Ce que je ne peux pas vérifier seul (À FAIRE PAR MOI — liste provisoire)

- Réglages Supabase Auth (verrouillage, durée de session, SMTP, politique de mot de passe).
- Sauvegardes/PITR chez l'hébergeur de la base, et **test de restauration réel**.
- Clés Stripe de test, secret de webhook, et tout passage en mode réel (nécessite votre accord explicite).
- Relecture juridique (confidentialité, CGU, mentions légales, règles de la prime).
- Configuration DNS/HTTPS de production et alertes de disponibilité.

## 4. Score de départ (honnête)

Sur **29 points audités** : **3 conformes vérifiés** (24, 25, 28) + **2 conformes partiellement vérifiés** (26, 27) ; **6 partiels** (9, 11, 18, 19, 20, 21) ; **3 non vérifiables sans vous** (13, 16, 29) ; **15 non conformes** (1–8, 10, 12, 14, 15, 17, 22, 23). Score : **3 / 29 vérifiés pleinement** (5 / 29 en comptant les partiels vérifiés). **Le projet n'est pas prêt pour une exploitation réelle** dans son état actuel ; les points 1 à 5 sont bloquants.

## 5. Plan proposé pour l'Étape 2 (après votre accord)

1. Commiter l'état actuel en petits commits thématiques (point 4) — sans changer le comportement.
2. En-têtes de sécurité + `/api/health` + zod sur les routes existantes + correction du proxy IP.
3. Table `audit_log` + tests d'intrusion inter-restaurants (Vitest sur la base de test Supabase).
4. Selon D1 : migration progressive des parcours B vers A, un parcours par commit, avec test à chaque fois.

---

## 6. AVANCEMENT après accord (mise à jour)

| # | Point | Statut | Preuve / fichier |
|---|---|---|---|
| A1 | Rôle `kitchen` : lecture des commandes de son restaurant + statut seulement | **CORRIGÉ + VÉRIFIÉ** | `supabase/migrations/202610050001_kitchen_role.sql` ; `npm test` : 102 tests d'intrusion RLS (PostgreSQL réel via PGlite) passés ; test de mutation : retirer un filtre `restaurant_id` fait échouer 4 tests |
| A2 | Retour arrière de la migration | **VÉRIFIÉ** | `supabase/rollback/202610050001_kitchen_role.down.sql`, exécuté dans un test |
| A3 | Isolation restaurant A → B (lecture, modification, suppression, insertion : avis, ventes, tags, commandes, produits, serveurs) pour adminA, serverA, kitchenA, revendeur, anonyme | **VÉRIFIÉ** (sur les tables Supabase uniquement) | `tests/rls/rls-intrusion.test.ts` — **limite : paiements et additions n'existent pas encore côté Supabase** |
| A4 | Pages localStorage invisibles en production | **CORRIGÉ + VÉRIFIÉ** | `src/lib/features.ts`, `layout.tsx` de `/app /t /admin/demo /inscription /revendeur` ; `next build` + `next start` : ces 5 routes → 404, `/login` et `/caisse` → 200 |
| A5 | En-têtes CSP, HSTS, nosniff, Referrer-Policy, X-Frame-Options | **CORRIGÉ + VÉRIFIÉ** | `curl -I` sur le serveur de production local ; `public/_headers` pour les assets ; `_headers` ne couvre PAS le SSR (doc Cloudflare) → doublé dans `next.config.ts` ; `tests/security/headers.test.ts`. CSP garde `'unsafe-inline'` (limite connue) |
| A6 | `/api/health` | **CORRIGÉ** | `app/api/health/route.ts` (alerte externe : À FAIRE PAR MOI) |
| A7 | CI GitHub (lint, tests, build, audit critique) | **CORRIGÉ, non exécuté sur GitHub** | `.github/workflows/ci.yml` — la protection de branche est À FAIRE PAR MOI |
| A8 | Sauvegarde chiffrée + procédure | **CORRIGÉ, restauration NON testée** | `scripts/backup.mjs`, `RESTAURATION.md` ; chiffrement testé (`backup-crypto.test.ts`) ; `pg_dump` jamais lancé ici |
| A9 | Code Next dans git | **CORRIGÉ** | commit `24cb956` |
| A10 | `vercel.json` obsolète | **CORRIGÉ** (supprimé, historique conservé) | |

### Reste à faire (non commencé — ne PAS considérer comme fait)
1. **Migration `/t` puis `/app` vers Supabase** (D1) : additions, lignes, remises, division, paiements, avis, tables, serveurs. C'est le chantier principal ; tant qu'il n'est pas fait, ces pages restent masquées en production.
2. Étape 2 restante : zod sur toutes les routes, IP de confiance, rate limit/verrouillage, jeton `/t/:code`, journal d'activité, cookies/sessions, e-mail de réinitialisation.
3. Étape 3 : Stripe TEST + webhook Edge Function, grand livre, Baridi Pay, tests de paiement.
4. Étape 5 : Playwright E2E et tests métier (primes, abonnements, revendeurs, exports, FR/AR, clair/sombre).
5. Étape 6 : Sentry, pagination/index + test de charge (40 restaurants, 100 000 avis), remplacement de `xlsx` (vulnérabilité haute sans correctif, utilisée par les pages masquées), `vinext` (7 vulnérabilités hautes en cascade, correctif proposé = rétrogradation).
6. Étape 7 : conformité (confidentialité, CGU, mentions, export/suppression, NF525, règles de la prime).
7. Retrait d'Express (`server/`) après reprise de ses fonctions.

### Score honnête mis à jour
Points entièrement vérifiés : **7 sur 29** (3 au départ + A1, A3, A4, A5). Le produit **n'est toujours pas prêt pour 10 restaurants réels** : les parcours addition / paiement / avis client restent à migrer.

---

## 7. AVANCEMENT (suite)

| # | Point | Statut | Preuve / fichier |
|---|---|---|---|
| B1 | Grand livre : additions, lignes, paiements, événements, journal append-only ; montants calculés par la base, plafonnés au reste dû ; idempotence ; remboursement ; annulation ; pourboire ; paiement partiel ; montant falsifié ; aucune colonne commission | **CORRIGÉ + VÉRIFIÉ** (couche base de données) | `supabase/migrations/202610060001_billing_ledger.sql`, `tests/rls/billing.test.ts` (23 tests ; mutation : retirer le plafond fait échouer 3 tests). **Aucune route API ni UI ne l'appelle encore** |
| B2 | Journal d'activité (prix, lien Google, remise, paiement, remboursement, validation Baridi) | **CORRIGÉ + VÉRIFIÉ** (base) | mêmes fichiers ; lecture réservée admin du restaurant / super_admin |
| B3 | zod sur routes publiques avis + scan ; avis 1–5 sans filtrage | **CORRIGÉ + VÉRIFIÉ** | `src/lib/schemas.ts`, `tests/security/inputs.test.ts`. **Autres routes (admin, pos, dashboard, chips/activate) : NON faites** |
| B4 | IP de confiance (cf-connecting-ip ; x-forwarded-for seulement si `TRUST_FORWARDED_FOR=1`) | **CORRIGÉ + VÉRIFIÉ** | `src/lib/security.ts` |
| B5 | Webhook Stripe : signature HMAC vérifiée, dédoublonnage d'événements | **CORRIGÉ + VÉRIFIÉ (signature, RPC)** ; fonction Edge **non déployée, jamais appelée par Stripe** | `supabase/functions/stripe-webhook`, tests |
| B6 | Pagination/index + charge 40 restaurants / 100 000 avis | **VÉRIFIÉ** | `npm run test:load` : page de 50 avis 2,5 ms (index), agrégat 34 ms — PGlite local, pas la prod |
| B7 | Export et suppression de données d'un restaurant | **CORRIGÉ + VÉRIFIÉ** | `supabase/migrations/202610070001_data_rights.sql`, `tests/rls/data-rights.test.ts` (suppression : super_admin seul + confirmation ; B intact). Bug trouvé et corrigé : le journal append-only bloquait la suppression en cascade → exception limitée au détachement |
| B8 | Modèles juridiques, règles de la prime, rappel NF525, durées | **MODÈLES — À FAIRE RELIRE** | `docs/legal/`. Rappel NF525 **pas encore affiché dans l'interface** |
| B9 | README mis à jour | **CORRIGÉ** | `README.md` |

### Toujours NON fait
- Migration UI `/t` et `/app` vers Supabase (pages masquées en production).
- Stripe TEST (PaymentProvider reste une simulation), QR Baridi Pay côté interface.
- Playwright E2E et tests métier (primes, abonnements, revendeurs, exports, FR/AR, clair/sombre).
- Sentry, remplacement de `xlsx` et `vinext` (vulnérabilités hautes), retrait d'Express.
- Jeton de session `/t/:code`, verrouillage de connexion, e-mail de réinitialisation (réglages Supabase Auth : À FAIRE PAR MOI).
- Purge automatique selon les durées de conservation.

### Score honnête
Points entièrement vérifiés : **13 sur ~35** (7 précédents + B1, B2, B3, B4, B6, B7 ; B5 partiel). Résultat des tests : 151 réussis (+2 de charge). **Le produit n'est PAS prêt pour de vrais restaurants** : le parcours addition/paiement/avis client n'est pas migré.
### Mise à jour C (API additions)
| C1 | Routes serveur `/api/pos/bills` (ouvrir), `/items` (ajouter ; prix jamais lu du client), `/payments` (montant, pourboire, clé d'idempotence) appelant les RPC du grand livre, validées par zod | **CORRIGÉ**, schémas **VÉRIFIÉS** (`tests/security/billing-api.test.ts`) ; `next build` OK ; **routes non testées de bout en bout contre un vrai Supabase, aucune UI ne les utilise** |
| C2 | Stripe TEST : clé `sk_live_` refusée, idempotence, montant | **CORRIGÉ + VÉRIFIÉ** (unitaire, appel Stripe simulé) ; **non branché à la route (méthode `stripe` renvoie 501), aucun vrai appel Stripe fait** |

Total : 155 tests réussis. Score inchangé pour l'essentiel : **~14 sur ~35**. Les pages `/t` et `/app` restent masquées.
### Mise à jour D (constat sur le « reste »)
- **NF525 :** l'avertissement « pas une caisse certifiée NF525 » existe déjà (FR/AR/EN) sur le ticket `/t` et dans l'aide (`GuestTableExperience.tsx`, `HelpExperience.tsx`). Il n'est **pas** encore dans les réglages du restaurant.
- **Migration `/t` : NON faite, volontairement.** `GuestTableExperience.tsx` (634 lignes) dépend du « backend » localStorage `src/services/restaurant.ts` (menu, tables, codes de table, fidélité, commandes cuisine, avis) ; **le schéma Supabase n'a ni table de tables/codes QR, ni menu client, ni fidélité**. La migration demande d'abord un schéma (tables, jeton de session lié à l'addition, expiré au paiement), puis la réécriture de l'écran, et un test contre un vrai projet Supabase de test, que je n'ai pas. La faire à l'aveugle donnerait un écran non vérifié sur un parcours d'argent.
### Mise à jour E (décisions 1 et 2 de l'utilisateur)
| E1 | Schéma tables de salle + codes QR (16 car. aléatoires) + sessions client liées à UNE addition, jeton 256 bits stocké haché, expiration 4 h, fermée dès que l'addition n'est plus ouverte (jamais ressuscitée par un remboursement), isolation A/B | **CORRIGÉ + VÉRIFIÉ** (PGlite) | `supabase/migrations/202610080001_dining_tables_guest_sessions.sql`, `tests/rls/guest-sessions.test.ts` (9 tests dont retour arrière ; mutation : désactiver la fermeture de session fait échouer le test) |
| E2 | Routes `/api/public/table-session` et `/api/public/table-bill` (zod, no-store) | **CORRIGÉ**, schémas vérifiés ; **non testées contre un vrai Supabase** ; limitation de débit à configurer chez Cloudflare (**À FAIRE PAR MOI**) |
| E3 | Projet Supabase de test (demande 1) | **À FAIRE PAR MOI** : je ne peux pas créer de projet. Créez-en un vide, appliquez `supabase db push`, mettez URL + clé anon dans `.env.local` (jamais les clés de production). Le `.env` actuel n'a pas été utilisé par mes tests. |
| E4 | Écran `/t` (`GuestTableExperience.tsx`) | **TOUJOURS NON MIGRÉ** : manquent encore menu client, commandes cuisine liées à la table, fidélité, avis liés à l'addition. La page reste masquée en production. |

Total : 165 tests réussis. Score honnête : **~15 sur ~36**.
### Mise à jour F (écran client + E2E)
| F1 | Nouvelle page publique `/table/[code]` (Supabase uniquement : session → addition, jeton en mémoire, jamais stocké) ; l'ancien `/t` reste masqué | **CORRIGÉ + VÉRIFIÉ en production locale** : `/table/...` → 200, `/t/x` → 404, `/app` → 404. Fonctions de l'ancien `/t` **non reprises** : menu, commande cuisine, fidélité, avis, paiement carte |
| F2 | Playwright : 3 tests (affichage, table sans addition, session expirée ; jeton absent du stockage) | **VÉRIFIÉ**, mais **API simulée** : ne prouve pas l'intégration réelle avec Supabase. Ajouté à la CI (jamais exécutée sur GitHub) |

Reste non fait : projet Supabase de test (À FAIRE PAR MOI), E2E réels, avis/pourboire/paiement côté client, Sentry, xlsx/vinext, retrait d'Express.
Score honnête : **~17 sur ~38**.
### Mise à jour G
| G1 | Rappel « pas une caisse NF525 » + règle « aucune prime contre un avis Google, avis authentiques » dans les réglages réels du restaurant | **CORRIGÉ** (`RestaurantDashboard.tsx`) ; lint OK, **non vérifié visuellement ni par test E2E** |
| G2 | Paliers d'étoiles (limites exactes, prochain palier, progression, pas de mutation) | **VÉRIFIÉ** (`tests/security/tiers.test.ts`, 4 tests). La **validation avant facturation** et la liaison prime ↔ facturation n'existent pas côté Supabase : NON faites |
| G3 | zod sur chips/activate, dashboard/settings, pos/setup | **NON converti, décision** : ces routes valident déjà chaque champ à la main (longueurs, UUID, URL Google, booleen) ; les réécrire sans test d'intégration ajouterait un risque sans gain prouvé. Reste ouvert comme « validation manuelle, non testée automatiquement ». |

Total : 169 tests. Score honnête : **~18 sur ~38**.
### Mise à jour H (clôture de cette session)
| H1 | `xlsx` (SheetJS, vulnérabilité haute sans correctif) remplacé par `exceljs` via `src/lib/xlsxCompat.ts` ; neutralisation des formules (`=`, `+`, `-`, `@`) à l'export ; import CSV de secours | **CORRIGÉ + VÉRIFIÉ** : 4 tests (aller-retour, injection, CSV, fichier corrompu) ; lint et build OK ; `npm audit --omit=dev` : 11 → 12 vulnérabilités mais **7 → 6 hautes** (exceljs ajoute des alertes `uuid` modérées). **Téléchargement navigateur non testé** (pages masquées) |
| H2 | Retrait d'Express (`server/`) | **REFUSÉ volontairement** : conformément à D1 (« seulement quand toutes ses fonctions sont reprises »), ce n'est pas le cas : le serveur a sa propre authentification, invitations, CCP/Baridimob, e-mails, checkout pourboire, etc., non repris dans Next/Supabase. Il n'est pas déployé sur Cloudflare. À supprimer après la migration complète. |
| H3 | Sentry / suivi d'erreurs | **À FAIRE PAR MOI** : nécessite un compte et un DSN ; ne pas inventer une intégration non testable. Procédure : créer un projet Sentry, `npm i @sentry/nextjs`, `SENTRY_DSN` dans Cloudflare. Alerte de disponibilité : surveiller `/api/health` (UptimeRobot, gratuit). |
| H4 | `vinext` (6 vulnérabilités hautes restantes, correctif = rétrogradation cassante) | **NON corrigé** : à traiter avec une mise à jour planifiée de vinext, test de déploiement requis. |

### BILAN FINAL HONNÊTE
**Score : ~19 points vérifiés sur ~38.** 173 tests automatiques (+2 de charge) ; lint et build OK ; CI non exécutée sur GitHub.
**Vérifié :** isolation entre restaurants et rôles (dont `kitchen`) en base ; grand livre de paiement (idempotence, plafond, remboursement, pourboire, montant falsifié, pas de commission) ; sessions client liées à l'addition ; export/suppression de données ; entrées publiques (zod) ; signature du webhook ; en-têtes ; chiffrement de sauvegarde ; charge 100 000 avis ; paliers d'étoiles ; export Excel.
**Non vérifié / non fait :** tout test contre un vrai Supabase ; restauration de sauvegarde ; Stripe (aucun appel réel) ; écran client complet (menu, avis, pourboire, paiement) ; ancien `/t` et `/app` non migrés (masqués) ; Sentry ; Express ; verrouillage de connexion et e-mail de réinitialisation (réglages Supabase Auth) ; limitation de débit (Cloudflare) ; relecture juridique ; purge automatique des données.
**Risques restants, du plus grave au moins grave :** 1) parcours /t et /app non migrés ; 2) aucun test d'intégration réel ni de restauration ; 3) paiements non branchés à l'interface ; 4) vulnérabilités `vinext` ; 5) pas de surveillance d'erreurs ; 6) conformité juridique non validée ; 7) CSP avec `'unsafe-inline'`.

### Mise à jour I — décisions confirmées et état vérifié
- D2 est désormais **Workers + Static Assets** (confirmation du propriétaire) : c'est la cible compatible avec la configuration SSR/API actuelle. Le déploiement précédent et le rollback d'une version sont documentés dans `DEPLOIEMENT.md`.
- D1 : l'ancien `/t/**` et les sous-pages `/app/**` non migrées restent masqués en production. Leur ancien code repose sur `src/services/restaurant.ts` et n'est pas une source de vérité Supabase. Le nouveau `/table/[code]` est raccordé pour la session, l'addition, la demande de paiement manuel (en attente jusqu'à confirmation authentifiée) et les avis. `/app` (Salle/avis/serveurs) et `/app/cuisine` ont depuis été migrés (mise à jour J). **La migration fonctionnelle globale n'est pas terminée** : commandes/menu client, pourboires et activation restent non migrés ; conserver les gardes des sous-pages historiques.
- Le garde de routes n'accepte plus d'exception de variable d'environnement en production. Le mode de test local reste disponible en développement.
- D3 : la migration `202610050001_kitchen_role.sql`, son retour arrière et les tests RLS d'intrusion sont déjà présents. Ils couvrent la lecture des seules commandes de son restaurant et les transitions de statut autorisées, et interdisent les autres opérations. Ils doivent rester dans la suite CI.
- Nouveaux artefacts de l'étape 1 : `202610090001_guest_table_actions.sql` et son script down, les RPC publiques tokenisées et limitées aux paiements manuels, les API `/api/public/table-payment` et `/api/public/table-review`, la confirmation côté caisse, et les tests RLS/PGlite correspondants. Le script down supprime les avis de table associés à une session ; les exporter avant rollback.
- `supabase/functions/stripe-webhook` est implémentée et documentée ; toutefois, aucun flux de création d'intention Stripe n'est raccordé à l'écran client. Ne pas considérer le paiement carte comme opérationnel.
- Express n'est pas retiré : des fonctions sont encore dans `server/`. L'historique Git reste intact ; suppression à reporter jusqu'à la reprise et la validation de toutes ces fonctions.

### Mise à jour J — espace restaurant et cuisine Supabase
- `/app` racine est désormais un espace connecté qui lit et écrit dans Supabase : gestion des tables QR, ouverture d'additions, ajout d'articles au prix du catalogue, encaissement espèces, consultation/traitement persistant des avis, invitation/activation des serveurs. Les sous-pages qui restent dépendantes de `localStorage` demeurent gardées en production.
- `/app/cuisine` utilise maintenant les tables `table_orders` et `table_order_items`, actualise la liste côté serveur et ne propose que les transitions de statut kitchen autorisées. Les API refusent les autres rôles ; RLS et le trigger demeurent les protections de base.
- Migration supplémentaire `202610100001_review_management.sql` + rollback : statut de traitement des avis persistant et journalisé, gérant du restaurant ou serveur assigné seulement.
- Migration `202610110001_server_deactivation.sql` + rollback : la désactivation d'un serveur retire aussi ses droits applicatifs, pas seulement son affichage dans la liste.
- Vérifications locales : `npm test` (185 tests), `npm run lint`, build Workers et E2E (6 tests) réussis. Aucune connexion Supabase réelle n'a été faite : le CLI n'est pas installé et aucun projet n'était lié initialement. `supabase/config.toml` et les instructions de connexion à un projet de test sont maintenant présents dans `DEPLOIEMENT.md`. Ne pas lancer `db push` avant validation explicite du ref test par le propriétaire.

### Mise à jour K — commande client QR de table
- `/t/[code]` complète maintenant le parcours Supabase commencé avec la session, l'addition, le paiement manuel en attente et l'avis : le client consulte le catalogue actif de son restaurant, transmet une commande liée à sa session QR et suit les statuts renvoyés par la cuisine. Les pages `/t/[code]` et `/table/[code]` partagent le même écran Supabase.
- Migration `202610120001_guest_table_orders.sql` : RPC invitées à jeton, catalogue isolé au restaurant de l'addition, quantités et notes bornées, idempotence, insertion atomique de la commande et des lignes d'addition au prix serveur. RLS n'accorde aucun accès direct invité aux tables. Le retour arrière enlève les RPC et colonnes d'association, mais conserve les commandes et lignes historiques.
- Vérification locale ciblée : 5 tests PGlite couvrent prix, isolation par table, accès anonyme, statut cuisine, validation/idempotence et rollback ; aucun projet Supabase distant n'a été lié ou migré.
- Restent à migrer : pourboires, activation, fidélité et autres fonctions legacy. Express n'est pas retiré. Stripe carte demeure non connecté au parcours client.