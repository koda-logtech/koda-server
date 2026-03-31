import supabase from '../../config/supabase';

const TABLE = 'carga';

export const findAll = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return supabase.from(TABLE).select('*').range(from, to);
};

export const findById = (id: number) =>
  supabase.from(TABLE).select('*').eq('id', id).single();

export const create = (data: Record<string, unknown>) =>
  supabase.from(TABLE).insert(data).select().single();

export const update = (id: number, data: Record<string, unknown>) =>
  supabase.from(TABLE).update(data).eq('id', id).select().single();

export const remove = (id: number) =>
  supabase.from(TABLE).delete().eq('id', id);
