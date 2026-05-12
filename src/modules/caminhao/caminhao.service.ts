import supabase from '../../config/supabase';

const TABLE = 'caminhao';

const SELECT_COMPLETO = `
  *,
  users!fk_caminhao_usuario ( name ),
  carga!fk_caminhao_carga ( tipo ),
  centro_logistica!fk_caminhao_centro_logistica ( nome )
`;

export const findAllCompleto = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return supabase.from(TABLE).select(SELECT_COMPLETO).range(from, to);
};

export const findByIdCompleto = (id: number) => supabase.from(TABLE).select(SELECT_COMPLETO).eq('id', id).single();

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
