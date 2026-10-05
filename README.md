# DIGIFEEL

Plateforme restaurant : puces NFC / QR d'avis, caisse POS (DZD), tableau de bord, administration, revendeurs.

## État honnête
Voir [AUDIT.md](AUDIT.md) (§6 avancement) et [CHECKLIST-MISE-EN-PRODUCTION.md](CHECKLIST-MISE-EN-PRODUCTION.md).
**Ne pas ouvrir à de vrais clients tant que la checklist « bloquant » n'est pas terminée.**
Les pages `/app` racine, `/app/cuisine`, et `/table/[code]` utilisent Supabase. Les autres sous-pages `/app`, l'ancien `/t`, `/inscription`, `/revendeur`, `/admin/demo` dépendent encore du stockage navigateur et restent masquées (404) en production.

## Architecture cible
Next.js via vinext sur Cloudflare Workers + Static Assets et Supabase (PostgreSQL + RLS + Edge Functions). `server/` (Express) et l'ancienne app Vite restent présents jusqu'à la reprise de toutes leurs fonctions ; ne pas les supprimer avant.

## Démarrage
```
npm ci
copy .env.example .env.local   # données FICTIVES seulement, voir DEPLOIEMENT.md
npm run dev
```
## Contrôles
```
npm run lint        # types
npm test            # 150+ tests : RLS/intrusion, paiements, journal, droits des données, validation, signatures, en-têtes
npm run test:load   # 40 restaurants / 100 000 avis fictifs
npm run build
```
## Documentation
[DEPLOIEMENT.md](DEPLOIEMENT.md) · [RESTAURATION.md](RESTAURATION.md) · [docs/legal/](docs/legal/README.md)
Migrations : `supabase/migrations/` ; retours arrière : `supabase/rollback/`.