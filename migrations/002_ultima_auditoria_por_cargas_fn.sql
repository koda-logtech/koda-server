-- Agrega a última leitura de telemetria por carga (usado em `GET /entregas/completo`).
-- Executar no Supabase SQL Editor ou psql.

CREATE OR REPLACE FUNCTION public.ultima_auditoria_por_cargas(carga_ids integer[])
RETURNS TABLE (id_carga integer, ultima_auditoria_at timestamptz)
LANGUAGE sql
STABLE
AS $$
  SELECT t.id_carga, MAX(t.created_at)::timestamptz
  FROM carga_telemetria_auditoria t
  WHERE t.id_carga = ANY(carga_ids)
  GROUP BY t.id_carga;
$$;

COMMENT ON FUNCTION public.ultima_auditoria_por_cargas(integer[]) IS
  'Último created_at em carga_telemetria_auditoria por id_carga (lista KPI desconectados).';
