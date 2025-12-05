import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface FeedPost {
  id: number;
  content: string;
  attachments: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  author?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  likesCount?: number;
  commentsCount?: number;
  userHasLiked?: boolean;
}

export interface FeedComment {
  id: number;
  content: string;
  parentCommentId: number | null;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  author?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface FeedPostsFilters {
  search?: string;
  pinned_only?: boolean;
}

export function useFeedPosts(filters?: FeedPostsFilters) {
  return useQuery({
    queryKey: ["/api/feed/posts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.pinned_only) params.append("pinned_only", "true");
      
      const url = `/api/feed/posts${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiRequest("GET", url);
      return (await response.json()) as FeedPost[];
    },
  });
}

export function useFeedPost(id: number) {
  return useQuery({
    queryKey: ["/api/feed/posts", id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/feed/posts/${id}`);
      return (await response.json()) as FeedPost;
    },
    enabled: !!id,
  });
}

export function useFeedPostComments(postId: number) {
  return useQuery({
    queryKey: ["/api/feed/posts", postId, "comments"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/feed/posts/${postId}/comments`);
      return (await response.json()) as FeedComment[];
    },
    enabled: !!postId,
  });
}


