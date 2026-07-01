-- Authentification et autorisations par rôle (admin / professeur)
-- Basé sur Supabase Auth + table public.profiles

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'professeur')),
  matiere_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'touch_updated_at'
  ) then
    drop trigger if exists trg_profiles_updated_at on public.profiles;
    create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function public.touch_updated_at();
  end if;
end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_professeur_for_subject(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'professeur'
      and p.matiere_id = p_subject_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.class_subjects enable row level security;
alter table public.grades enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists classes_admin_all on public.classes;
create policy classes_admin_all
on public.classes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists classes_professeur_select on public.classes;
create policy classes_professeur_select
on public.classes
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.class_subjects cs
    where cs.class_id = classes.id
      and public.is_professeur_for_subject(cs.subject_id)
  )
);

drop policy if exists students_admin_all on public.students;
create policy students_admin_all
on public.students
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists students_professeur_select on public.students;
create policy students_professeur_select
on public.students
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.class_subjects cs
    where cs.class_id = students.class_id
      and public.is_professeur_for_subject(cs.subject_id)
  )
);

drop policy if exists subjects_admin_all on public.subjects;
create policy subjects_admin_all
on public.subjects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists subjects_professeur_select on public.subjects;
create policy subjects_professeur_select
on public.subjects
for select
to authenticated
using (
  public.is_admin()
  or public.is_professeur_for_subject(subjects.id)
);

drop policy if exists class_subjects_admin_all on public.class_subjects;
create policy class_subjects_admin_all
on public.class_subjects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists class_subjects_professeur_select on public.class_subjects;
create policy class_subjects_professeur_select
on public.class_subjects
for select
to authenticated
using (
  public.is_admin()
  or public.is_professeur_for_subject(class_subjects.subject_id)
);

drop policy if exists grades_admin_all on public.grades;
create policy grades_admin_all
on public.grades
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists grades_professeur_select on public.grades;
create policy grades_professeur_select
on public.grades
for select
to authenticated
using (
  public.is_admin()
  or public.is_professeur_for_subject(grades.subject_id)
);

drop policy if exists grades_professeur_insert on public.grades;
create policy grades_professeur_insert
on public.grades
for insert
to authenticated
with check (
  public.is_admin()
  or public.is_professeur_for_subject(grades.subject_id)
);

drop policy if exists grades_professeur_update on public.grades;
create policy grades_professeur_update
on public.grades
for update
to authenticated
using (
  public.is_admin()
  or public.is_professeur_for_subject(grades.subject_id)
)
with check (
  public.is_admin()
  or public.is_professeur_for_subject(grades.subject_id)
);

drop policy if exists grades_professeur_delete on public.grades;
create policy grades_professeur_delete
on public.grades
for delete
to authenticated
using (
  public.is_admin()
  or public.is_professeur_for_subject(grades.subject_id)
);

drop policy if exists app_settings_select_authenticated on public.app_settings;
create policy app_settings_select_authenticated
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

