import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface CommentSectionProps {
  postId: string;
  comments?: Comment[];
  isLoading?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  isAdmin?: boolean;
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export const CommentSection = ({ 
  postId,
  comments = [],
  isLoading = false,
  currentUserId,
  currentUserName = 'User',
  isAdmin = false,
  onAddComment,
  onDeleteComment,
}: CommentSectionProps) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(currentUserName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => {
              const canDelete = currentUserId === comment.author_id || isAdmin;

              return (
                <div key={comment.id} className="flex gap-2 group">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(comment.author?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <span className="font-medium text-sm">
                        {comment.author?.full_name || 'Unknown User'}
                      </span>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {canDelete && onDeleteComment && (
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
