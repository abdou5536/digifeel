# Test manuel Digifeel

À dérouler sur un restaurant de test (jamais sur un client réel), dans l'application installée ou avec `npm run dev`.
Cocher chaque ligne. Toute ligne qui échoue : noter l'écran, l'heure, et joindre le fichier journal (menu Aide > Ouvrir le dossier des journaux).

## 0. Préparation
- [ ] Les 6 migrations `supabase/migrations/2026101*` et `2026102*` sont appliquées, dans l'ordre.
- [ ] Un restaurant de test existe (devise EUR, puis refaire les points 4 à 7 avec un second restaurant en DZD).
- [ ] Un compte patron et un compte serveur existent pour ce restaurant.

## 1. Connexion et rôles
- [ ] Mauvais mot de passe : message clair, pas de blocage de l'écran.
- [ ] Patron : voit Caisse, Tables, Ventes, Menu, tableau de bord.
- [ ] Serveur : ne voit pas Menu, ni les réglages, ni les exports.
- [ ] Super-admin : voit tous les restaurants ; le patron d'un restaurant ne voit jamais les données d'un autre.

## 2. Licence
- [ ] Mois offert : le bandeau jaune apparaît quand il reste 7 jours ou moins.
- [ ] Super-admin > « Suspendre » : la caisse refuse une nouvelle vente avec un message d'abonnement.
- [ ] « +1 mois payé » : la vente repasse.

## 3. Menu et tables
- [ ] Menu : ajouter, modifier, désactiver un produit.
- [ ] Tableau de bord : la liste « Pour bien démarrer » se coche au fur et à mesure.

## 4. Scan et addition
- [ ] Ouvrir `/r/<slug>/t/<n>` (scan d'un QR ou d'une puce) : la bonne table s'ouvre.
- [ ] Ouvrir une table en caisse, ajouter des produits, changer les quantités, ajouter une note cuisine.
- [ ] Le total affiché est exact (remise éventuelle, TVA incluse dans le TTC).

## 5. Paiement
- [ ] Espèces : l'addition est soldée, un numéro de ticket continu est attribué.
- [ ] Carte : même chose.
- [ ] Paiement partagé entre deux personnes : la somme des parts égale le total.
- [ ] Pourboire : enregistré, absent du total du Z.
- [ ] Double clic rapide sur « Payer » : un seul paiement enregistré.
- [ ] Ticket imprimé en 80 mm, 58 mm puis A4 : nom du restaurant, date, numéro, total, TVA.

## 6. Avis et étoiles
- [ ] Scan client : avis et pourboire enregistrés, redirection vers Google.
- [ ] L'avis apparaît dans le tableau de bord du patron.

## 7. Annulation et journal
- [ ] Annuler une vente : une écriture inverse apparaît, la vente d'origine reste.
- [ ] Les numéros de ticket n'ont aucun trou.
- [ ] Après un Z, l'annulation d'une vente du jour est refusée.

## 8. Clôture
- [ ] Clôture de caisse : total par moyen de paiement correct, entrée dans l'historique des Z.
- [ ] Une seconde clôture le même jour est refusée.

## 9. Exports
- [ ] Export Excel du mois : ventes, TVA, moyens de paiement, avis, serveurs, scans, palier d'étoiles.
- [ ] Export PDF du mois : logo et nom du restaurant présents, mise en page propre.
- [ ] Choisir un mois précis du passé : les chiffres correspondent.

## 10. Sauvegarde et restauration
- [ ] Mettre la caisse hors ligne, enregistrer 2 ventes : elles apparaissent en attente.
- [ ] Rétablir Internet : les 2 ventes se synchronisent, sans doublon.
- [ ] Sauvegarde manuelle exportée ; vider les ventes locales ; restauration : elles reviennent.
- [ ] Un fichier de sauvegarde invalide est refusé avec un message clair.
- [ ] Le dossier des sauvegardes contient un fichier du jour (application installée).

## 11. QR et NFC
- [ ] Tableau de bord : PDF des QR codes, une page par table, le scan ouvre la bonne table.
- [ ] Téléphone Android avec Chrome : écrire une puce, la tester, la scanner.

## 12. Installation (Windows)
- [ ] L'installateur s'installe, crée le raccourci bureau, se lance.
- [ ] Une seconde ouverture réutilise la fenêtre existante.
- [ ] La taille de la fenêtre est retrouvée au prochain lancement.
- [ ] Sans Internet : message clair, pas d'écran blanc.
- [ ] Désinstallation propre depuis Windows.

## Résultat de la dernière exécution automatisée
Ce qui est vérifié par les tests automatiques (`npm test`) : règles d'isolation entre restaurants, journal et numérotation continue, annulation par écriture inverse, Z de caisse, licences, paiements d'addition, sauvegarde locale, 1 000 ventes (numérotation, chaîne du journal, clôture).
Ce qui ne l'est pas : tout l'affichage, l'impression, Stripe, Electron, le NFC, l'installateur. Ce sont les sections ci-dessus.
