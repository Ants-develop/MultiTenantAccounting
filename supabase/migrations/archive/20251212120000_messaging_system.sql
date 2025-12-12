-- Messaging System Tables

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id serial PRIMARY KEY,
    title text,
    type text NOT NULL DEFAULT 'direct',
    client_id integer,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_message_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL
);

-- Conversation Participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id serial PRIMARY KEY,
    conversation_id integer REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id integer NOT NULL,
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_read_at timestamp with time zone,
    is_muted boolean DEFAULT false NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id serial PRIMARY KEY,
    conversation_id integer REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id integer NOT NULL,
    content text NOT NULL,
    type text NOT NULL DEFAULT 'text',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Creators can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their participant status" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- RLS Policies for conversations
-- Users can view conversations they are part of
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT
    USING (
        created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email') OR
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id AND user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT
    WITH CHECK (
        created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- Users can update conversations they created
CREATE POLICY "Users can update their conversations" ON public.conversations
    FOR UPDATE
    USING (
        created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- RLS Policies for conversation_participants
-- Users can view participants of conversations they belong to
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
    FOR SELECT
    USING (
        user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email') OR
        EXISTS (
            SELECT 1 FROM public.conversation_participants as cp
            WHERE cp.conversation_id = conversation_id 
            AND cp.user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

-- Conversation creators can add participants
CREATE POLICY "Creators can add participants" ON public.conversation_participants
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id AND created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

-- Users can update their own participant record (last_read_at, is_muted)
CREATE POLICY "Users can update their participant status" ON public.conversation_participants
    FOR UPDATE
    USING (
        user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- RLS Policies for messages
-- Users can view messages in conversations they are part of
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id 
            AND user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

-- Users can send messages to conversations they are part of
CREATE POLICY "Users can send messages to their conversations" ON public.messages
    FOR INSERT
    WITH CHECK (
        sender_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email') AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id 
            AND user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE
    USING (
        sender_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- Users can delete their own messages (soft delete)
CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE
    USING (
        sender_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- Realtime
-- Add tables to publication if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;

-- Function to update last_message_at on conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_message_at when a message is inserted
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();
