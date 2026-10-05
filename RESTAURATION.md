# RESTAURATION.md — sauvegardes et reprise

## 1. Où sont les données
| Donnée | Emplacement | Sauvegarde actuelle |
|---|---|---|
| Base métier (restaurants, avis, ventes, commandes, comptes) | PostgreSQL Supabase (schémas `public`, `auth`) | **Dépend du plan Supabase — À FAIRE PAR MOI : vérifier** (Dashboard → Database → Backups : fréquence et conservation affichées ; le PITR est un module payant) |
| Fichiers | Supabase Storage (aucun bucket utilisé par le code actuel) | Inclus dans `scripts/backup.mjs` si des buckets existent |
| Code | GitHub | Historique git |
| Données `/app` et `/t` actuelles | `localStorage` des navigateurs (**non sauvegardables**, voir AUDIT.md) | Aucune — pages masquées en production |

## 2. Export complet chiffré (hors Supabase)
Prérequis : `pg_dump` (client PostgreSQL 15+), Node 22.
```
openssl rand -base64 32          # une seule fois ; stocker dans un gestionnaire de mots de passe, PAS dans git
$env:BACKUP_DB_URL="postgresql://postgres:<mdp>@db.<ref>.supabase.co:5432/postgres"
$env:BACKUP_DIR="D:\sauvegardes-digifeel"      # disque/cloud DIFFÉRENT de l'hébergeur
$env:BACKUP_ENCRYPTION_KEY="<clé base64>"
node scripts/backup.mjs
```
Résultat : `digifeel-<date>/database.dump.enc` (+ fichiers Storage `.enc`) + `manifest.json` (taille, SHA-256 du dump).
Fréquence recommandée : quotidienne ; conserver 7 quotidiennes + 4 hebdomadaires + 6 mensuelles. Planifier via le Planificateur de tâches Windows ou une GitHub Action (secrets du dépôt).
Le chiffrement (AES-256-GCM) est testé : `tests/security/backup-crypto.test.ts`.

## 3. Restauration pas à pas (sur un projet de TEST d'abord)
1. Créer un projet Supabase vide « digifeel-restore-test ».
2. Déchiffrer : `$env:BACKUP_ENCRYPTION_KEY="<clé>"; node scripts/restore-decrypt.mjs digifeel-<date>\database.dump.enc restore.dump`
3. Restaurer : `pg_restore --clean --if-exists --no-owner -d "<URL base de test>" restore.dump`
4. Appliquer les migrations manquantes dans l'ordre : `supabase/migrations/*.sql`.
5. Vérifier (voir §6) puis noter le résultat.

## 4. Si la base de production est supprimée
1. Ne rien relancer d'automatique ; basculer le site en maintenance (désactiver la route Cloudflare ou le déploiement).
2. Supabase → Backups : restaurer la dernière sauvegarde de l'hébergeur (ou PITR) ; sinon créer un nouveau projet et appliquer §3 avec la dernière sauvegarde chiffrée.
3. Mettre à jour `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dans Cloudflare, redéployer.
4. Les puces/liens QR ne changent pas (ils pointent vers le domaine du site, pas vers Supabase).

## 5. Si une migration échoue / retour arrière
- Avant toute migration en production : lancer `scripts/backup.mjs`.
- Les migrations sont exécutées dans une transaction par Supabase : un échec n'applique rien.
- Retour arrière d'une migration appliquée : script `supabase/rollback/<nom>.down.sql` (existant pour `202610050001_kitchen_role`, testé dans `tests/rls/rls-intrusion.test.ts`). Chaque nouvelle migration doit avoir son `.down.sql`.
- Si un `.down.sql` est impossible (perte de données) : restaurer la sauvegarde d'avant migration (§3).

## 6. Test de restauration — À FAIRE PAR MOI (tous les mois et avant la mise en production)
Après §3, vérifier : `select count(*) from public.restaurants;` `... from public.reviews;` `... from public.pos_sales;` (mêmes ordres de grandeur que la prod) et se connecter avec un compte de test.
Noter ci-dessous :
| Date | Sauvegarde utilisée | Durée | Lignes restaurants / avis / ventes | Résultat (OK/KO) | Par |
|---|---|---|---|---|---|
| | | | | | |

**État : la restauration n'a PAS été testée de bout en bout (pas de base Supabase accessible depuis cet environnement).** Seul le chiffrement/déchiffrement est testé automatiquement.