import { useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FeedPost } from '@/types/feed';
import { getAccessToken } from '@/lib/auth';

export function useFeedPostsSupabase() {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Setup real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        // Subscribe to feed_items changes
        subscriptionRef.current = supabase
          .channel('feed_items')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_items' }, (payload: any) => {
            // Invalidate query to fetch new posts
            queryClient.invalidateQueries({ queryKey: ['feed_posts_supabase'] });
          })
          .subscribe();
      } catch (error) {
        console.error('Error setting up feed subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [queryClient]);

  const query = useInfiniteQuery({
    queryKey: ['feed_posts_supabase'],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * 10;
      const to = from + 9;

      const { data, error } = await supabase
        .from('feed_items')
        .select(
          `
          *,
          created_by_user:users(id, display_name, avatar_url),
          feed_comments(
            id,
            content,
            created_at,
            created_by,
            created_by_user:users(id, display_name, avatar_url)
          ),
          feed_reactions(
            id,
            emoji,
            created_by,
            created_by_user:users(id, display_name, avatar_url)
          )
        `
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return data as FeedPost[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length : undefined;
    },
    refetchOnWindowFocus: false,
  });

  return query;
}

export function useCreateFeedPostSupabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: {
      content: string;
      type?: string;
      meta?: Record<string, any>;
    }) => {
      const token = getAccessToken();
      const { data, error } = await supabase
        .from('feed_items')
        .insert([
          {
            content: post.content,
            item_type: post.type || 'post',
            metadata: post.meta || {},
            created_by: token, // This should be user ID from JWT
          },
        ])
        .select(
          `
          *,
          created_by_user:users(id, display_name, avatar_url),
          feed_comments(*),
          feed_reactions(*)
        `
        )
        .single();

      if (error) throw error;
      return data as FeedPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts_supabase'] });
    },
    onError: (error) => {
      console.error('Error creating feed post:', error);
    },
  });
}

export function useAddFeedComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const token = getAccessToken();
      const { data, error } = await supabase
        .from('feed_comments')
        .insert([
          {
            feed_item_id: postId,
            content,
            created_by: token,
          },
        ])
        .select(
          `
          *,
          created_by_user:users(id, display_name, avatar_url)
        `
        )
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts_supabase'] });
    },
  });
}

export function useAddFeedReaction(postId: string, emoji: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      const { data, error } = await supabase
        .from('feed_reactions')
        .insert([
          {
            feed_item_id: postId,
            emoji,
            created_by: token,
          },
        ])
        .select(
          `
          *,
          created_by_user:users(id, display_name, avatar_url)
        `
        )
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts_supabase'] });
    },
  });
}

export function useDeleteFeedPost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('feed_items')
        .update({ is_archived: true })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts_supabase'] });
    },
  });
}

export function useDeleteFeedComment(commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('feed_comments')
        .update({ is_archived: true })
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts_supabase'] });
    },
  });
}
