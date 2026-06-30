-- Données de démonstration pour le développement local
-- Exécuter après 001_initial_schema.sql

INSERT INTO school_years (label, start_date, end_date, is_active)
VALUES ('2025-2026', '2025-09-01', '2026-06-30', true);

INSERT INTO academic_periods (school_year_id, label, code, sort_order)
SELECT id, 'Trimestre 1', 'T1', 1 FROM school_years WHERE label = '2025-2026'
UNION ALL
SELECT id, 'Trimestre 2', 'T2', 2 FROM school_years WHERE label = '2025-2026'
UNION ALL
SELECT id, 'Trimestre 3', 'T3', 3 FROM school_years WHERE label = '2025-2026';

INSERT INTO classes (school_year_id, name, level)
SELECT id, '3ème A', '3ème' FROM school_years WHERE label = '2025-2026';

-- Matières avec coefficients typiques du collège
INSERT INTO subjects (class_id, name, coefficient, sort_order)
SELECT c.id, m.name, m.coef, m.ord
FROM classes c
CROSS JOIN (VALUES
  ('Français',       3.00, 1),
  ('Mathématiques',  3.00, 2),
  ('Histoire-Géo',   2.00, 3),
  ('Anglais',        2.00, 4),
  ('SVT',            2.00, 5),
  ('Physique-Chimie',2.00, 6),
  ('EPS',            1.00, 7)
) AS m(name, coef, ord)
WHERE c.name = '3ème A';

-- Élèves fictifs
INSERT INTO students (class_id, first_name, last_name, student_number)
SELECT c.id, s.fn, s.ln, s.num
FROM classes c
CROSS JOIN (VALUES
  ('Emma',   'Martin',  'E001'),
  ('Lucas',  'Bernard', 'E002'),
  ('Léa',    'Dubois',  'E003'),
  ('Hugo',   'Thomas',  'E004'),
  ('Chloé',  'Robert',  'E005')
) AS s(fn, ln, num)
WHERE c.name = '3ème A';
