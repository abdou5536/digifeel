# Politique de confidentialité (MODÈLE — à faire relire)
**Responsable du traitement :** [raison sociale, adresse, contact].
**Données collectées**
- Clients des restaurants : note, commentaire (facultatif), pourboire éventuel, empreinte technique d'appareil **pseudonymisée** (HMAC) servant uniquement à limiter les abus. Pas de nom ni d'e-mail requis.
- Restaurants : nom, adresse, comptes (e-mail), serveurs, produits, additions, paiements enregistrés.
- Menus IA : contenu de menu transmis par le gérant, texte structuré généré, lien public et nombre de menus créés. Le contenu publié est accessible à toute personne disposant du lien.
- Assistant de gestion IA : totaux agrégés de ventes, nombres de ventes et d'annulations, sans noms de clients ni détail individuel des tickets transmis au modèle.
**Finalités :** fournir le service, prévenir les abus, facturer, assurer la sécurité (journal d'activité).
**Base légale :** exécution du contrat ; intérêt légitime (sécurité) ; consentement pour les cookies non essentiels (aucun utilisé actuellement).
**Hébergement :** Supabase (base), Cloudflare (application) — [régions à confirmer].
**Sous-traitants :** Supabase, Cloudflare, Google (Gemini, uniquement à la demande pour générer les menus et les synthèses de ventes), Stripe (paiement par carte et abonnement, à activer après vérification du compte), [service e-mail].
**Droits :** accès, rectification, export, suppression : demande à [contact]. Un restaurant peut exporter ses données (fonction `export_restaurant_data`) ; la suppression d'un restaurant est faite par DIGIFEEL (`erase_restaurant`) après confirmation écrite.
**Conservation :** voir `retention-donnees.md`.
**IA :** les données fournies aux fonctions IA sont envoyées au service Gemini de Google pour produire le résultat demandé. Les synthèses d’activité sont indicatives, n’incluent pas le détail nominatif des ventes et ne constituent pas des écritures comptables certifiées.
**Sécurité :** chiffrement en transit (HTTPS/HSTS), accès cloisonnés par restaurant (RLS), journal d'activité, sauvegardes chiffrées.
**Consentement :** l'avis client est volontaire ; une mention d'information est affichée avant envoi [à intégrer dans /r et /t].