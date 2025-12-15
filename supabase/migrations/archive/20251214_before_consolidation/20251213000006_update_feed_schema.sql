DROP TABLE IF EXISTS public.feed_likes;
DROP TABLE IF EXISTS public.feed_comments;
DROP TABLE IF EXISTS public.feed_posts;
DROP TABLE IF EXISTS public.feed_profiles;

-- Profiles table (synced from main app)
CREATE TABLE public.feed_profiles (
    id uuid PRIMARY KEY,
    full_name text NOT NULL,
    avatar_url text,
    job_title text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Posts table
CREATE TABLE public.feed_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    type text NOT NULL DEFAULT 'post',
    meta jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    visibility text DEFAULT 'public',
    parent_post_id uuid REFERENCES public.feed_posts(id) ON DELETE SET NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Likes table
CREATE TABLE public.feed_likes (
    post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- Comments table
CREATE TABLE public.feed_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    author_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_feed_posts_author ON public.feed_posts(author_id);
CREATE INDEX idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX idx_feed_likes_post ON public.feed_likes(post_id);
CREATE INDEX idx_feed_comments_post ON public.feed_comments(post_id);
