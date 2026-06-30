# Moyennes Scolaires — Secondaire

Application web pour gérer et calculer les moyennes scolaires (collège / lycée).

## Stack

- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS
- **Base de données** : Supabase (PostgreSQL + Auth)
- **État serveur** : TanStack Query

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Configurer Supabase
cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# Lancer le serveur de développement
npm run dev
```

## Base de données

Les migrations Supabase se trouvent dans `supabase/migrations/`.

```bash
# Avec la CLI Supabase installée
supabase db push
supabase db execute --file supabase/seed.sql   # données de démo
```

### Tables principales

| Table | Description |
|-------|-------------|
| `school_years` | Années scolaires |
| `academic_periods` | Trimestres / semestres |
| `classes` | Classes (6ème A, 3ème B…) |
| `students` | Élèves |
| `subjects` | Matières avec coefficient |
| `grades` | Notes (sur 20, NULL = manquante) |
| `app_settings` | Paramètres globaux (stratégie notes manquantes) |

## Architecture

Consultez [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le détail de l'organisation des dossiers et des règles métier.

La logique de calcul des moyennes est isolée dans `src/lib/utils/grades/` et couverte par des tests unitaires.

```bash
npm test
```

## Fonctionnalités prévues

- [x] Schéma de base de données
- [x] Architecture des dossiers
- [x] Utilitaires de calcul (moyenne, classement, stats)
- [ ] CRUD élèves, classes, matières, notes
- [ ] Tableau de bord enseignant
- [ ] Export PDF des bulletins
