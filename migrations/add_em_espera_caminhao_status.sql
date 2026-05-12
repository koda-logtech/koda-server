-- Adiciona status em_espera ao caminhão (entre disponível e em rota no fluxo operacional).
-- Execute no SQL Editor do Supabase ou no Postgres onde já existe a tabela caminhao.

ALTER TABLE caminhao DROP CONSTRAINT IF EXISTS chk_status_caminhao;

ALTER TABLE caminhao ADD CONSTRAINT chk_status_caminhao
  CHECK (status IN ('disponivel', 'em_espera', 'em_rota', 'manutencao', 'inativo'));
