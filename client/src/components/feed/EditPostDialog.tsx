import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeedPost } from "@/hooks/useFeedPosts";
import { useFeedPostMutations } from "@/hooks/useFeedPostMutations";

interface EditPostDialogProps {
  post: FeedPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPostDialog = ({
  post,
  open,
  onOpenChange,
}: EditPostDialogProps) => {
  const [content, setContent] = useState("");
  const { updatePost } = useFeedPostMutations();

  useEffect(() => {
    if (post) {
      setContent(post.content);
    }
  }, [post]);

  const handleSave = () => {
    if (!post || !content.trim()) return;

    updatePost.mutate(
      {
        id: post.id,
        data: { content: content.trim() },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px]"
            placeholder="What's on your mind?"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!content.trim() || updatePost.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

