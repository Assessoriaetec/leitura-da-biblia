-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER',
  streak INTEGER DEFAULT 0,
  progress FLOAT DEFAULT 0,
  last_reading TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) DEFAULT '00000000-0000-0000-0000-000000000000', -- Simplified for proto
  day_number INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_number) -- Simplified for single user proto
);

-- Enable RLS for reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reading progress is viewable by everyone" ON public.reading_progress FOR SELECT USING (true);
CREATE POLICY "Any user can upsert reading progress" ON public.reading_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Any user can update reading progress" ON public.reading_progress FOR UPDATE USING (true);

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  user_name TEXT DEFAULT 'João Davi',
  user_avatar TEXT,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Enable RLS for posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Any user can create posts" ON public.posts FOR INSERT WITH CHECK (true);
