# Frontend web — Gestion des moyennes scolaires

Ce dossier contient le frontend React (Vite + TypeScript + Tailwind CSS)
pour l'application de gestion des moyennes du secondaire.

## Lancer l'application en local

```bash
cd web
npm install
cp .env.example .env.local
# puis renseigner les valeurs Supabase
npm run dev
```

Ensuite, ouvre l'URL affichée dans le terminal (en général : `http://localhost:5173`).

## Variables d'environnement

Créer `web/.env.local` :

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Sans ces variables, l'application démarre quand même mais en mode local sans données distantes.

Avec ces variables, les formulaires CRUD (classes, élèves, matières, notes)
écrivent et suppriment réellement les données dans Supabase.

Le formulaire d'ajout de classe propose désormais une liste prédéfinie
(6e A, 6e B, ..., Terminale A/B) à sélectionner.

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

## Prochaine étape

Brancher Supabase pour alimenter le dashboard avec les vues SQL :

- `v_student_averages`
- `v_class_averages`
- `v_student_ranking`
