import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db';
import { users as usersTable } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase environment variables are not set for feed operations.');
}

// Create Supabase client with service role key for backend operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
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

export default router;

