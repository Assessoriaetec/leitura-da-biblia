-- 1. Profiles table to store extra user info (if not already there)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Reading Progress: Update UNIQUE constraint to handle multiple users
-- First, drop the old UNIQUE(day_number) constraint if it exists.
-- (Note: In Supabase, if you had it as 'reading_progress_day_number_key', drop that)
ALTER TABLE public.reading_progress DROP CONSTRAINT IF EXISTS reading_progress_day_number_key;

-- Now add user_id column if not exists
ALTER TABLE public.reading_progress ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Add a new unique constraint across user and day
ALTER TABLE public.reading_progress DROP CONSTRAINT IF EXISTS unique_user_day;
ALTER TABLE public.reading_progress ADD CONSTRAINT unique_user_day UNIQUE (user_id, day_number);

-- 3. Posts: Link to user_id
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'João Davi';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_avatar TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.posts ALTER COLUMN user_name DROP DEFAULT; -- We'll fetch from profiles

-- 4. Secure RLS Policies
-- Profiles: Users can only edit their own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Reading Progress: Users can only see/edit their own
DROP POLICY IF EXISTS "Public reading progress is viewable by everyone" ON public.reading_progress;
DROP POLICY IF EXISTS "Any user can upsert reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can see own progress" ON public.reading_progress;
CREATE POLICY "Users can see own progress" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.reading_progress;
CREATE POLICY "Users can update own progress" ON public.reading_progress FOR ALL USING (auth.uid() = user_id);

-- Posts: Everyone can see, only owner can edit
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Any user can create posts" ON public.posts;
DROP POLICY IF EXISTS "Visible to all" ON public.posts;
CREATE POLICY "Visible to all" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only owners can insert" ON public.posts;
CREATE POLICY "Only owners can insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only owners can update/delete" ON public.posts;
CREATE POLICY "Only owners can update/delete" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
