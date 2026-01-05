-- Fixes reading_progress table to properly support multiple users and notes view
-- 1. Remove the restrictive unique constraint on day_number
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reading_progress_day_number_key') THEN
        ALTER TABLE public.reading_progress DROP CONSTRAINT reading_progress_day_number_key;
    END IF;
END $$;

-- 2. Add updated_at column
ALTER TABLE public.reading_progress 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add personal unique constraint (User + Day)
-- First check if it already exists to avoid error
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'reading_progress_user_id_day_number_key') THEN
        ALTER TABLE public.reading_progress ADD CONSTRAINT reading_progress_user_id_day_number_key UNIQUE (user_id, day_number);
    END IF;
END $$;

-- 4. Enable RLS and verify policies (should be ok but ensuring for safety)
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Any user can upsert reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Any user can update reading progress" ON public.reading_progress;

CREATE POLICY "Users can manage their own reading progress" 
ON public.reading_progress 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
