import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Conversation, Message } from "@/types/messages";

// Mock conversations
const mockConversations: Conversation[] = [
    {
        id: "1",
        title: null,
        type: "direct",
        last_message_at: new Date().toISOString(),
        unread_count: 2,
        created_at: new Date().toISOString(),
        participants: [{ full_name: "John Doe" }],
    },
    {
        id: "2",
        title: "Project Team",
        type: "group",
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 0,
        created_at: new Date().toISOString(),
        participants: [{ full_name: "Jane Smith" }, { full_name: "Bob Johnson" }],
    },
    {
        id: "3",
        title: null,
        type: "direct",
        last_message_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date().toISOString(),
        client: { name: "Acme Corporation" },
    },
];

// Mock messages by conversation
const mockMessages: Record<string, Message[]> = {
    "1": [
        {
            id: "1-1",
            conversation_id: "1",
            content: "Hey, can we schedule a meeting for next week?",
            sender_id: "other",
            type: "text",
            created_at: new Date(Date.now() - 3600000).toISOString(),
            is_deleted: false,
            sender: { full_name: "John Doe" },
        },
        {
            id: "1-2",
            conversation_id: "1",
            content: "Sure! How about Tuesday at 2 PM?",
            sender_id: "current",
            type: "text",
            created_at: new Date(Date.now() - 1800000).toISOString(),
            is_deleted: false,
            sender: { full_name: "You" },
        },
        {
            id: "1-3",
            conversation_id: "1",
            content: "Perfect, I'll send a calendar invite.",
            sender_id: "other",
            type: "text",
            created_at: new Date().toISOString(),
            is_deleted: false,
            sender: { full_name: "John Doe" },
        },
    ],
    "2": [
        {
            id: "2-1",
            conversation_id: "2",
            content: "Great work on the presentation everyone!",
            sender_id: "other",
            type: "text",
            created_at: new Date(Date.now() - 7200000).toISOString(),
            is_deleted: false,
            sender: { full_name: "Jane Smith" },
        },
    ],
    "3": [
        {
            id: "3-1",
            conversation_id: "3",
            content: "Thanks for the tax filing services!",
            sender_id: "other",
            type: "text",
            created_at: new Date(Date.now() - 86400000).toISOString(),
            is_deleted: false,
            sender: { full_name: "Acme Corporation" },
        },
    ],
};

export function useConversations() {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch("/api/messages/conversations");
            // return await response.json();
            return mockConversations;
        },
    });
}

export function useMessages(conversationId: string) {
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/messages/conversations/${conversationId}/messages`);
            // return await response.json();
            return mockMessages[conversationId] || [];
        },
        enabled: !!conversationId,
    });
}

export function useMessageMutations(conversationId: string) {
    const queryClient = useQueryClient();

    const sendMessage = useMutation({
        mutationFn: async (content: string) => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify({ content }),
            // });
            // return await response.json();
            console.log("Send message:", content);

            const newMessage: Message = {
                id: Date.now().toString(),
                conversation_id: conversationId,
                content,
                sender_id: "current",
                type: "text",
                created_at: new Date().toISOString(),
                is_deleted: false,
                sender: { full_name: "You" },
            };

            // Update mock data
            if (!mockMessages[conversationId]) {
                mockMessages[conversationId] = [];
            }
            mockMessages[conversationId].push(newMessage);

            return newMessage;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
    });

    return { sendMessage };
}
