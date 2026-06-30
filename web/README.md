# Frontend web — Gestion des moyennes scolaires

Ce dossier contient le frontend React (Vite + TypeScript + Tailwind CSS)
pour l'application de gestion des moyennes du secondaire.

## Lancer l'application en local

```bash
cd web
npm install
npm run dev
```

Ensuite, ouvre l'URL affichée dans le terminal (en général : `http://localhost:5173`).

## Vérifier que le projet compile

```bash
cd web
npm run build
```

## Écrans déjà préparés

- Page d'accueil dashboard (prototype)
- Cartes de métriques de classe
- Sections/modules CRUD (Élèves, Classes, Matières, Notes)

## Prochaine étape

Brancher Supabase pour alimenter le dashboard avec les vues SQL :

- `v_student_averages`
- `v_class_averages`
- `v_student_ranking`
