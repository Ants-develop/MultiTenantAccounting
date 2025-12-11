import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  MessageSquare,
  ListTodo,
  Calendar,
  Vote,
  Plus,
  Bell,
  Search,
  Users,
  Sparkles,
  Heart,
  Share2,
  Paperclip,
  Image as ImageIcon,
  Send,
  MoreHorizontal,
  X,
} from 'lucide-react';

import { 
  useFeedPosts, 
  useCreateFeedPost, 
  useToggleLike, 
  usePostLikes, 
  usePostComments, 
  useCreateComment 
} from '@/hooks/useFeedPosts';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSync } from '@/hooks/useProfileSync';
import { FeedPost, FeedItemType, FeedComment } from '@/types/feed';

// -------------------- Subcomponents --------------------

function IconButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-muted/40 hover:bg-muted transition"
    >
      {children}
    </button>
  );
}

function SmartToolbar({ onModeChange, composerMode, onFilter }: any) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => onModeChange('message')}>
            <MessageSquare className="h-4 w-4" /> Message
          </IconButton>
          <IconButton onClick={() => onModeChange('task')}>
            <ListTodo className="h-4 w-4" /> Task
          </IconButton>
          <IconButton onClick={() => onModeChange('event')}>
            <Calendar className="h-4 w-4" /> Event
          </IconButton>
          <IconButton onClick={() => onModeChange('poll')}>
            <Vote className="h-4 w-4" /> Poll
          </IconButton>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <div className="relative">
            <input
              onChange={(e) => onFilter(e.target.value)}
              placeholder="Search feed..."
              className="rounded-full border px-3 py-1 text-sm w-64"
            />
            <Search className="absolute right-2 top-1.5 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> 12 online
        </div>
        <button className="rounded-full p-2 bg-muted/40 hover:bg-muted transition">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PostComposer({ mode, onCreate, userId }: { mode: FeedItemType; onCreate: (item: FeedPost) => void; userId?: number }) {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { user } = useAuth();
  const { mutate: createPost, isPending: loading } = useCreateFeedPost(userId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!content.trim() || !user) return;

    createPost(
      { type: mode, content },
      {
        onSuccess: (result) => {
          onCreate(result);
          setContent('');
          setSelectedFiles([]);
        },
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const isDisabled = !content.trim() || loading;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {user?.firstName?.[0] || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Create {mode}</div>
            <div className="text-xs text-muted-foreground">Public</div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={`Share an update with your team...`}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                  <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                  <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                title="Add image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setContent('')} className="text-sm text-muted-foreground hover:text-gray-700">
                Clear
              </button>
              <button
                onClick={submit}
                disabled={isDisabled}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ item }: { item: FeedPost }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { mutate: toggleLike } = useToggleLike();
  const { data: likesData } = usePostLikes(item.id);
  const { data: commentsData } = usePostComments(item.id);
  const { mutate: createComment } = useCreateComment();

  const likesCount = likesData?.count || 0;
  const userLiked = likesData?.userLiked || false;
  const comments = (commentsData || []) as FeedComment[];

  const handleLike = () => {
    toggleLike(item.id);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    createComment({ postId: item.id, content: commentText });
    setCommentText('');
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200"
    >
      {/* Post Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {item.author?.full_name?.[0] || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{item.author?.full_name || 'Unknown'}</h3>
            <p className="text-sm text-gray-500 capitalize">
              {item.type} · {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 whitespace-pre-wrap">{item.content}</p>

        {/* Type-specific rendering */}
        {item.type === 'task' && item.meta && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-blue-900">
              <ListTodo className="w-4 h-4" />
              <span className="font-medium">Task Details</span>
            </div>
            <div className="mt-2 space-y-1 text-blue-800">
              <div>Due: {item.meta.due ? new Date(item.meta.due).toLocaleDateString() : 'No due date'}</div>
              <div>Assignee: {item.meta.assignee || 'Unassigned'}</div>
            </div>
          </div>
        )}

        {item.type === 'event' && item.meta && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-purple-900">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Event Details</span>
            </div>
            <div className="mt-2 space-y-1 text-purple-800">
              <div>When: {item.meta.when ? new Date(item.meta.when).toLocaleString() : 'TBD'}</div>
              <div>Location: {item.meta.location || 'TBD'}</div>
            </div>
          </div>
        )}

        {item.type === 'poll' && item.meta && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-900 text-sm font-medium mb-2">
              <Vote className="w-4 h-4" />
              <span>Poll Options</span>
            </div>
            <div className="space-y-2">
              {item.meta.options?.map((opt: string, i: number) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 border border-green-300 rounded-lg hover:bg-green-100 transition text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    <span className="text-green-700 font-medium">{item.meta?.votes?.[i] ?? 0} votes</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Post Stats */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center text-sm text-gray-500">
        <span>{likesCount} likes</span>
        <span className="mx-2">·</span>
        <span>{comments.length} comments</span>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center space-x-1">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-50 transition ${
            userLiked ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          <Heart className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`} />
          <span className="font-medium">Like</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-50 transition text-gray-600"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">Comment</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-50 transition text-gray-600">
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {comments.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {comment.author?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-sm text-gray-900">{comment.author?.full_name || 'Unknown'}</h4>
                  <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      {showComments && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              ME
            </div>
            <div className="flex-1 flex items-end space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Write a comment..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  );
}

function RightWidgets() {
  return (
    <div className="w-80 space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ListTodo className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold">My Tasks</h3>
        </div>
        <p className="text-sm text-muted-foreground">2 due today</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-purple-600" />
          <h3 className="font-semibold">Upcoming Events</h3>
        </div>
        <p className="text-sm text-muted-foreground">1 event this week</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-yellow-600" />
          <h3 className="font-semibold">Popular Posts</h3>
        </div>
        <p className="text-sm text-muted-foreground">This week's top content</p>
      </div>
    </div>
  );
}

// -------------------- Main Feed Component --------------------

export default function FeedBitrix() {
  const { user } = useAuth();
  useProfileSync();

  const [composerMode, setComposerMode] = useState<FeedItemType>('message');
  const [search, setSearch] = useState('');
  const [pendingNew, setPendingNew] = useState<FeedPost[]>([]);

  const { data: feedData, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } = useFeedPosts();

  const feed = useMemo(() => {
    if (!feedData?.pages) return [];
    return feedData.pages.flatMap((page) => page);
  }, [feedData?.pages]);

  const filtered = useMemo(() => {
    if (!search.trim()) return feed;
    const q = search.toLowerCase();
    return feed.filter(
      (f) =>
        f.content.toLowerCase().includes(q) || f.author?.full_name.toLowerCase().includes(q)
    );
  }, [feed, search]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage || !hasNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const handleCreate = (item: FeedPost) => {
    setPendingNew((prev) => [item, ...prev]);
  };

  const revealPending = useCallback(() => {
    if (pendingNew.length === 0) return;
    setPendingNew([]);
  }, [pendingNew.length]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Feed (Bitrix24)</h1>
          <p className="text-muted-foreground">
            Share updates with your team — unified feed (messages, tasks, events, polls)
          </p>
        </div>

        <SmartToolbar
          onModeChange={(m: FeedItemType) => setComposerMode(m)}
          composerMode={composerMode}
          onFilter={(q: string) => setSearch(q)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main column */}
          <div className="min-w-0 space-y-4">
            <PostComposer mode={composerMode} onCreate={handleCreate} userId={user?.id} />

            {pendingNew.length > 0 && (
              <div className="mx-auto w-full md:w-1/2">
                <button
                  onClick={() => revealPending()}
                  className="w-full flex items-center justify-center gap-3 rounded-full border px-4 py-2 bg-blue-50 border-blue-200 hover:bg-blue-100 transition"
                >
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-900 font-medium">{pendingNew.length} new posts</span>
                </button>
              </div>
            )}

            {/* Feed list */}
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((it) => (
                  <PostCard key={it.id} item={it} />
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg border border-gray-200">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No posts yet</h3>
                  <p className="text-muted-foreground">Create the first update — it's public to your team</p>
                </div>
              )}

              <div ref={loadMoreRef as any} />

              {!hasNextPage && feed.length > 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">You're all caught up</div>
              )}

              {isFetchingNextPage && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="hidden lg:block sticky top-6 self-start">
            <RightWidgets />
          </div>
        </div>
      </div>
    </div>
  );
}
