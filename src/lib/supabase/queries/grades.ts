import { supabase } from '../client';
import type { Grade } from '@/types';

export async function fetchGradesByClassAndPeriod(
  classId: string,
  periodId: string,
): Promise<Grade[]> {
  const { data, error } = await supabase
    .from('grades')
    .select('*, students!inner(class_id)')
    .eq('students.class_id', classId)
    .eq('academic_period_id', periodId);

  if (error) throw error;
  return (data ?? []).map((row) => {
    const { students: _students, ...grade } = row as Grade & { students: unknown };
    return grade;
  });
}

export async function upsertGrade(
  payload: Omit<Grade, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await supabase
    .from('grades')
    .upsert(payload, { onConflict: 'student_id,subject_id,academic_period_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGrade(id: string) {
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw error;
}
