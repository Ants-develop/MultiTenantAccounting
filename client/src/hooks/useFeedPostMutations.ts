import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";

interface CreatePostData {
  content: string;
  attachments?: string[];
  isPinned?: boolean;
}

interface UpdatePostData {
  content?: string;
  attachments?: string[];
  isPinned?: boolean;
}

interface CreateCommentData {
  content: string;
  parentCommentId?: number;
}

export function useFeedPostMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPost = useMutation({
    mutationFn: async (data: CreatePostData) => {
      const response = await apiRequest("POST", "/api/feed/posts", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePostData }) => {
      const response = await apiRequest("PUT", `/api/feed/posts/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive",
      });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/feed/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("POST", `/api/feed/posts/${postId}/like`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "destructive",
      });
    },
  });

  const togglePin = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("PUT", `/api/feed/posts/${postId}/pin`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
      toast({
        title: "Success",
        description: "Post pin status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle pin",
        variant: "destructive",
      });
    },
  });

  const createComment = useMutation({
    mutationFn: async ({ postId, data }: { postId: number; data: CreateCommentData }) => {
      const response = await apiRequest("POST", `/api/feed/posts/${postId}/comments`, data);
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts", variables.postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create comment",
        variant: "destructive",
      });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const response = await apiRequest("PUT", `/api/feed/comments/${id}`, { content });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/feed/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed/posts"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  return {
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    togglePin,
    createComment,
    updateComment,
    deleteComment,
  };
}


