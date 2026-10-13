# Guide propriétaire Digifeel

## Où est l'application ?
- **Site web** : l'adresse Vercel (`APP_ORIGIN`). Fonctionne sur tablette, téléphone, PC. Sur Chrome/Edge/Safari : menu → « Installer l'application » (PWA).
- **Windows** : `npm run dist:win` crée l'installateur dans `dist/`. Ou la release GitHub (`v<version>`), voir `DEPLOIEMENT.md` §4.
- **Test local** : `npm run build` puis `npm run start` → http://localhost:3000 ; `npm run desktop:dev` pour la fenêtre Electron.

## Créer un compte (toi seul ouvres les accès)
1. Connecte-toi en super-admin → `/admin`.
2. « Créer un restaurant » + e-mail du restaurateur → il reçoit une invitation.
3. Il ouvre le lien, choisit son mot de passe (`/login?setup=1`).
4. Il crée ses serveurs dans Gestion (e-mail + mot de passe). Un serveur ne voit que la caisse/menu.
5. L'inscription publique est fermée : `/inscription` renvoie vers `/login`. Désactive aussi « Allow new users to sign up » dans Supabase → Authentication.

## Tables, QR et puces NFC
1. Achète des puces **NTAG213 ou NTAG215** inscriptibles.
2. Toi : ajoute les tables du restaurant (QR et puces générés).
3. Restaurateur, dans Gestion → « Scanner un QR code » : il scanne le QR collé sur la table, tape le nom (ex. « Terrasse 3 »), c'est enregistré. Re-scanner = renommer.
4. NFC : sur un téléphone Android avec Chrome, l'outil d'écriture de puce met l'adresse de la table sur la puce. Les clients approchent leur téléphone ou scannent le QR.
Ne remets les puces vierges qu'aux restaurants concernés.

## Annulation d'une vente
Annuler une vente (responsable seulement) affiche **un code à usage unique, une seule fois**. Il sert à confirmer ou contester l'annulation (5 essais max). Au-delà de 30 jours, seule l'admin du restaurant voit les ventes annulées. Le journal fiscal reste immuable : « contester » est enregistré à part.

## Couleurs
Gestion → Apparence : 16 couleurs + sélecteur libre ; le contraste s'adapte aux thèmes clair/sombre.
