import supabase from '../../config/supabase';

const TABLE = 'carga';
const TELEMETRIA_AUDITORIA = 'carga_telemetria_auditoria';

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

/** Telemetria BLE/app: join com `carga` para tipo e id. */
export const findAllTelemetriaAuditoria = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return supabase
    .from(TELEMETRIA_AUDITORIA)
    .select(
      'id, id_carga, temperatura, latitude, longitude, created_at, carga!fk_carga_telemetria_auditoria_carga ( id, tipo )',
    )
    .order('created_at', { ascending: false })
    .range(from, to);
};

export type UltimaAuditoriaRow = { id_carga: number; ultima_auditoria_at: string };

/** Último `created_at` por `id_carga` (RPC se existir; senão uma query por carga). */
export const findUltimaAuditoriaPorCargas = async (
  cargaIds: number[],
): Promise<UltimaAuditoriaRow[]> => {
  const unique = [...new Set(cargaIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length === 0) {
    return [];
  }

  const rpc = await supabase.rpc('ultima_auditoria_por_cargas', { carga_ids: unique });
  if (!rpc.error && Array.isArray(rpc.data)) {
    return (rpc.data as { id_carga: number; ultima_auditoria_at: string }[]).map((row) => ({
      id_carga: row.id_carga,
      ultima_auditoria_at: String(row.ultima_auditoria_at),
    }));
  }

  const rows = await Promise.all(
    unique.map(async (cargaId) => {
      const { data, error } = await supabase
        .from(TELEMETRIA_AUDITORIA)
        .select('created_at')
        .eq('id_carga', cargaId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data?.[0]?.created_at) {
        return null;
      }
      return {
        id_carga: cargaId,
        ultima_auditoria_at: String(data[0].created_at),
      };
    }),
  );

  return rows.filter((r): r is UltimaAuditoriaRow => r !== null);
};
