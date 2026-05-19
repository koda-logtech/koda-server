-- Permite gravar temperatura real em `carga.temperatura_atual` (telemetria) sem forçar min/max.
-- Executar no Supabase SQL Editor ou psql após bases criadas com o antigo CHECK.

ALTER TABLE carga DROP CONSTRAINT IF EXISTS chk_temperatura;
