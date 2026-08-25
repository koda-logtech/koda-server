import supabase from '../../config/supabase';

const TABLE = 'carga_alertas';

/** Join com a carga para trazer tipo e faixa de referência. */
const SELECT_WITH_CARGA = '*, carga:carga!fk_carga_alertas_carga ( id, tipo, temperatura_minima, temperatura_maxima )';

export type AlertaFilters = {
  status?: string;
  tipo?: string;
  id_carga?: number;
};

const STATUS_VALIDOS = new Set(['aberto', 'resolvido', 'cancelado']);
const TIPOS_VALIDOS = new Set(['alta', 'baixa']);

function buildBase(filters: AlertaFilters) {
  let q = supabase.from(TABLE).select(SELECT_WITH_CARGA);

  if (filters.status && STATUS_VALIDOS.has(filters.status)) {
    q = q.eq('status', filters.status);
  }
  if (filters.tipo && TIPOS_VALIDOS.has(filters.tipo)) {
    q = q.eq('tipo', filters.tipo);
  }
  if (typeof filters.id_carga === 'number' && Number.isFinite(filters.id_carga)) {
    q = q.eq('id_carga', filters.id_carga);
  }

  return q;
}

/** Lista paginada (mais recentes primeiro). */
export const findAll = (page: number, limit: number, filters: AlertaFilters = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return buildBase(filters).order('aberto_at', { ascending: false }).range(from, to);
};

export const findById = (id: number) => supabase.from(TABLE).select(SELECT_WITH_CARGA).eq('id', id).single();

/** Conta os alertas (usa head:true + count:'exact' — não traz linhas). */
export const countByStatus = (status = 'aberto') => {
  let q = supabase.from(TABLE).select('id', { count: 'exact', head: true });
  if (STATUS_VALIDOS.has(status)) {
    q = q.eq('status', status);
  }
  return q;
};

/** Cancela manualmente um alerta (ex.: falso positivo). */
export const cancelar = (id: number) => supabase
  .from(TABLE)
  .update({ status: 'cancelado', updated_at: new Date().toISOString() })
  .eq('id', id)
  .select(SELECT_WITH_CARGA)
  .single();
