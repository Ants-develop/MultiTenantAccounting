import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Plus, Search, Send, Paperclip, Mic, User as UserIcon } from "lucide-react";
import {
  useConversations,
  useSendMessage,
  Message,
} from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UserSearchDialog } from "@/components/messages/UserSearchDialog";
import { UserProfileDialog } from "@/components/messages/UserProfileDialog";
import { UserProfile } from "@/hooks/useUserProfiles";

const Messages = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: conversationsLoading } =
    useConversations();

  const { data: selectedConversation } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participants:conversation_participants(
            id,
            user_id,
            user:users(id, display_name, avatar_url)
          ),
          messages:conversation_messages(
            id,
            content,
            created_at,
            created_by,
            created_by_user:users(id, display_name, avatar_url),
            reactions:message_reactions(*)
          )
        `
        )
        .eq("id", selectedConversationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversationId,
  });

  const sendMessage = useSendMessage();

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversation_id: selectedConversationId,
        content: messageText,
        message_type: "text",
      });
      setMessageText("");
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredConversations = conversations?.filter(
    (conv) =>
      !searchTerm ||
      conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.participants?.some((p: any) =>
        p.user?.display_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
  );

  const handleSelectUser = (user: UserProfile) => {
    // TODO: Create or find direct conversation with this user
    toast.success(`Starting conversation with ${user.displayName}`);
    // You would implement conversation creation here
  };

  const handleViewProfile = (userId: number) => {
    setSelectedUserId(userId);
    setProfileDialogOpen(true);
    setUserSearchOpen(false);
  };

  const handleSendMessageToUser = (userId: number) => {
    setProfileDialogOpen(false);
    // TODO: Create or navigate to conversation with this user
    toast.success("Opening conversation...");
  };

  return (
    <div className="h-full flex gap-6 p-6 bg-white">
      {/* Conversations List */}
      <Card className="w-96 flex flex-col flex-shrink-0">
        <CardHeader className="border-b">
          <div className="space-y-4">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button 
              className="w-full"
              onClick={() => setUserSearchOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {conversationsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading conversations...
              </div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map((conversation: any) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConversationId === conversation.id
                      ? "bg-blue-100 border-l-4 border-blue-500"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {conversation.type === "direct" && conversation.participants?.[0]?.user ? (
                      <Avatar>
                        <AvatarImage
                          src={
                            conversation.participants[0].user.avatar_url || ""
                          }
                        />
                        <AvatarFallback>
                          {conversation.participants[0].user.display_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold">
                        {conversation.title?.[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">
                        {conversation.title ||
                          conversation.participants
                            ?.map((p: any) => p.user?.display_name)
                            .join(", ")}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.messages?.[0]?.content.substring(0, 40)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No conversations
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      {selectedConversation ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedConversation.title ||
                  selectedConversation.participants
                    ?.map((p: any) => p.user?.display_name)
                    .join(", ")}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {selectedConversation.participants?.length} participants
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
            <div className="space-y-4">
              {selectedConversation.messages?.length > 0 ? (
                selectedConversation.messages.map((message: Message) => (
                  <div
                    key={message.id}
                    className="flex gap-3 group"
                  >
                    <Avatar 
                      className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => {
                        // Open profile for message sender
                        // You would extract user ID from message.created_by
                        toast.info("User profile coming soon");
                      }}
                    >
                      <AvatarImage
                        src={
                          message.created_by_user?.avatar_url || ""
                        }
                      />
                      <AvatarFallback>
                        {message.created_by_user?.display_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-sm font-semibold cursor-pointer hover:underline"
                          onClick={() => {
                            toast.info("User profile coming soon");
                          }}
                        >
                          {message.created_by_user?.display_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-sm">{message.content}</p>
                      </div>
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {message.reactions.map((reaction: any) => (
                            <span
                              key={reaction.id}
                              className="text-lg"
                            >
                              {reaction.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <CardContent className="border-t p-4">
            <div className="flex gap-3">
              <Button size="icon" variant="outline">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline">
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center text-muted-foreground">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="mb-4">Select a conversation to start messaging</p>
            <Button onClick={() => setUserSearchOpen(true)}>
              <UserIcon className="h-4 w-4 mr-2" />
              Search Users
            </Button>
          </CardContent>
        </Card>
      )}

      {/* User Search Dialog */}
      <UserSearchDialog
        open={userSearchOpen}
        onOpenChange={setUserSearchOpen}
        onSelectUser={handleSelectUser}
        onViewProfile={handleViewProfile}
      />

      {/* User Profile Dialog */}
      <UserProfileDialog
        userId={selectedUserId}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        onSendMessage={handleSendMessageToUser}
      />
    </div>
  );
};

export default Messages;
