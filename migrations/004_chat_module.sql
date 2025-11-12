-- Chat Module Tables
-- Migration: 004_chat_module.sql
-- Description: Create tables for chat channels, messages, and channel membership

-- UP
-- Create chat module tables

-- Chat Channels Table
CREATE TABLE IF NOT EXISTS chat_channels (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_channels_company_id ON chat_channels(company_id);
CREATE INDEX idx_chat_channels_is_private ON chat_channels(is_private);
CREATE INDEX idx_chat_channels_created_by ON chat_channels(created_by);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_is_deleted ON chat_messages(is_deleted);

-- Chat Channel Members Table
CREATE TABLE IF NOT EXISTS chat_channel_members (
  channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_read_at TIMESTAMP,
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_chat_channel_members_user_id ON chat_channel_members(user_id);
CREATE INDEX idx_chat_channel_members_channel_id ON chat_channel_members(channel_id);

-- Comments
COMMENT ON TABLE chat_channels IS 'Chat channels for team communication within companies';
COMMENT ON TABLE chat_messages IS 'Messages posted in chat channels';
COMMENT ON TABLE chat_channel_members IS 'Tracks which users are members of which channels';
COMMENT ON COLUMN chat_channel_members.last_read_at IS 'Last time user read messages in this channel, used for unread counts';

-- DOWN
-- Drop chat module tables (rollback)
DROP TABLE IF EXISTS chat_channel_members CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;

