import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useFeedPostMutations } from "@/hooks/useFeedPostMutations";
import { Send } from "lucide-react";

export const CreatePostCard = () => {
  const [content, setContent] = useState("");
  const { user } = useAuth();
  const { createPost } = useFeedPostMutations();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return "U";
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    createPost.mutate(
      { content: content.trim() },
      {
        onSuccess: () => {
          setContent("");
        },
      }
    );
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || createPost.isPending}
                size="sm"
              >
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


