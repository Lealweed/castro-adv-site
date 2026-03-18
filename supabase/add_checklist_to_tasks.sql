-- =========================================================
-- Migração: Adiciona coluna `checklist` (JSONB) na tabela tasks
-- Rode este script no SQL Editor do painel Supabase
-- =========================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- Garante que valores nulos sejam normalizados para array vazio
UPDATE tasks
SET checklist = '[]'::jsonb
WHERE checklist IS NULL;

-- Comentário descritivo
COMMENT ON COLUMN tasks.checklist IS
  'Array JSON de fases da tarefa: [{id: uuid, text: string, done: boolean}]';
