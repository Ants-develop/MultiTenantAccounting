import { useFeedPosts } from '@/hooks/useFeedPosts';
import { PostComposer } from '@/components/feed/PostComposer';
import { PostCard } from '@/components/feed/PostCard';
import { useProfileSync } from '@/hooks/useProfileSync';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeedPage() {
    useProfileSync(); // Ensure profile is synced
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useFeedPosts();

    const posts = data?.pages.flatMap(page => page) || [];

    return (
        <div className="w-full py-8 px-4">
            <h1 className="text-2xl font-semibold mb-6 text-gray-900">Activity Feed</h1>
            
            <div className="flex gap-6">
                {/* Main Feed Column */}
                <div className="flex-1 max-w-3xl min-w-0">
                    <PostComposer onPostCreated={() => refetch()} />

                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                {posts.map(post => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                                
                                {hasNextPage && (
                                    <div className="flex justify-center pt-6 pb-8">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="min-w-[120px]"
                                        >
                                            {isFetchingNextPage ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                                            ) : 'Load More'}
                                        </Button>
                                    </div>
                                )}
                                
                                {!hasNextPage && posts.length > 0 && (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        You've reached the end of the feed
                                    </div>
                                )}

                                {!isLoading && posts.length === 0 && (
                                    <div className="text-center text-muted-foreground py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <h3 className="text-lg font-medium text-gray-900 mb-1">No posts yet</h3>
                                        <p>Be the first to share something with your team!</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Widgets Column */}
                <div className="hidden lg:block w-80 flex-shrink-0 space-y-4 sticky top-6 self-start">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="font-medium mb-3 text-gray-900">Upcoming Events</h3>
                        <p className="text-sm text-muted-foreground">No upcoming events.</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="font-medium mb-3 text-gray-900">Online Users</h3>
                        <div className="flex -space-x-2 overflow-hidden">
                             {/* Placeholder avatars */}
                             <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200" />
                             <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-300" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

