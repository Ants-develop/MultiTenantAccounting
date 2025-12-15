import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  Video,
  Info,
  CheckCheck,
  Check,
  Image as ImageIcon,
  File,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useConversations,
  useCreateConversation,
  useSendMessage,
} from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UserSearchDialog } from "@/components/messages/UserSearchDialog";
import { UserProfileDialog } from "@/components/messages/UserProfileDialog";
import { UserProfile } from "@/hooks/useUserProfiles";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const Messages = () => {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const createConversation = useCreateConversation();

  const { data: selectedConversation, refetch: refetchMessages } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          participants:conversation_participants(
            id,
            user_id,
            last_read_at,
            user:profiles!conversation_participants_user_id_fkey(id, full_name, email, avatar_url)
          ),
          messages(
            id,
            content,
            type,
            metadata,
            created_at,
            updated_at,
            is_edited,
            is_deleted,
            sender_id,
            sender:profiles!messages_sender_id_fkey(id, full_name, email, avatar_url)
          )
        `)
        .eq("id", selectedConversationId)
        .order('created_at', { referencedTable: 'messages', ascending: true })
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConversationId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const sendMessage = useSendMessage();

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversationId) return;

    const channel = supabase
      .channel(`conversation:${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, refetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  // Mark conversation as read when opened (Signal-like behavior)
  useEffect(() => {
    if (!selectedConversationId || !user?.id) return;

    const markRead = async () => {
      const now = new Date().toISOString();
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: now })
        .eq("conversation_id", parseInt(selectedConversationId))
        .eq("user_id", user.id);
    };

    markRead();
  }, [selectedConversationId, user?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversation_id: parseInt(selectedConversationId),
        content: messageText,
        type: 'text',
        metadata: attachments.length > 0 ? { attachments: attachments.map(f => f.name) } : {},
      });
      setMessageText("");
      setAttachments([]);
      setIsTyping(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      // TODO: Send typing indicator to other participants
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const filteredConversations = conversations?.filter(
    (conv) =>
      !searchTerm ||
      conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.participants?.some((p: any) =>
        `${p.user?.first_name} ${p.user?.last_name}`
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
  );

  const getConversationTitle = (conversation: any) => {
    if (conversation?.title) return conversation.title;
    const others = (conversation?.participants || []).filter(
      (p: any) => p.user_id !== user?.id
    );
    const names = others
      .map((p: any) => `${p.user?.first_name || ""} ${p.user?.last_name || ""}`.trim())
      .filter(Boolean);
    return names.join(", ") || "Conversation";
  };

  const getPrimaryOtherParticipant = (conversation: any) => {
    return (conversation?.participants || []).find(
      (p: any) => p.user_id !== user?.id
    );
  };

  const handleSelectUser = async (user: UserProfile) => {
    setUserSearchOpen(false);
    
    // Check if conversation already exists with this user
    const existingConversation = conversations?.find(conv => 
      conv.participants?.some((p: any) => p.user_id === user.id)
    );
    
    if (existingConversation) {
      setSelectedConversationId(String(existingConversation.id));
      toast.success(`Opening conversation with ${user.displayName}`);
    } else {
      // Create new conversation
      try {
        const result = await createConversation.mutateAsync({
          title: null,
          is_group: false,
          participant_ids: [user.id]
        });
        
        setSelectedConversationId(String(result.id));
        toast.success(`New conversation created with ${user.displayName}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create conversation";
        toast.error(message);
      }
    }
  };

  const handleViewProfile = (userId: number) => {
    setSelectedUserId(userId);
    setProfileDialogOpen(true);
    setUserSearchOpen(false);
  };

  const handleSendMessageToUser = async (userId: number) => {
    setProfileDialogOpen(false);
    
    // Check if conversation already exists with this user
    const existingConversation = conversations?.find(conv => 
      conv.participants?.some((p: any) => p.user_id === userId)
    );
    
    if (existingConversation) {
      setSelectedConversationId(String(existingConversation.id));
      toast.success("Opening conversation");
    } else {
      // Create new conversation
      try {
        const result = await createConversation.mutateAsync({
          title: null,
          is_group: false,
          participant_ids: [userId]
        });
        setSelectedConversationId(String(result.id));
        toast.success("New conversation created");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create conversation";
        toast.error(message);
      }
    }
  };

  const getMessageStatus = (message: any) => {
    if (message.sender_id !== user?.id) return null;

    // The current messages schema does not include delivered/read timestamps.
    // Keep a simple "sent" indicator for now.
    return <Check className="h-3 w-3 text-gray-400" />;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex gap-0 bg-gray-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />
      
      {/* Conversations List */}
      <div className="w-80 flex flex-col border-r bg-white flex-shrink-0">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Messages</h2>
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setUserSearchOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversationsLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading conversations...
              </div>
            ) : filteredConversations && filteredConversations.length > 0 ? (
              filteredConversations.map((conversation: any) => {
                const otherParticipant = getPrimaryOtherParticipant(conversation);
                const participantName = getConversationTitle(conversation);
                const lastMessage = conversation.messages?.[0];
                const myParticipant = conversation.participants?.find((p: any) => p.user_id === user?.id);
                const hasUnread = (() => {
                  if (!lastMessage) return false;
                  if (String(conversation.id) === selectedConversationId) return false;

                  // If we don't have a last_read_at yet, treat as unread if the last message isn't ours.
                  if (!myParticipant?.last_read_at) {
                    return lastMessage.sender_id !== user?.id;
                  }

                  return new Date(lastMessage.created_at) > new Date(myParticipant.last_read_at);
                })();

                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(String(conversation.id))}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all mb-1",
                      selectedConversationId === String(conversation.id)
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                            {(participantName || "C")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator intentionally omitted (no presence data yet) */}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold truncate text-sm">
                            {participantName}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {lastMessage && formatMessageTime(lastMessage.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {lastMessage?.content?.substring(0, 40) || 'No messages yet'}
                          </p>
                          {hasUnread && (
                            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="mb-3">No conversations yet</p>
                <Button size="sm" onClick={() => setUserSearchOpen(true)}>
                  Start a conversation
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                  {(() => {
                    const other = getPrimaryOtherParticipant(selectedConversation);
                    const name = other?.user
                      ? `${other.user.first_name || ""} ${other.user.last_name || ""}`.trim()
                      : getConversationTitle(selectedConversation);
                    return (name || "C")[0]?.toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">
                  {getConversationTitle(selectedConversation)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isTyping ? "typing..." : "Active now"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost">
                <Phone className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost">
                <Video className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost">
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {selectedConversation.messages?.length > 0 ? (
                selectedConversation.messages.map((message: any, index: number) => {
                  const isOwnMessage = message.sender_id === user?.id;
                  const showAvatar = index === 0 || 
                    selectedConversation.messages[index - 1]?.sender_id !== message.sender_id;
                  const senderName = message.sender 
                    ? `${message.sender.first_name} ${message.sender.last_name}`
                    : 'Unknown';

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-2 group",
                        isOwnMessage ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isOwnMessage && showAvatar && (
                        <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-500 text-white">
                            {senderName[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwnMessage && !showAvatar && <div className="w-8" />}
                      
                      <div className={cn(
                        "flex flex-col gap-1 max-w-[70%]",
                        isOwnMessage && "items-end"
                      )}>
                        {showAvatar && !isOwnMessage && (
                          <span className="text-xs font-medium text-gray-700 px-1">
                            {senderName}
                          </span>
                        )}
                        <div className="relative group">
                          <div className={cn(
                            "rounded-2xl px-4 py-2 shadow-sm",
                            isOwnMessage 
                              ? "bg-blue-500 text-white" 
                              : "bg-gray-100 text-gray-900"
                          )}>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            {message.is_edited && (
                              <span className="text-xs opacity-70 ml-2">(edited)</span>
                            )}
                          </div>
                          
                          {/* Message actions */}
                          <div className={cn(
                            "absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                            isOwnMessage ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
                          )}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 bg-white shadow-sm border">
                                  <Smile className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                <div className="flex gap-1">
                                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                    <button
                                      key={emoji}
                                      className="text-xl hover:scale-125 transition-transform p-1"
                                      onClick={() => toast.success(`Reacted with ${emoji}`)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 bg-white shadow-sm border">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isOwnMessage ? "start" : "end"}>
                                {isOwnMessage && (
                                  <>
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem>Reply</DropdownMenuItem>
                                <DropdownMenuItem>Forward</DropdownMenuItem>
                                <DropdownMenuItem>Copy</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-1 px-1",
                          isOwnMessage ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(message.created_at)}
                          </span>
                          {isOwnMessage && getMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">No messages yet</p>
                  <p className="text-sm">Start the conversation by sending a message below!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <div className="flex gap-2 flex-wrap">
                {attachments.map((file, index) => (
                  <div key={index} className="relative bg-white border rounded-lg p-2 pr-8">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-end gap-2">
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost">
                <ImageIcon className="h-5 w-5" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={handleTyping}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="pr-10 rounded-full"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </div>
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessage.isPending}
                className="rounded-full h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-muted-foreground max-w-md">
            <MessageCircle className="h-24 w-24 mx-auto mb-6 opacity-20" />
            <h3 className="text-2xl font-semibold mb-2 text-gray-700">Select a conversation</h3>
            <p className="mb-6 text-gray-500">Choose a conversation from the list or start a new one to begin messaging</p>
            <Button onClick={() => setUserSearchOpen(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Start New Conversation
            </Button>
          </div>
        </div>
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
