/**
 * Types générés manuellement — à remplacer par `supabase gen types typescript`
 * une fois le projet Supabase lié.
 */
import type {
  AcademicPeriod,
  AppSettings,
  Class,
  Grade,
  Profile,
  SchoolYear,
  Student,
  Subject,
} from '@/types';

type OmitTimestamps<T> = Omit<T, 'created_at' | 'updated_at'>;

type TableDef<T> = {
  Row: T;
  Insert: OmitTimestamps<T> & { id?: string };
  Update: Partial<OmitTimestamps<T>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      app_settings: TableDef<AppSettings>;
      school_years: TableDef<SchoolYear>;
      academic_periods: TableDef<AcademicPeriod>;
      classes: TableDef<Class>;
      students: TableDef<Student>;
      subjects: TableDef<Subject>;
      grades: TableDef<Grade>;
    };
    Views: {
      student_averages: {
        Row: {
          student_id: string;
          academic_period_id: string;
          class_id: string;
          average_exclude_missing: number | null;
          average_zero_missing: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: 'admin' | 'teacher';
      missing_grade_strategy: 'exclude' | 'zero';
    };
    CompositeTypes: Record<string, never>;
  };
};
