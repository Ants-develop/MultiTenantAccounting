import { useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FeedPost, FeedItemType } from '@/types/feed';

export function useFeedPosts() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['feed_posts'],
    queryFn: async ({ pageParam = 0 }) => {
        const from = pageParam * 10;
        const to = from + 9;

        const response = await fetch(`/api/feed/posts?from=${from}&to=${to}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Error fetching feed posts:", error);
          throw new Error(error.error || 'Failed to fetch feed posts');
        }

        const data = await response.json();
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

export function useCreateFeedPost(userId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: {
      content: string;
      type: FeedItemType;
      meta?: Record<string, any>;
    }) => {
      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: post.content,
          type: post.type,
          meta: post.meta || {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating post:', error);
        throw new Error(error.error || 'Failed to create post');
      }

      const data = await response.json();
      return data as FeedPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed_posts'] });
    },
    onError: (error) => {
      console.error('Error creating feed post:', error);
    },
  });
}

export function useSyncProfile() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/feed/profile-sync', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync profile');
      }

      return response.json();
    },
    onError: (error) => {
      console.error('Error syncing profile:', error);
    },
  });
}
