-- Fix RLS policies for reading_progress to allow INSERT
-- The issue is that FOR ALL with only USING doesn't work for INSERT, which needs WITH CHECK

-- Drop existing policies
DROP POLICY IF EXISTS "Users can see own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.reading_progress;

-- Create separate policies for each operation
-- SELECT: Users can only see their own progress
CREATE POLICY "Users can see own progress" ON public.reading_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Users can insert progress for themselves
CREATE POLICY "Users can insert own progress" ON public.reading_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own progress
CREATE POLICY "Users can update own progress" ON public.reading_progress 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- DELETE: Users can delete their own progress (if needed)
CREATE POLICY "Users can delete own progress" ON public.reading_progress 
  FOR DELETE 
  USING (auth.uid() = user_id);
