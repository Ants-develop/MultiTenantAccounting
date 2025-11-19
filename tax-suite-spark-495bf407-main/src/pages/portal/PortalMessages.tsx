import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { toast } from "sonner";

export const PortalMessages = () => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchConversations();
    } else if (profile && !profile.id) {
      setIsLoading(false);
    }
  }, [profile?.id]);

  const fetchConversations = async () => {
    if (!profile?.id) return;
    
    setIsLoading(true);
    try {
      // Get conversation IDs where user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", profile.id);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Fetch conversations
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const processedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: participants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.id);

          const userIds = participants?.map(p => p.user_id) || [];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("full_name, job_title")
            .in("id", userIds);

          return {
            ...conv,
            participants: profiles || [],
          };
        })
      );

      setConversations(processedConversations);

      if (processedConversations.length > 0 && !selectedConversationId) {
        setSelectedConversationId(processedConversations[0].id);
      }
    } catch (error: any) {
      toast.error("Failed to load conversations", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Communicate with your team</p>
      </div>

      {conversations.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
            <p className="text-muted-foreground">
              Your team will initiate conversations with you here
            </p>
          </div>
        </Card>
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
            {selectedConversation && (
              <MessageThread
                conversationId={selectedConversation.id}
                conversationTitle={selectedConversation.title || "Conversation"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
