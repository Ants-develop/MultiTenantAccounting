import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFeedPostComments } from "@/hooks/useFeedPosts";
import { useFeedPostMutations } from "@/hooks/useFeedPostMutations";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Send, Loader2 } from "lucide-react";

interface CommentSectionProps {
  postId: number;
}

export const CommentSection = ({ postId }: CommentSectionProps) => {
  const [newComment, setNewComment] = useState("");
  const { data: comments = [], isLoading } = useFeedPostComments(postId);
  const { createComment } = useFeedPostMutations();
  const { user } = useAuth();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return "U";
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    createComment.mutate(
      {
        postId,
        data: { content: newComment.trim() },
      },
      {
        onSuccess: () => {
          setNewComment("");
        },
      }
    );
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {comment.author
                    ? getInitials(
                        comment.author.firstName,
                        comment.author.lastName
                      )
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <p className="text-sm font-medium">
                    {comment.author
                      ? `${comment.author.firstName} ${comment.author.lastName}`
                      : "Unknown User"}
                  </p>
                  <p className="text-sm">{comment.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 px-3">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          No comments yet. Be the first to comment!
        </p>
      )}

      {/* Add Comment */}
      <div className="flex gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || createComment.isPending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

