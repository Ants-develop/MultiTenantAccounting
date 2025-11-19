-- Migration: Add messaging and notifications tables
-- Description: Creates tables for conversations, messages, and notifications system
-- Author: System
-- Date: 2025-11-19

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  title TEXT,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'client')),
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'file', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Update notifications table if it exists, or create it
DO $$
BEGIN
  -- Check if notifications table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
      ALTER TABLE notifications ADD COLUMN link TEXT;
    END IF;
    
    -- Update type column to support new types
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
      CHECK (type IN ('info', 'success', 'warning', 'error', 'task', 'message', 'document'));
  ELSE
    -- Create notifications table if it doesn't exist
    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'task', 'message', 'document')),
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP WITH TIME ZONE
    );
  END IF;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON conversations TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON messages TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO PUBLIC;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE conversations_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE conversation_participants_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO PUBLIC;

-- Add comments
COMMENT ON TABLE conversations IS 'Stores conversation groups for messaging';
COMMENT ON TABLE conversation_participants IS 'Tracks which users are part of which conversations';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE notifications IS 'System notifications for users';
