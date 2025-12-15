import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface Conversation {
  id: number;
  title?: string | null;
  type: "direct" | "group";
  last_message_at?: string;
  unread_count?: number;
  created_at: string;
  participants?: ConversationParticipant[];
  messages?: Message[];
}

export interface ConversationParticipant {
  id: number;
  user_id: number;
  last_read_at?: string | null;
  user?: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  type?: "text" | "file" | "voice" | "image";
  metadata?: any;
  created_at: string;
  updated_at?: string;
  sender_id: number;
  is_deleted?: boolean;
  is_edited?: boolean;
  sender?: {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
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
            last_read_at,
            user:profiles!conversation_participants_user_id_fkey(id, full_name, avatar_url)
          ),
          messages:messages(
            id,
            content,
            type,
            metadata,
            created_at,
            sender_id,
            is_deleted,
            sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
          )
        `
        )
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("created_at", { referencedTable: "messages", ascending: false })
        .limit(1, { foreignTable: "messages" });

      if (error) throw error;
      return (data || []) as Conversation[];
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      title: string | null;
      is_group: boolean;
      participant_ids: number[];
      client_id?: number | null;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const participantIds = Array.from(
        new Set([user.id, ...(payload.participant_ids || [])])
      );

      if (!payload.is_group && participantIds.length !== 2) {
        throw new Error("Direct conversations must have exactly 2 participants");
      }

      // For direct conversations, try to find an existing one first.
      if (!payload.is_group) {
        const otherUserId = participantIds.find((id) => id !== user.id);
        if (!otherUserId) throw new Error("Missing other user");

        const { data: existing, error: existingError } = await supabase
          .from("conversations")
          .select(
            `
            id,
            type,
            participants:conversation_participants(user_id)
          `
          )
          .eq("type", "direct");

        if (existingError) throw existingError;

        const match = (existing || []).find((c: any) => {
          const ids = (c.participants || []).map((p: any) => p.user_id);
          return ids.length === 2 && ids.includes(user.id) && ids.includes(otherUserId);
        });

        if (match?.id) return { id: match.id } as any;
      }

      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert([
          {
            title: payload.title,
            type: payload.is_group ? "group" : "direct",
            client_id: payload.client_id ?? null,
            created_by: user.id,
          },
        ])
        .select("id")
        .single();

      if (conversationError) throw conversationError;

      const now = new Date().toISOString();
      const participantsRows = participantIds.map((id) => ({
        conversation_id: conversation.id,
        user_id: id,
        last_read_at: id === user.id ? now : null,
      }));

      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert(participantsRows);

      if (participantsError) throw participantsError;

      return conversation as { id: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      conversation_id: number;
      content: string;
      type?: "text" | "file" | "voice" | "image";
      metadata?: any;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: payload.conversation_id,
            content: payload.content,
            type: payload.type || "text",
            metadata: payload.metadata || {},
            sender_id: user.id,
          },
        ])
        .select(
          `
          *,
          sender:sender_id(id, full_name, avatar_url)
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
        .from("messages")
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
      // NOTE: message reactions table may not exist in the current schema.
      // This hook remains for backwards-compatibility; wire it up if/when
      // `message_reactions` is added.
      throw new Error("Message reactions are not implemented in this schema");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
