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
} from 'lucide-react';

import { useFeedPosts, useCreateFeedPost } from '@/hooks/useFeedPosts';
import { useAuth } from '@/hooks/useAuth';
import { useProfileSync } from '@/hooks/useProfileSync';
import { FeedPost, FeedItemType } from '@/types/feed';

// -------------------- Subcomponents --------------------

function IconButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-muted/40 hover:bg-muted"
    >
      {children}
    </button>
  );
}

function SmartToolbar({ onModeChange, composerMode, onFilter }: any) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
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

        <button className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" /> Create
        </button>

        <button className="rounded-full p-2 bg-muted/40">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PostComposer({ mode, onCreate, userId }: { mode: FeedItemType; onCreate: (item: FeedPost) => void; userId?: number }) {
  const [content, setContent] = useState('');
  const { user } = useAuth();
  const { mutate: createPost, isPending: loading } = useCreateFeedPost(userId);

  const submit = async () => {
    if (!content.trim() || !user) return;

    createPost(
      { type: mode, content },
      {
        onSuccess: (result) => {
          onCreate(result);
          setContent('');
        },
      }
    );
  };

  // Button is disabled when content is empty or loading
  const isDisabled = !content.trim() || loading;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          {user?.firstName?.[0] || 'U'}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Create {mode}</div>
            <div className="text-xs text-muted-foreground">Public</div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={`Write a ${mode}...`}
            className="mt-2 w-full resize-none rounded-md border px-3 py-2 text-sm"
          />

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button className="rounded-full p-2 hover:bg-muted">📎</button>
              <button className="rounded-full p-2 hover:bg-muted">😊</button>
              <button className="rounded-full p-2 hover:bg-muted">@</button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setContent('')} className="text-sm text-muted-foreground">
                Clear
              </button>

              <button
                onClick={submit}
                disabled={isDisabled}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isDisabled
                    ? 'bg-primary/50 text-primary-foreground/50 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ item }: { item: FeedPost }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-lg border bg-white p-4 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm">
            {item.author?.full_name?.[0] || 'U'}
          </div>

          <div>
            <div className="text-sm font-medium">{item.author?.full_name || 'Unknown'}</div>
            <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground capitalize">{item.type}</div>
      </header>

      <div className="mt-3 text-sm">{item.content}</div>

      {/* type-specific rendering */}
      {item.type === 'task' && item.meta && (
        <div className="mt-3 rounded-md border p-3 bg-muted/5 text-sm">
          <div>Task due: {item.meta.due ? new Date(item.meta.due).toLocaleDateString() : 'No due date'}</div>
          <div className="text-muted-foreground">Assignee: {item.meta.assignee || 'Unassigned'}</div>
        </div>
      )}

      {item.type === 'event' && item.meta && (
        <div className="mt-3 rounded-md border p-3 bg-muted/5 text-sm">
          <div>Event: {item.meta.when ? new Date(item.meta.when).toLocaleString() : 'TBD'}</div>
          <div className="text-muted-foreground">Location: {item.meta.location || 'TBD'}</div>
        </div>
      )}

      {item.type === 'poll' && item.meta && (
        <div className="mt-3">
          <div className="text-sm">Options:</div>
          <div className="mt-2 flex gap-2">
            {item.meta.options?.map((opt: string, i: number) => (
              <div key={i} className="rounded-md border px-3 py-1 text-sm">
                {opt} — {item.meta?.votes?.[i] ?? 0}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <button className="hover:text-primary">Like</button>
        <button className="hover:text-primary">Comment</button>
        <button className="hover:text-primary">Share</button>
      </footer>
    </motion.article>
  );
}

function RightWidgets() {
  return (
    <div className="w-80 space-y-4">
      <div className="rounded-lg border bg-background p-4">
        My Tasks
        <br />
        <small className="text-muted-foreground">2 due today</small>
      </div>

      <div className="rounded-lg border bg-background p-4">
        Upcoming Events
        <br />
        <small className="text-muted-foreground">1 event</small>
      </div>

      <div className="rounded-lg border bg-background p-4">
        Popular Posts
        <br />
        <small className="text-muted-foreground">This week</small>
      </div>
    </div>
  );
}

// -------------------- Main Feed Component --------------------

export default function FeedBitrix() {
  // Sync the current user's profile to the feed system
  const { user } = useAuth();
  useProfileSync();

  const [composerMode, setComposerMode] = useState<FeedItemType>('message');
  const [search, setSearch] = useState('');
  const [pendingNew, setPendingNew] = useState<FeedPost[]>([]);

  const { data: feedData, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } = useFeedPosts();

  // Flatten paginated data into a single array
  const feed = useMemo(() => {
    if (!feedData?.pages) return [];
    return feedData.pages.flatMap((page) => page);
  }, [feedData?.pages]);

  // Simple client-side filter
  const filtered = useMemo(() => {
    if (!search.trim()) return feed;
    const q = search.toLowerCase();
    return feed.filter(
      (f) =>
        f.content.toLowerCase().includes(q) ||
        f.author?.full_name.toLowerCase().includes(q)
    );
  }, [feed, search]);

  // Infinite scroll
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
    // Immediately add locally (the hook will also invalidate and refetch)
    setPendingNew((prev) => [item, ...prev]);
  };

  const revealPending = useCallback(() => {
    if (pendingNew.length === 0) return;
    // Pending items are already shown via feedData query invalidation
    setPendingNew([]);
  }, [pendingNew.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Feed (Bitrix24)</h1>
        <p className="text-muted-foreground">
          Share updates with your team — unified feed (messages, tasks, events, polls)
        </p>
      </div>

      <div className="space-y-4">
        <SmartToolbar
          onModeChange={(m: FeedItemType) => setComposerMode(m)}
          composerMode={composerMode}
          onFilter={(q: string) => setSearch(q)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main column */}
          <div className="min-w-0 space-y-4">
            {/* Composer */}
            <PostComposer mode={composerMode} onCreate={handleCreate} userId={user?.id} />

            {/* New posts banner when pending */}
            {pendingNew.length > 0 && (
              <div className="mx-auto w-full md:w-1/2">
                <div className="flex items-center justify-between rounded-full border px-4 py-2 bg-background">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4" /> <div>{pendingNew.length} new posts</div>
                  </div>

                  <div>
                    <button onClick={() => revealPending()} className="text-sm text-primary">
                      Show
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feed list */}
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((it) => (
                  <PostCard key={it.id} item={it} />
                ))}
              </AnimatePresence>

              {/* loader / empty */}
              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No posts yet</h3>
                  <p className="text-muted-foreground">
                    Create the first update — it's public to your team
                  </p>
                </div>
              )}

              {/* sentinel for infinite scroll */}
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

