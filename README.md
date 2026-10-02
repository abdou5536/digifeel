# Digifeel — Puces NFC & QR Codes pour Avis Clients & Pourboires Restaurant

Digifeel est une solution clé en main pour les restaurateurs et hôteliers permettant à leurs clients d’évaluer la prestation de service, d’attribuer des pourboires et de déposer un avis 5 étoiles sur Google Maps en moins de 3 secondes, sans installer d'application.

---

## 🌟 Fonctionnalités Clés

1. **Parcours Client 100% sans application (NFC & QR)** :
   - Scan direct d’une puce porte-clé serveur ou d’un chevalet de table QR via l’URL unique `/r/[chipId]`.
   - Évaluation instantanée avec étoiles illuminées, choix des compliments et pourboire libre.
   - Redirection 1-clic vers la fiche officielle Google Reviews pour maximiser le référencement local.

2. **Activation de Puce Sécurisée** :
   - Puce non activée : le scan ouvre directement l’interface d’activation avec le code imprimé (ex: `DF-8492-PARIS`).
   - Le restaurateur associe la puce à son établissement, configure son lien Google et l’assigne à un serveur ou une table.

3. **Dashboard Restaurateur Complet** :
   - **Accueil** : Compteurs animés en direct, note moyenne globale, scans du jour.
   - **Avis** : Flux d’avis en temps réel, analyse de sentiments et filtres par date.
   - **Serveurs** : Classement de l’équipe, notes individuelles et répartition intelligente des pourboires.
   - **Gestion & Exports** : Exports comptables officiels en PDF et tableur Excel (CSV).

4. **Portail Super-Administrateur** :
   - Pilotage de l'ensemble des restaurants et hôtels clients.
   - **Générateur de Lots de Puces NFC** : Génération de séries (10, 20, 50, 100 puces) avec codes d'activation uniques et export CSV pour machine d'encodage usine.

5. **Architecture Paiement & Abonnements Modulaire (`paymentProvider`)** :
   - Pack d’installation à **100 €** (compte admin + matériel + 1er mois offert).
   - Abonnement Pro à **29 € / mois** (ou 4 500 DZD) pour les exports illimités.
   - Abstraction prête pour **Stripe** (France/CB Visa) et **BaridiMob / Algérie Poste CCP**.

6. **Bilingue & Support RTL** :
   - Français et Arabe (العربية) intégrés avec bascule instantanée et gestion directionnelle RTL fluide.

---

## 🚀 Lancement du Projet

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrage du serveur unifié (Front-End Vite + API Express sur le port 3000)
```bash
npm run dev
```

L'application démarre sur `http://localhost:3000`.

### 3. Variables d'environnement optionnelles (`.env`)
```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/digifeel
AUTH_BOOTSTRAP_TOKEN=digifeel-admin-bootstrap-token
STRIPE_SECRET_KEY=
BARIDIMOB_RIP=00799999001234567899
```
*Note : Si aucune base de données PostgreSQL n'est connectée, Digifeel fonctionne automatiquement en mémoire avec des données de démonstration réalistes.*

---

## 🏷️ Guide d'Encodage des Puces Physiques NFC (NTAG 213 / 215 / 216)

Pour programmer les puces NFC physiques ou badges serveurs avec l'application :

1. **Matériel requis** :
   - Puces ou cartes NFC standards **NTAG213**, **NTAG215** ou **NTAG216** (13.56 MHz).
   - Un smartphone compatible NFC (iPhone sous iOS 13+ ou Android).
   - L'application gratuite **NFC Tools** (App Store / Google Play Store).

2. **Étapes d'encodage** :
   1. Ouvrez l'application **NFC Tools** sur votre smartphone.
   2. Allez dans l'onglet **Écrire** (Write) ➔ **Ajouter un enregistrement** (Add a record).
   3. Choisissez **URL / URI**.
   4. Saisissez l'URL de la puce :
      ```
      https://votre-domaine.com/r/chip-df-8492
      ```
      *(ou `https://votre-domaine.com/?chip=chip-df-8492`)*
   5. Cliquez sur **Écrire** (Write) et approchez la puce NFC du haut de votre téléphone.
   6. La puce émet un son de validation : elle est désormais prête à être scannée par vos clients !

---

## 📂 Structure du Projet

- `server.ts` : Point d'entrée serveur unifié Express + Vite middleware.
- `server/` :
  - `database.ts` : Connecteur PostgreSQL + Fallback Store In-Memory.
  - `chipService.ts` : Résolution des scans, générateur de lots & protection anti-spam.
  - `paymentProvider.ts` : Couche d'abstraction modulaire Stripe & BaridiMob.
  - `index.ts` : Routes API REST (`/api/auth`, `/api/r/:chipId`, `/api/reviews`, `/api/chips/activate`, etc.).
- `src/` :
  - `components/` :
    - `NfcHero3D.tsx` : Hero 3D immersif avec ondes électromagnétiques réactives.
    - `InteractivePhoneDemo.tsx` : Simulateur d'expérience client interactif.
    - `ChipActivationView.tsx` : Page d'activation pour puce scannée non enregistrée.
    - `CustomerRatingView.tsx` : Parcours d'évaluation & bouton Google Reviews direct.
    - `ManagerDashboard.tsx` : Dashboard restaurant (Avis, Serveurs, Exports).
    - `SuperAdminPortalView.tsx` : Gestion globale & générateur de lots de puces.
    - `Navbar.tsx` & `Footer.tsx` : Navigation futuriste et sélecteur FR / AR.
  - `utils/` :
    - `i18n.ts` : Traductions complètes Français / Arabe avec support RTL.
    - `accountingExport.ts` : Moteurs d'export PDF & Excel CSV.
    - `soundEffects.ts` : Retours sonores haptiques Web Audio.
