import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useFeedPosts } from "@/hooks/useFeedPosts";

export const PopularPostsWidget = () => {
  const { data: posts = [] } = useFeedPosts();
  
  // Get top 3 most liked posts
  const popularPosts = [...posts]
    .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
    .slice(0, 3);

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Popular Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {popularPosts.length > 0 && popularPosts[0].likesCount! > 0 ? (
          <div className="space-y-3">
            {popularPosts.map((post) => (
              <div key={post.id} className="pb-3 border-b last:border-0">
                <p className="text-sm line-clamp-2">{post.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {post.likesCount} likes · {post.commentsCount} comments
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No popular posts yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};


