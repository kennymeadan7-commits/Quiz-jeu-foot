export type MissingGradeStrategy = 'exclude' | 'zero';
export type UserRole = 'admin' | 'teacher';

export interface SchoolYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicPeriod {
  id: string;
  school_year_id: string;
  label: string;
  code: string;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  school_year_id: string;
  name: string;
  level: string;
  missing_grade_strategy: MissingGradeStrategy | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  coefficient: number;
  max_score: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  student_id: string;
  subject_id: string;
  academic_period_id: string;
  value: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  school_name: string;
  missing_grade_strategy: MissingGradeStrategy;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
