-- Migration: Adicionar coluna rejection_reason na tabela access_requests
ALTER TABLE access_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
