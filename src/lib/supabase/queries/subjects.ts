import { supabase } from '../client';
import type { Subject } from '@/types';

export async function fetchSubjectsByClass(classId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('class_id', classId)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

export async function createSubject(payload: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('subjects').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateSubject(id: string, payload: Partial<Subject>) {
  const { data, error } = await supabase.from('subjects').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}
