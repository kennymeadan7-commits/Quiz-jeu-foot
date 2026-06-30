# Frontend web — Gestion des moyennes scolaires

Ce dossier contient le frontend React (Vite + TypeScript + Tailwind CSS)
pour l'application de gestion des moyennes du secondaire, connecté à Firebase Firestore.

## Lancer l'application en local

```bash
cd web
npm install
cp .env.example .env.local
# puis renseigner les valeurs Firebase
npm run dev
```

Ensuite, ouvre l'URL affichée dans le terminal (en général : `http://localhost:5173`).

## Variables d'environnement

Créer `web/.env.local` :

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Sans ces variables, l'application démarre quand même mais en mode local sans données distantes.

Avec ces variables, les formulaires CRUD (classes, élèves, matières, notes)
écrivent et suppriment réellement les données dans Firebase Firestore.

## Vérifier que le projet compile

```bash
cd web
npm run build
```

## Écrans déjà préparés

- Page d'accueil dashboard (prototype)
- Cartes de métriques de classe
- Sections/modules CRUD interactifs (Élèves, Classes, Matières, Notes) en mode local
- Recalcul immédiat des moyennes de classe (T1)

## Collections Firestore utilisées

- `classes`
- `students`
- `subjects`
- `grades`
