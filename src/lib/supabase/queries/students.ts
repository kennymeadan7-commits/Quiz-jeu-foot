import { supabase } from '../client';
import type { Student } from '@/types';

export async function fetchStudentsByClass(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('last_name');

  if (error) throw error;
  return data ?? [];
}

export async function createStudent(payload: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('students').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, payload: Partial<Student>) {
  const { data, error } = await supabase.from('students').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}
