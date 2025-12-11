import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";

export interface Conversation {
  id: string;
  title?: string | null;
  type: "direct" | "group";
  last_message_at?: string;
  unread_count?: number;
  created_at: string;
  participants?: ConversationParticipant[];
  messages?: Message[];
}

export interface ConversationParticipant {
  id: string;
  user_id: string;
  user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  message_type?: "text" | "file" | "voice" | "image";
  created_at: string;
  created_by: string;
  is_deleted?: boolean;
  created_by_user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  emoji: string;
  created_by: string;
}

export const useConversations = () => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Setup real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        subscriptionRef.current = supabase
          .channel("conversations")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "conversations" },
            (payload: any) => {
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Error setting up conversations subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
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
            message_type,
            created_at,
            created_by,
            is_deleted,
            created_by_user:users(id, display_name, avatar_url)
          )
        `
        )
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Conversation[];
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      conversation_id: string;
      content: string;
      message_type?: "text" | "file" | "voice" | "image";
    }) => {
      const token = getAccessToken();

      const { data, error } = await supabase
        .from("conversation_messages")
        .insert([
          {
            conversation_id: payload.conversation_id,
            content: payload.content,
            message_type: payload.message_type || "text",
            created_by: token,
          },
        ])
        .select(
          `
          *,
          created_by_user:users(id, display_name, avatar_url)
        `
        )
        .single();

      if (error) throw error;
      return data as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("conversation_messages")
        .update({ is_deleted: true })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useAddMessageReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      message_id: string;
      emoji: string;
    }) => {
      const token = getAccessToken();

      const { data, error } = await supabase
        .from("message_reactions")
        .insert([
          {
            message_id: payload.message_id,
            emoji: payload.emoji,
            created_by: token,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as MessageReaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
