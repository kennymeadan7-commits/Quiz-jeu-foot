-- Application de gestion des moyennes scolaires (secondaire)
-- Cible : Supabase (PostgreSQL)

create extension if not exists "pgcrypto";

-- Politique de calcul pour les notes manquantes :
-- - ignore: la note manquante n'entre pas dans le calcul
-- - zero: la note manquante est traitée comme 0
do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'missing_grade_policy'
  ) then
    create type missing_grade_policy as enum ('ignore', 'zero');
  end if;
end
$$;

create table if not exists app_settings (
  id boolean primary key default true check (id = true),
  missing_grade_policy missing_grade_policy not null default 'ignore',
  updated_at timestamptz not null default now()
);

insert into app_settings (id, missing_grade_policy)
values (true, 'ignore')
on conflict (id) do nothing;

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  level text not null, -- ex: "6e", "5e", "2nde", "Terminale"
  academic_year text not null, -- ex: "2026-2027"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique,
  first_name text not null,
  last_name text not null,
  birth_date date,
  class_id uuid not null references classes(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_class_id on students(class_id);
create index if not exists idx_students_last_name on students(last_name);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Coefficient par matière et par classe.
create table if not exists class_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete restrict,
  coefficient numeric(6,2) not null check (coefficient > 0),
  created_at timestamptz not null default now(),
  unique (class_id, subject_id)
);

create index if not exists idx_class_subjects_class_id on class_subjects(class_id);
create index if not exists idx_class_subjects_subject_id on class_subjects(subject_id);

-- Une entrée de note correspond à une évaluation.
-- grade peut être NULL (note manquante).
create table if not exists grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete restrict,
  period text not null, -- ex: "T1", "T2", "S1", "Annuel"
  grade numeric(4,2), -- note sur 20
  exam_date date,
  assessment_label text, -- ex: "DS1", "Interro", "Examen final"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grade is null or (grade >= 0 and grade <= 20))
);

create index if not exists idx_grades_student_id on grades(student_id);
create index if not exists idx_grades_subject_id on grades(subject_id);
create index if not exists idx_grades_period on grades(period);
create index if not exists idx_grades_student_period on grades(student_id, period);

-- Empêche de saisir une matière non attribuée à la classe de l'élève.
create or replace function validate_grade_subject_for_student_class()
returns trigger
language plpgsql
as $$
declare
  v_class_id uuid;
begin
  select s.class_id into v_class_id
  from students s
  where s.id = new.student_id;

  if v_class_id is null then
    raise exception 'Élève introuvable pour student_id=%', new.student_id;
  end if;

  if not exists (
    select 1
    from class_subjects cs
    where cs.class_id = v_class_id
      and cs.subject_id = new.subject_id
  ) then
    raise exception 'La matière (%) n''est pas affectée à la classe (%) de l''élève.',
      new.subject_id, v_class_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_grade_subject on grades;
create trigger trg_validate_grade_subject
before insert or update on grades
for each row execute function validate_grade_subject_for_student_class();

-- Met à jour updated_at automatiquement.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_classes_updated_at on classes;
create trigger trg_classes_updated_at
before update on classes
for each row execute function touch_updated_at();

drop trigger if exists trg_students_updated_at on students;
create trigger trg_students_updated_at
before update on students
for each row execute function touch_updated_at();

drop trigger if exists trg_subjects_updated_at on subjects;
create trigger trg_subjects_updated_at
before update on subjects
for each row execute function touch_updated_at();

drop trigger if exists trg_grades_updated_at on grades;
create trigger trg_grades_updated_at
before update on grades
for each row execute function touch_updated_at();

drop trigger if exists trg_app_settings_updated_at on app_settings;
create trigger trg_app_settings_updated_at
before update on app_settings
for each row execute function touch_updated_at();

-- Vue : moyenne pondérée par élève et période.
-- En mode "ignore", les notes NULL sont exclues.
-- En mode "zero", les notes NULL sont comptées comme 0.
create or replace view v_student_averages as
with settings as (
  select missing_grade_policy from app_settings where id = true
)
select
  s.id as student_id,
  s.class_id,
  g.period,
  round(
    case
      when sum(
        case
          when settings.missing_grade_policy = 'ignore' and g.grade is null then 0
          else cs.coefficient
        end
      ) = 0 then 0
      else
        sum(
          case
            when settings.missing_grade_policy = 'ignore' and g.grade is null then 0
            else coalesce(g.grade, 0) * cs.coefficient
          end
        )
        /
        sum(
          case
            when settings.missing_grade_policy = 'ignore' and g.grade is null then 0
            else cs.coefficient
          end
        )
    end
  , 2) as weighted_average
from students s
left join grades g on g.student_id = s.id
left join class_subjects cs
  on cs.class_id = s.class_id
 and cs.subject_id = g.subject_id
cross join settings
group by s.id, s.class_id, g.period, settings.missing_grade_policy;

-- Vue : moyenne de classe par période.
create or replace view v_class_averages as
select
  sa.class_id,
  sa.period,
  round(avg(sa.weighted_average), 2) as class_average
from v_student_averages sa
group by sa.class_id, sa.period;

-- Vue : classement des élèves dans chaque classe et période.
create or replace view v_student_ranking as
select
  sa.class_id,
  sa.period,
  sa.student_id,
  sa.weighted_average,
  rank() over (
    partition by sa.class_id, sa.period
    order by sa.weighted_average desc nulls last
  ) as rank_in_class
from v_student_averages sa;
