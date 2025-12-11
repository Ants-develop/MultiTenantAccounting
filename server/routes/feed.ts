import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db';
import { users as usersTable } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Use service role key if available, otherwise use anon key (with permissive RLS)
const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseKey) {
  console.warn('Supabase environment variables are not set for feed operations.');
}

if (!SUPABASE_SERVICE_KEY) {
  console.warn('[Feed API] Service role key not found, using anon key with RLS policies');
}

// Create Supabase client for backend operations
const supabaseAdmin = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// GET /api/feed/posts - Get paginated feed posts
router.get('/posts', async (req, res) => {
  try {
    const { from = 0, to = 9 } = req.query;
    const fromNum = parseInt(from as string);
    const toNum = parseInt(to as string);

    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .select(`
        *,
        author:feed_profiles!feed_posts_author_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .range(fromNum, toNum);

    if (error) {
      console.error('[Feed API] Error fetching posts:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feed/posts - Create a new post
router.post('/posts', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { content, type = 'message', meta = {} } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Sync user profile first (profile sync will happen via /profile-sync endpoint)
    // We'll just use the userId here

    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        author_id: userId,
        content,
        type,
        meta: meta || {},
        visibility: 'public',
        attachments: [],
      })
      .select(`
        *,
        author:feed_profiles!feed_posts_author_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('[Feed API] Error creating post:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feed/profile-sync - Sync current user profile
router.post('/profile-sync', async (req, res) => {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user from database
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabaseAdmin.from('feed_profiles').upsert({
      id: user.id,
      full_name: `${user.firstName} ${user.lastName}`.trim() || 'Unknown',
      job_title: user.globalRole || 'User',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Feed API] Error syncing profile:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feed/posts/:postId/like - Toggle like on a post
router.post('/posts/:postId/like', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { postId } = req.params;

    // Check if already liked
    const { data: existingLike } = await supabaseAdmin
      .from('feed_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabaseAdmin
        .from('feed_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) {
        console.error('[Feed API] Error unliking post:', error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ liked: false });
    } else {
      // Like
      const { error } = await supabaseAdmin
        .from('feed_likes')
        .insert({ post_id: postId, user_id: userId });

      if (error) {
        console.error('[Feed API] Error liking post:', error);
        return res.status(500).json({ error: error.message });
      }

      res.json({ liked: true });
    }
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feed/posts/:postId/likes - Get likes count for a post
router.get('/posts/:postId/likes', async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session?.userId;

    // Get total likes count
    const { count, error: countError } = await supabaseAdmin
      .from('feed_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (countError) {
      console.error('[Feed API] Error fetching likes count:', countError);
      return res.status(500).json({ error: countError.message });
    }

    // Check if current user liked
    let userLiked = false;
    if (userId) {
      const { data: userLike } = await supabaseAdmin
        .from('feed_likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();
      
      userLiked = !!userLike;
    }

    res.json({ count: count || 0, userLiked });
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feed/posts/:postId/comments - Get comments for a post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('feed_comments')
      .select(`
        *,
        author:feed_profiles!feed_comments_author_id_fkey(*)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Feed API] Error fetching comments:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feed/posts/:postId/comments - Create a comment on a post
router.post('/posts/:postId/comments', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { postId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('feed_comments')
      .insert({
        post_id: postId,
        author_id: userId,
        content,
      })
      .select(`
        *,
        author:feed_profiles!feed_comments_author_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error('[Feed API] Error creating comment:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err: any) {
    console.error('[Feed API] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

