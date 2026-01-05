-- Run this if the "posts" table already existed without these columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'João Davi';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_avatar TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
