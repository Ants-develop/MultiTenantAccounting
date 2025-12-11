import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FeedPost, FeedItemType } from '@/types/feed';
import { useEffect } from 'react';

export function useFeedPosts() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['feed_posts'],
    queryFn: async ({ pageParam = 0 }) => {
        // Range is inclusive
        const from = pageParam * 10;
        const to = from + 9;

        const { data, error } = await supabase
            .from('feed_posts')
            .select(`
                *,
                author:feed_profiles(*)
            `)
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) {
            console.error("Error fetching feed posts:", error);
            throw error;
        }
        return data as FeedPost[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
        // If we got fewer than 10 items, there are no more pages
        return lastPage.length === 10 ? allPages.length : undefined;
    },
    refetchOnWindowFocus: false,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('feed_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_posts',
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          // Invalidate query to refetch latest posts
          queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useCreateFeedPost(userId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: {
      content: string;
      type: FeedItemType;
      meta?: Record<string, any>;
    }) => {
      if (!userId) throw new Error('User ID is required');

      // Insert directly via Supabase
      const { data, error } = await supabase
        .from('feed_posts')
        .insert({
          content: post.content,
          type: post.type,
          meta: post.meta || {},
          author_id: userId,
          visibility: 'public',
          attachments: [],
        })
        .select(`
          *,
          author:feed_profiles(*)
        `)
        .single();

      if (error) {
        console.error('Error creating post:', error);
        throw error;
      }

      return data as FeedPost;
    },
    onSuccess: () => {
      // Invalidate the feed posts query to refetch
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
    },
    onError: (error) => {
      console.error('Error creating feed post:', error);
    },
  });
}

