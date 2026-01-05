-- Create a table to store the global reading plan
CREATE TABLE IF NOT EXISTS public.reading_plan (
  day_number INTEGER PRIMARY KEY,
  passage TEXT NOT NULL,
  theme TEXT,
  category TEXT,
  book TEXT,
  estimated_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reading_plan ENABLE ROW LEVEL SECURITY;

-- Everyone can view the plan
DROP POLICY IF EXISTS "Public reading plan is viewable by everyone" ON public.reading_plan;
CREATE POLICY "Public reading plan is viewable by everyone" ON public.reading_plan FOR SELECT USING (true);

-- Only admins can modify the plan
-- (Assuming based on the samuel.bfaro@gmail.com check in App.tsx)
DROP POLICY IF EXISTS "Only admins can modify reading plan" ON public.reading_plan;
CREATE POLICY "Only admins can modify reading plan" ON public.reading_plan FOR ALL 
  USING (auth.jwt()->>'email' = 'samuel.bfaro@gmail.com');
