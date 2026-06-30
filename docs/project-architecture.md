# Architecture projet (React + Tailwind + Supabase)

Ce document propose une architecture **feature-first** avec séparation claire entre :
- **UI** (pages, composants)
- **logique métier/calcul** (domain + services)
- **accès données** (repositories Supabase)

## 1) Arborescence recommandée

```txt
school-average-app/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ router.tsx
│  │  ├─ providers/
│  │  │  ├─ QueryProvider.tsx
│  │  │  └─ AuthProvider.tsx
│  │  └─ layouts/
│  │     └─ DashboardLayout.tsx
│  ├─ components/
│  │  ├─ ui/                    # composants réutilisables (Button, Modal, Table...)
│  │  └─ charts/                # graphiques dashboard
│  ├─ pages/
│  │  ├─ DashboardPage.tsx
│  │  ├─ StudentsPage.tsx
│  │  ├─ ClassesPage.tsx
│  │  ├─ SubjectsPage.tsx
│  │  ├─ GradesPage.tsx
│  │  └─ ReportsPage.tsx
│  ├─ features/
│  │  ├─ students/
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  ├─ repositories/
│  │  │  └─ types.ts
│  │  ├─ classes/
│  │  ├─ subjects/
│  │  ├─ grades/
│  │  └─ reports/
│  ├─ domain/
│  │  ├─ entities/
│  │  │  ├─ student.ts
│  │  │  ├─ classRoom.ts
│  │  │  ├─ subject.ts
│  │  │  └─ grade.ts
│  │  ├─ value-objects/
│  │  │  └─ gradeValue.ts        # validation note [0..20]
│  │  └─ services/
│  │     ├─ average-calculator.ts # logique de calcul des moyennes
│  │     └─ ranking-service.ts    # logique de classement
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ client.ts
│  │  │  └─ mappers.ts
│  │  ├─ pdf/
│  │  │  └─ bulletin-generator.ts # export PDF
│  │  └─ config/
│  │     └─ env.ts
│  ├─ utils/
│  │  ├─ formatters.ts
│  │  └─ guards.ts
│  ├─ types/
│  │  └─ api.ts
│  └─ styles/
│     └─ index.css
├─ supabase/
│  ├─ migrations/
│  │  └─ 20260630161000_init_school_schema.sql
│  └─ seed.sql
├─ docs/
│  └─ project-architecture.md
├─ package.json
├─ tailwind.config.ts
├─ postcss.config.js
└─ tsconfig.json
```

## 2) Principe de séparation (important)

### Couche UI
- Affiche les données et déclenche des actions utilisateur.
- Ne contient **pas** de logique de calcul de moyenne.

### Couche Domain (métier)
- Contient les règles : note sur 20, gestion note manquante, calcul pondéré, classement.
- Fonctions pures testables (sans dépendance React/Supabase).

### Couche Data (repositories)
- Lit/écrit via Supabase (CRUD élèves, classes, matières, notes).
- Mappe les données BD vers les objets du domaine.

## 3) Flux recommandé pour les moyennes

1. `features/grades/repositories` lit les notes + coefficients depuis la BD.
2. Les données sont passées à `domain/services/average-calculator.ts`.
3. Le service renvoie :
   - moyenne par élève,
   - moyenne de classe,
   - classement.
4. La page dashboard affiche ces résultats.

## 4) Politique des notes manquantes

Conserver un paramètre global (table `app_settings`):
- `ignore` : note absente exclue du calcul.
- `zero` : note absente comptée à 0.

La logique est déjà prévue dans le schéma SQL via :
- `app_settings.missing_grade_policy`
- les vues `v_student_averages`, `v_class_averages`, `v_student_ranking`.

## 5) Modules minimum à implémenter ensuite

- CRUD :
  - `features/students/repositories/student.repository.ts`
  - `features/classes/repositories/class.repository.ts`
  - `features/subjects/repositories/subject.repository.ts`
  - `features/grades/repositories/grade.repository.ts`
- Dashboard :
  - `pages/DashboardPage.tsx`
  - composants de classement + cartes moyennes.
- Export PDF :
  - `lib/pdf/bulletin-generator.ts`
  - `features/reports/components/BulletinPreview.tsx`
