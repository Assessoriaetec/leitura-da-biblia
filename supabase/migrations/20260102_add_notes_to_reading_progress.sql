-- Adiciona coluna de notas à tabela de progresso de leitura
ALTER TABLE public.reading_progress 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Garante que a política de RLS permita leitura/escrita nas notas
-- As políticas existentes para user_id já devem cobrir isso, 
-- mas é uma boa prática verificar se as permissões de SELECT/INSERT/UPDATE estão ok.
