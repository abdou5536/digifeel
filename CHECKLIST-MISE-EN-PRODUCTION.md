# Checklist de lancement — Vercel + Supabase

## Validé dans le dépôt

- ✅ CI : vérification TypeScript, tests unitaires/RLS, test de charge local, build, tests E2E et audit des vulnérabilités critiques.
- ✅ Isolation RLS multi-restaurants testée en base locale ; couleur de marque enregistrée restaurant par restaurant et validée contre les accès croisés.
- ✅ Test synthétique local : 5 000 restaurants, 100 000 avis, parcours de lecture indexé et agrégat.
- ✅ Mise à jour Windows : workflow de release qui vérifie les contrôles avant la publication GitHub de l'installateur et de ses métadonnées d'auto-update.
- ✅ Palette de couleurs personnalisée/prédéfinie accessible depuis les réglages du restaurant et appliquée à la caisse.

Ces tests ne garantissent pas l'absence de bugs, ne mesurent pas un vrai projet Vercel/Supabase et ne certifient pas une capacité maximale en production.

## Bloquant avant les premiers vrais clients

- ⛔ Créer/valider un projet Supabase de test et un projet Supabase de production séparés ; relire les variables Vercel Preview/Production, domaines et URL de redirection Auth.
- ⛔ Appliquer les migrations sur le projet de test, valider le parcours complet, puis appliquer en production après une sauvegarde et la vérification du project ref.
- ⛔ Tester la restauration d'une sauvegarde sur un projet Supabase de test et consigner durée et résultats dans `RESTAURATION.md`.
- ⛔ Configurer Supabase Auth : SMTP, confirmation/récupération d'e-mail, limites de tentatives et durée de session.
- ⛔ Tester sur de vrais appareils la caisse, imprimante, réseau hors ligne, mise à jour Windows, parcours QR et comptes par rôle.
- ⛔ Valider les clés et les webhooks Stripe en mode TEST ; activer le mode réel uniquement après autorisation, accord explicite et confirmation de l'éligibilité du compte et des règles locales.
- ⛔ Configurer une sonde `/api/health`, alertes Vercel/Supabase, seuils de quotas et procédure de réponse aux incidents.
- ⛔ Activer les protections de branche GitHub et rendre les vérifications CI obligatoires avant fusion dans `main`.
- ⛔ Faire relire CGU, confidentialité, mentions légales et obligations fiscales locales par un professionnel ; compléter les informations de l'éditeur et les régions d'hébergement réelles.
- ⛔ Obtenir un certificat de signature Windows avant une large diffusion afin de réduire les alertes SmartScreen.

## Publication et montée en charge

1. Dans Vercel, déployer le site depuis Git avec des variables Preview reliées uniquement au projet Supabase de test, puis configurer les variables Production sur le projet de production.
2. Définir `DIGIFEEL_APP_URL` dans les variables GitHub Actions.
3. Après validation, incrémenter `version` dans `package.json` et `package-lock.json`, fusionner le code dans `main`, puis pousser l'étiquette `v<version>` pour publier le client Windows.
4. Observer les métriques et les erreurs pendant le pilote. Augmenter l'offre/ressources Supabase et Vercel selon les mesures avant d'ouvrir à davantage de restaurants. Le chiffre de 5 000 dans le test local est une dimension de données synthétiques, pas une promesse de capacité garantie.

Voir `DEPLOIEMENT.md` pour les procédures détaillées. Un déploiement ou une migration distante n'a pas été exécuté depuis cet environnement.
