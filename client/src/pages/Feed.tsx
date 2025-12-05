import { useState, useMemo } from "react";
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { CreatePostCard } from "@/components/feed/CreatePostCard";
import { PostCard } from "@/components/feed/PostCard";
import { EditPostDialog } from "@/components/feed/EditPostDialog";
import { FeedFilters } from "@/components/feed/FeedFilters";
import {
  UpcomingEventsWidget,
  MyTasksWidget,
  PopularPostsWidget,
} from "@/components/feed/widgets";
import { FeedPost } from "@/hooks/useFeedPosts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Newspaper, MessageSquare, ListTodo, Calendar, Vote } from "lucide-react";

type FeedTab = "message" | "task" | "event" | "poll";

const Feed = () => {
  const { data: posts, isLoading } = useFeedPosts();
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>("message");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (!searchQuery.trim()) return posts;

    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.content.toLowerCase().includes(query) ||
        (post.author?.firstName?.toLowerCase().includes(query) ?? false) ||
        (post.author?.lastName?.toLowerCase().includes(query) ?? false)
    );
  }, [posts, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Feed</h1>
        <p className="text-muted-foreground">Share updates with your team</p>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex gap-6">
        {/* Left Column - Main Feed */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-1">
              <TabsTrigger
                value="message"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </TabsTrigger>
              <TabsTrigger
                value="task"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
              >
                <ListTodo className="mr-2 h-4 w-4" />
                Task
              </TabsTrigger>
              <TabsTrigger
                value="event"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Event
              </TabsTrigger>
              <TabsTrigger
                value="poll"
                className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
              >
                <Vote className="mr-2 h-4 w-4" />
                Poll
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search/Filter */}
          <FeedFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} />

          {/* Create Post (only on message tab) */}
          {activeTab === "message" && <CreatePostCard />}

          {/* Content based on tab */}
          {activeTab === "message" ? (
            <>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} onEdit={setEditingPost} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Newspaper className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">
                    {searchQuery ? "No posts found" : "No posts yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try a different search term"
                      : "Be the first to share something with your team!"}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                {activeTab === "task" && <ListTodo className="h-6 w-6 text-muted-foreground" />}
                {activeTab === "event" && <Calendar className="h-6 w-6 text-muted-foreground" />}
                {activeTab === "poll" && <Vote className="h-6 w-6 text-muted-foreground" />}
              </div>
              <h3 className="mt-4 text-lg font-medium capitalize">{activeTab}s</h3>
              <p className="text-muted-foreground">
                {activeTab === "task" && "Task updates will appear here"}
                {activeTab === "event" && "Event updates will appear here"}
                {activeTab === "poll" && "Polls will appear here"}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Widgets (hidden on mobile) */}
        <div className="hidden lg:block w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
          <UpcomingEventsWidget />
          <MyTasksWidget />
          <PopularPostsWidget />
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPostDialog
        post={editingPost}
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
      />
    </div>
  );
};

export default Feed;

