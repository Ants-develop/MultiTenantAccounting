import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeedPost } from "@/hooks/useFeedPosts";
import { useFeedPostMutations } from "@/hooks/useFeedPostMutations";
import { useAuth } from "@/hooks/useAuth";
import { CommentSection } from "./CommentSection";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MoreHorizontal, Pin, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: FeedPost;
  onEdit: (post: FeedPost) => void;
}

export const PostCard = ({ post, onEdit }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();
  const { toggleLike, deletePost, togglePin } = useFeedPostMutations();

  const isAuthor = user?.id === post.authorId;
  const isAdmin = user?.globalRole === "global_administrator";
  const canDelete = isAuthor || isAdmin;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getFullName = () => {
    if (post.author) {
      return `${post.author.firstName} ${post.author.lastName}`;
    }
    return "Unknown User";
  };

  const handleLike = () => {
    toggleLike.mutate(post.id);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post?")) {
      deletePost.mutate(post.id);
    }
  };

  const handlePin = () => {
    togglePin.mutate(post.id);
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {post.author
                  ? getInitials(post.author.firstName, post.author.lastName)
                  : "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{getFullName()}</span>
                {post.isPinned && (
                  <Pin className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {(isAuthor || canDelete || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthor && (
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={handlePin}>
                    <Pin className="mr-2 h-4 w-4" />
                    {post.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <div className="mt-3 whitespace-pre-wrap">{post.content}</div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          {(post.likesCount || 0) > 0 && (
            <span>
              {post.likesCount} {post.likesCount === 1 ? "like" : "likes"}
            </span>
          )}
          {(post.commentsCount || 0) > 0 && (
            <span>
              {post.commentsCount}{" "}
              {post.commentsCount === 1 ? "comment" : "comments"}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-1 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn("flex-1", post.userHasLiked && "text-red-500")}
          >
            <Heart
              className={cn(
                "mr-2 h-4 w-4",
                post.userHasLiked && "fill-current"
              )}
            />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Comment
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && <CommentSection postId={post.id} />}
      </CardContent>
    </Card>
  );
};

