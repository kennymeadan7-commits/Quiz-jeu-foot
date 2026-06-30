import { supabase } from '../client';
import type { Class } from '@/types';

export async function fetchClasses(schoolYearId?: string): Promise<Class[]> {
  let query = supabase.from('classes').select('*').order('name');

  if (schoolYearId) {
    query = query.eq('school_year_id', schoolYearId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createClass(payload: Omit<Class, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('classes').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateClass(id: string, payload: Partial<Class>) {
  const { data, error } = await supabase.from('classes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}
