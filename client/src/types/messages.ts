export interface Conversation {
    id: string;
    title: string | null;
    type: 'direct' | 'group';
    last_message_at: string | null;
    unread_count?: number;
    created_at: string;
    participants?: Array<{ full_name: string }>;
    client?: { name: string };
}

export interface Message {
    id: string;
    conversation_id: string;
    content: string;
    sender_id: string;
    type: 'text' | 'file';
    created_at: string;
    is_deleted: boolean;
    sender?: { full_name: string };
}
