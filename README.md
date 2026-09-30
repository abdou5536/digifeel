<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/21db5e81-574a-4abf-b24b-a6c256175147

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Installation et mode hors connexion

En production, ouvrez l’application sur une adresse HTTPS dans un navigateur compatible, puis choisissez **Installer** dans le menu de l’application. Sur iPhone ou iPad, ouvrez Digifeel dans Safari, touchez **Partager**, puis **Sur l’écran d’accueil**.

Après une première ouverture en ligne, l’application et ses fichiers principaux sont disponibles hors connexion. Les données restent stockées sur l’appareil; l’ouverture de Google nécessite une connexion Internet.

Pour tester la version de production en local, lancez `npm run build`, puis `npm run preview` et ouvrez l’adresse affichée par Vite.

## Partager les démonstrations

Les parcours de démonstration sont accessibles avec `?demo=dashboard` pour le tableau de bord et `?demo=server` pour l’espace serveur. Ils utilisent des données d’exemple et ne nécessitent pas de compte.

Pour publier l’aperçu sur Vercel, connectez le projet à votre compte puis lancez `npx vercel --prod` depuis la racine du projet. Les deux liens à partager sont `https://VOTRE-DOMAINE/?demo=dashboard` et `https://VOTRE-DOMAINE/?demo=server`. Cette configuration publie uniquement le front-end statique; l’API et les espaces privés ne sont pas déployés par cette configuration.

## API de connexion (fondation en cours)

Les vues de gestion nécessitent maintenant une session côté serveur. Le serveur d'authentification exige PostgreSQL; renseignez `DATABASE_URL`, `APP_ORIGIN`, `PORT` et un secret temporaire `AUTH_BOOTSTRAP_TOKEN` dans l'environnement. Ne publiez jamais ces valeurs.

Pour le développement, démarrez PostgreSQL, lancez `npm run api` dans un terminal, puis `npm run dev` dans un second terminal. Vite transmet `/api` au serveur local. Créez le premier super-administrateur une seule fois avec `POST /api/auth/bootstrap`, en envoyant `token`, `email` et un mot de passe d'au moins 14 caractères depuis la même origine. Supprimez ensuite `AUTH_BOOTSTRAP_TOKEN` de l'environnement et redémarrez l'API. Les sessions sont stockées côté serveur et le cookie est `HttpOnly`, `Secure` et `SameSite=Strict`.

Cette API ne migre pas encore les données métier existantes : restaurants, avis, réglages et coordonnées bancaires restent dans le stockage du navigateur. L'authentification ne constitue donc pas une isolation complète des données ni une autorisation serveur des opérations métier. Ne déployez pas la gestion multi-restaurant en production avant la migration de ces données vers l'API et l'application des permissions au niveau de chaque endpoint.

En production, faites servir le front-end et `/api` sous la même origine HTTPS via un reverse proxy configuré pour transmettre correctement l'origine et les en-têtes clients. `npm run preview` ne démarre que le front-end; il ne remplace pas l'API PostgreSQL.
