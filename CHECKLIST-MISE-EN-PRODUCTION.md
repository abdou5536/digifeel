# CHECKLIST-MISE-EN-PRODUCTION.md

Légende : ✅ vérifié (preuve dans AUDIT.md §6) · ⛔ à faire · 👤 action humaine.

## Bloquant (ne pas ouvrir à de vrais clients tant que ce n'est pas ✅)
- ⛔ Migrer addition / paiement / avis client (`/t`) puis `/app` vers Supabase ; retirer ensuite le drapeau (aujourd'hui masqués : ✅ 404 en production).
- ⛔ Paiements : Stripe en mode TEST derrière `PaymentProvider`, webhook signé, idempotence, grand livre, tests. 👤 Accord écrit avant tout mode réel.
- ⛔ Zod sur toutes les routes API, verrouillage après échecs, jeton `/t/:code`, journal d'activité, IP de confiance (proxy Cloudflare).
- ⛔ Tests E2E (Playwright) des parcours critiques.
- 👤 Restauration réelle chez l'hébergeur testée et notée (RESTAURATION.md §6) ; vérifier les sauvegardes Supabase (fréquence, PITR).
- 👤 Supabase Auth : activer e-mail de réinitialisation (SMTP), limite d'essais, durée de session, URL de redirection autorisées.
- 👤 Clés réelles dans Cloudflare (jamais dans git) ; faire tourner toute clé ayant déjà été partagée.
- 👤 Validation juridique de la confidentialité, des CGU, des mentions légales ; rappel « pas une caisse certifiée NF525 ».
- 👤 Protection de branche GitHub « CI obligatoire ».
- ⛔ Remplacer `xlsx` (haute, sans correctif) avant de réactiver les pages d'import/export Excel.

## Recommandé
- ⛔ Sentry (`SENTRY_DSN`) + alerte de disponibilité sur `/api/health` (👤 création des comptes).
- ⛔ Pagination + index et test de charge (40 restaurants, 100 000 avis).
- ⛔ CSP sans `'unsafe-inline'` (nonces).
- ⛔ Retrait d'Express (`server/`) après reprise de ses fonctions.
- ✅ Retour arrière de déploiement documenté (DEPLOIEMENT.md) — 👤 à essayer une fois en preview.

## Mise à jour (fin de session)
- **Bloquant, fait par moi :** voir AUDIT.md §7 à §H (grand livre, sessions client, droits des données, xlsx remplacé).
- **Bloquant, À FAIRE PAR VOUS :** projet Supabase de test (docs/TEST-SUPABASE.md), tests réels et restauration, config Supabase Auth (SMTP, verrouillage, durée de session), protection de branche GitHub, limite de débit Cloudflare sur `/api/public/*`, relecture juridique (`docs/legal/`), migration de `/t` et `/app` (pages masquées tant que non faite).
- **Recommandé :** Sentry + alerte `/api/health`, mise à jour de `vinext`, retrait d'Express après migration.
