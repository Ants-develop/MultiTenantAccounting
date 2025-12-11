-- Feed System Tables

-- Profiles table (synced from main app)
CREATE TABLE IF NOT EXISTS public.feed_profiles (
    id integer PRIMARY KEY,
    full_name text NOT NULL,
    avatar_url text,
    job_title text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Posts table
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id integer REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    visibility text DEFAULT 'public',
    parent_post_id uuid REFERENCES public.feed_posts(id) ON DELETE SET NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Likes table
CREATE TABLE IF NOT EXISTS public.feed_likes (
    post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id integer REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.feed_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    author_id integer REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON public.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_likes_post ON public.feed_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON public.feed_comments(post_id);

-- Enable RLS
ALTER TABLE public.feed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

-- Permissive Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_profiles' AND policyname = 'Allow all access to profiles') THEN
        CREATE POLICY "Allow all access to profiles" ON public.feed_profiles FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_posts' AND policyname = 'Allow all access to posts') THEN
        CREATE POLICY "Allow all access to posts" ON public.feed_posts FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_likes' AND policyname = 'Allow all access to likes') THEN
        CREATE POLICY "Allow all access to likes" ON public.feed_likes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_comments' AND policyname = 'Allow all access to comments') THEN
        CREATE POLICY "Allow all access to comments" ON public.feed_comments FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Realtime
-- Attempt to add tables to publication if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_likes;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comments;
    END IF;
END $$;

