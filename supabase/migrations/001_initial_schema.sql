-- =============================================================================
-- Moyennes Scolaires — Schéma initial
-- Stack : Supabase (PostgreSQL)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE missing_grade_strategy AS ENUM ('exclude', 'zero');

-- -----------------------------------------------------------------------------
-- Profils utilisateurs (enseignants / administrateurs)
-- Lié à auth.users de Supabase Auth
-- -----------------------------------------------------------------------------

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'teacher',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Paramètres globaux de l'application
-- -----------------------------------------------------------------------------

CREATE TABLE app_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name             TEXT NOT NULL DEFAULT 'Établissement',
  missing_grade_strategy  missing_grade_strategy NOT NULL DEFAULT 'exclude',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Une seule ligne de configuration (singleton)
INSERT INTO app_settings (school_name) VALUES ('Mon établissement');

-- -----------------------------------------------------------------------------
-- Années scolaires
-- -----------------------------------------------------------------------------

CREATE TABLE school_years (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL UNIQUE,          -- ex. "2025-2026"
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT school_years_dates_check CHECK (end_date > start_date)
);

-- -----------------------------------------------------------------------------
-- Périodes (trimestres / semestres)
-- -----------------------------------------------------------------------------

CREATE TABLE academic_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id  UUID NOT NULL REFERENCES school_years (id) ON DELETE CASCADE,
  label           TEXT NOT NULL,             -- ex. "Trimestre 1", "T1"
  code            TEXT NOT NULL,               -- ex. "T1", "T2", "T3"
  start_date      DATE,
  end_date        DATE,
  sort_order      SMALLINT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (school_year_id, code)
);

-- -----------------------------------------------------------------------------
-- Classes
-- -----------------------------------------------------------------------------

CREATE TABLE classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id  UUID NOT NULL REFERENCES school_years (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,               -- ex. "6ème A"
  level           TEXT NOT NULL,               -- ex. "6ème", "3ème", "Seconde"
  missing_grade_strategy missing_grade_strategy, -- NULL = hérite de app_settings
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (school_year_id, name)
);

-- -----------------------------------------------------------------------------
-- Élèves
-- -----------------------------------------------------------------------------

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  student_number  TEXT,                        -- numéro interne optionnel
  birth_date      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_class_id ON students (class_id);
CREATE INDEX idx_students_last_name ON students (last_name);

-- -----------------------------------------------------------------------------
-- Matières (liées à une classe, avec coefficient)
-- -----------------------------------------------------------------------------

CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,               -- ex. "Mathématiques"
  coefficient     NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
  max_score       NUMERIC(4, 2) NOT NULL DEFAULT 20.00,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subjects_coefficient_positive CHECK (coefficient > 0),
  CONSTRAINT subjects_max_score_positive CHECK (max_score > 0),
  UNIQUE (class_id, name)
);

CREATE INDEX idx_subjects_class_id ON subjects (class_id);

-- -----------------------------------------------------------------------------
-- Notes (sur 20 par défaut, valeur NULL = note manquante)
-- -----------------------------------------------------------------------------

CREATE TABLE grades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  subject_id          UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
  academic_period_id  UUID NOT NULL REFERENCES academic_periods (id) ON DELETE CASCADE,
  value               NUMERIC(4, 2),           -- NULL = note manquante
  comment             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT grades_value_range CHECK (
    value IS NULL OR (value >= 0 AND value <= 20)
  ),
  UNIQUE (student_id, subject_id, academic_period_id)
);

CREATE INDEX idx_grades_student_id ON grades (student_id);
CREATE INDEX idx_grades_subject_id ON grades (subject_id);
CREATE INDEX idx_grades_period_id ON grades (academic_period_id);

-- -----------------------------------------------------------------------------
-- Trigger : mise à jour automatique de updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_school_years_updated_at
  BEFORE UPDATE ON school_years FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_academic_periods_updated_at
  BEFORE UPDATE ON academic_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_grades_updated_at
  BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Vue : moyennes par élève et par période (calcul côté SQL, référence)
-- La logique principale reste dans l'application (src/lib/utils/grades/)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW student_averages AS
SELECT
  g.student_id,
  g.academic_period_id,
  s.class_id,
  CASE
    WHEN COUNT(g.value) FILTER (WHERE g.value IS NOT NULL) = 0 THEN NULL
    ELSE ROUND(
      SUM(g.value * sub.coefficient) FILTER (WHERE g.value IS NOT NULL)
      / NULLIF(SUM(sub.coefficient) FILTER (WHERE g.value IS NOT NULL), 0),
      2
    )
  END AS average_exclude_missing,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND(
      SUM(COALESCE(g.value, 0) * sub.coefficient) / NULLIF(SUM(sub.coefficient), 0),
      2
    )
  END AS average_zero_missing
FROM grades g
JOIN subjects sub ON sub.id = g.subject_id
JOIN students s ON s.id = g.student_id
GROUP BY g.student_id, g.academic_period_id, s.class_id;

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS) — à activer après configuration Auth
-- -----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

-- Politiques permissives pour les utilisateurs authentifiés (à affiner en production)
CREATE POLICY "Authenticated users can read all data"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated full access on app_settings"
  ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on school_years"
  ON school_years FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on academic_periods"
  ON academic_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on classes"
  ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on students"
  ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on subjects"
  ON subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on grades"
  ON grades FOR ALL TO authenticated USING (true) WITH CHECK (true);
