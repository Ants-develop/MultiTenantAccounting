import { Router } from 'express';
import { supabaseAdmin } from '../services/supabase';
import { db } from '../db';
import { users as usersTable } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Use the existing supabaseAdmin client from services/supabase.ts
// It's already configured with SUPABASE_SERVICE_ROLE_KEY
// Log configuration on startup
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';

// Decode JWT to verify it's a service role key
let keyRole = 'UNKNOWN';
if (SUPABASE_SERVICE_KEY) {
  try {
    // Service role keys typically have "service_role" in the payload
    const parts = SUPABASE_SERVICE_KEY.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      keyRole = payload.role || 'UNKNOWN';
    }
  } catch (e) {
    // Not a valid JWT format
  }
}

console.log('[Feed API] Supabase configuration:', {
  url: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : 'NOT SET',
  hasServiceKey: !!SUPABASE_SERVICE_KEY,
  usingKey: SUPABASE_SERVICE_KEY ? 'SERVICE_ROLE' : 'MISSING',
  serviceKeyLength: SUPABASE_SERVICE_KEY?.length || 0,
  keyRole: keyRole,
  keyPreview: SUPABASE_SERVICE_KEY ? `${SUPABASE_SERVICE_KEY.substring(0, 20)}...${SUPABASE_SERVICE_KEY.substring(SUPABASE_SERVICE_KEY.length - 10)}` : 'N/A',
});

if (!SUPABASE_SERVICE_KEY) {
  console.error('[Feed API] ⚠️  SUPABASE_SERVICE_ROLE_KEY not found in environment variables!');
  console.error('[Feed API] Add it to your .env file: SUPABASE_SERVICE_ROLE_KEY=your-key-here');
} else if (keyRole !== 'service_role') {
  console.error('[Feed API] ⚠️  WARNING: Key role is "' + keyRole + '", expected "service_role"');
  console.error('[Feed API] Make sure you copied the SERVICE_ROLE key, not the ANON key from Supabase dashboard');
}

// Test Supabase connection on startup (async, don't block)
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  (async () => {
    try {
      // First test: Try to query feed_profiles
      const { data, error } = await supabaseAdmin.from('feed_profiles').select('id').limit(1);
      if (error) {
        console.error('[Feed API] ✗ Test query failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        if (error.code === '42501') {
          console.error('[Feed API] ⚠️  Permission denied error details:');
          console.error('[Feed API]   - This should NOT happen with service_role key');
          console.error('[Feed API]   - Verify the key is the SERVICE_ROLE key (not anon key)');
          console.error('[Feed API]   - Check Supabase Dashboard > Settings > API');
          console.error('[Feed API]   - Service role key should be ~200+ characters long');
          console.error('[Feed API]   - Key role detected:', keyRole);
        }
        return;
      }
      console.log('[Feed API] ✓ Supabase connection test successful');
    } catch (error: any) {
      console.error('[Feed API] ✗ Supabase connection test exception:', error.message);
    }
  })();
}

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
      if (error.code === '42501') {
        console.error('[Feed API] Permission denied - Check RLS policies or set SUPABASE_SERVICE_ROLE_KEY');
      }
      return res.status(500).json({ error: error.message, code: error.code });
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

    // Sync user profile first to ensure it exists
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) {
      const { error: profileError } = await supabaseAdmin.from('feed_profiles').upsert({
        id: user.id,
        full_name: `${user.firstName} ${user.lastName}`.trim() || 'Unknown',
        job_title: user.globalRole || 'User',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('[Feed API] Error syncing profile before post creation:', profileError);
        // Continue anyway - the post can be created without the profile
      }
    }

    // Insert post first without the join to avoid RLS issues
    const { data: insertedPost, error: insertError } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        author_id: userId,
        content,
        type,
        meta: meta || {},
        visibility: 'public',
        attachments: [],
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[Feed API] Error creating post:', insertError);
      if (insertError.code === '42501') {
        console.error('[Feed API] Permission denied - Check RLS policies or set SUPABASE_SERVICE_ROLE_KEY');
        console.error('[Feed API] Current key type:', SUPABASE_SERVICE_KEY ? 'SERVICE_ROLE' : 'ANON');
      } else if (insertError.code === 'PGRST204') {
        console.error('[Feed API] Column not found - Run migrations: npx supabase db push');
      }
      return res.status(500).json({ error: insertError.message, code: insertError.code });
    }

    // Now fetch the post with the author join
    const { data, error } = await supabaseAdmin
      .from('feed_posts')
      .select(`
        *,
        author:feed_profiles!feed_posts_author_id_fkey(*)
      `)
      .eq('id', insertedPost.id)
      .single();

    if (error) {
      console.error('[Feed API] Error fetching post with author:', error);
      // If we can't fetch with author, return the post without it
      return res.json(insertedPost);
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
      if (error.code === '42501') {
        console.error('[Feed API] Permission denied - Check RLS policies or set SUPABASE_SERVICE_ROLE_KEY');
      }
      return res.status(500).json({ error: error.message, code: error.code });
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

