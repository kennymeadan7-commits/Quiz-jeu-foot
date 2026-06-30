# Frontend web — Gestion des moyennes scolaires

Ce dossier contient le frontend React (Vite + TypeScript + Tailwind CSS)
pour l'application de gestion des moyennes du secondaire.

Version actuelle adaptée pour l'établissement **CEG 5 DOGBO**.

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxx

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Sans ces variables, l'application démarre quand même mais en mode local sans données distantes.

Avec ces variables, les formulaires CRUD (classes, élèves, matières, notes)
écrivent et suppriment réellement les données dans Supabase.
La récupération des élèves lit d'abord la table `eleves` (si disponible),
avec fallback automatique vers `students`.

Le formulaire d'ajout de classe propose désormais une liste prédéfinie
(6e A, 6e B, ..., Terminale A/B) à sélectionner.

## Vérifier que le projet compile

```bash
cd web
npm run build
```

## Fonctionnalités implémentées

- CRUD complet (Create, Read, Update, Delete) :
  - classes
  - élèves
  - matières
  - notes
- Dashboard enseignant/admin :
  - moyennes de classe
  - moyennes par élève
  - classement des élèves
- Règles métier :
  - note sur 20
  - gestion des notes manquantes via politique `ignore` / `zero`
- Export bulletin PDF par élève et période
- Fallback local si Supabase n'est pas configuré

## Vues SQL utilisées

- `v_student_averages`
- `v_class_averages`
- `v_student_ranking`
