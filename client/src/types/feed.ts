export interface FeedProfile {
  id: number;
  full_name: string;
  avatar_url: string | null;
  job_title: string | null;
  updated_at: string;
}

export type FeedItemType = 'message' | 'task' | 'event' | 'poll';

export interface FeedPost {
  id: string;
  author_id: number;
  content: string; // HTML from Tiptap
  type: FeedItemType;
  attachments: string[]; // URLs or JSON objects
  visibility: 'public' | 'private' | 'dept';
  is_pinned: boolean;
  parent_post_id: string | null;
  meta?: {
    due?: string; // ISO timestamp for tasks
    assignee?: string; // For tasks
    when?: string; // ISO timestamp for events
    location?: string; // For events
    options?: string[]; // For polls
    votes?: number[]; // For polls
    [key: string]: any; // Allow other metadata
  };
  created_at: string;
  updated_at: string;
  
  // Relations (joined)
  author?: FeedProfile;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

export interface FeedComment {
  id: string;
  post_id: string;
  author_id: number;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  author?: FeedProfile;
}

