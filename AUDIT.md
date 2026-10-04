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

## 2. Décisions requises avant l'Étape 2

- **D1 — Source de vérité unique.** Pour 10 restaurants réels, les données doivent vivre côté serveur. Je recommande : **Supabase (architecture A) comme seule base**, migration des fonctions de l'architecture B (additions, avis, tables, menu, pourboires) vers des tables + RLS, et **retrait de l'architecture C** (Express) et de l'ancienne app Vite. C'est le chantier le plus long ; il conditionne tout le reste. Alternative minimale : ne mettre en production que les parcours déjà sur A (scan/avis/caisse/dashboard/admin) et masquer les autres (`/app`, `/t`) tant qu'ils ne sont pas migrés.
- **D2 — Hébergement cible** (Cloudflare/vinext, Vercel ou autre) pour fixer en-têtes, déploiement et rollback.
- **D3 — Rôles `cuisine` et `client anonyme`** : le schéma SQL actuel n'a que `super_admin`, `restaurant_admin`, `server`, `reseller` (`AppRole` dans `src/lib/supabase/auth.ts`). Il faut ajouter `cuisine`.

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
