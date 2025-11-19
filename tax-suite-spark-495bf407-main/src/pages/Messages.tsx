import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { NewConversationDialog } from "@/components/messages/NewConversationDialog";
import { toast } from "sonner";

const Messages = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const processedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          // Fetch participants
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.id);

          const userIds = participants?.map(p => p.user_id) || [];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("full_name")
            .in("id", userIds);

          // Fetch client if applicable
          let client = null;
          if (conv.client_id) {
            const { data: clientData } = await supabase
              .from("clients")
              .select("name")
              .eq("id", conv.client_id)
              .single();
            client = clientData;
          }

          return {
            ...conv,
            participants: profiles || [],
            client,
          };
        })
      );

      setConversations(processedConversations);

      // Auto-select first conversation
      if (processedConversations.length > 0 && !selectedConversationId) {
        setSelectedConversationId(processedConversations[0].id);
      }
    } catch (error: any) {
      toast("Failed to load conversations", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const getConversationTitle = (conv: any) => {
    if (conv.title) return conv.title;
    if (conv.client) return conv.client.name;
    if (conv.participants && conv.participants.length > 0) {
      return conv.participants.map((p: any) => p.full_name).join(", ");
    }
    return "Conversation";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Team communication and client messaging
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
            />
          </div>
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <MessageThread
                conversationId={selectedConversation.id}
                conversationTitle={getConversationTitle(selectedConversation)}
              />
            ) : (
              <Card className="h-[calc(100vh-12rem)] flex items-center justify-center">
                <CardContent>
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Select a conversation to start messaging
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={fetchConversations}
      />
    </div>
  );
};

export default Messages;
