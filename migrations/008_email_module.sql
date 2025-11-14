-- =====================================================
-- Email Integration Module Migration
-- Schema: email
-- Description: Gmail API integration - email accounts, messages, templates, routing
-- =====================================================

-- UP
-- Create email schema and tables

CREATE SCHEMA IF NOT EXISTS email;

-- =====================================================
-- Email Accounts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS email.email_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
    email_address VARCHAR(255) NOT NULL,
    provider VARCHAR(50) DEFAULT 'gmail', -- 'gmail' (Google OAuth)
    access_token TEXT, -- Encrypted OAuth access token
    refresh_token TEXT, -- Encrypted OAuth refresh token
    token_expiry TIMESTAMP, -- When the access token expires
    -- Legacy fields (kept for compatibility, but not used for Gmail)
    imap_host VARCHAR(255),
    imap_port INTEGER DEFAULT 993,
    imap_username VARCHAR(255),
    imap_password TEXT, -- Can store encrypted token here as fallback
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password TEXT, -- Can store encrypted refresh token here as fallback
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_client_id ON email.email_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_is_active ON email.email_accounts(is_active);

COMMENT ON TABLE email.email_accounts IS 'Email account configurations for Gmail API integration';
COMMENT ON COLUMN email.email_accounts.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN email.email_accounts.refresh_token IS 'Encrypted OAuth refresh token';

-- =====================================================
-- Email Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS email.email_messages (
    id SERIAL PRIMARY KEY,
    email_account_id INTEGER NOT NULL REFERENCES email.email_accounts(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
    message_id VARCHAR(255) NOT NULL, -- Unique message ID from email
    thread_id VARCHAR(255), -- Thread/conversation ID
    subject TEXT,
    from_address VARCHAR(255) NOT NULL,
    to_addresses TEXT[], -- Array of recipient addresses
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    body_text TEXT,
    body_html TEXT,
    attachments JSONB, -- Array of attachment metadata
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    labels TEXT[], -- Gmail-style labels
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email_account_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_messages_email_account_id ON email.email_messages(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_client_id ON email.email_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email.email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_read ON email.email_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email.email_messages(received_at);

COMMENT ON TABLE email.email_messages IS 'Email messages storage from Gmail API';
COMMENT ON COLUMN email.email_messages.attachments IS 'JSON array of attachment metadata: {name, size, contentType, url}';

-- =====================================================
-- Email Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS email.email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    variables JSONB, -- Available template variables
    category VARCHAR(100), -- e.g., 'onboarding', 'reminder', 'invoice'
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email.email_templates(is_active);

COMMENT ON TABLE email.email_templates IS 'Email templates for sending automated emails';
COMMENT ON COLUMN email.email_templates.variables IS 'JSON object describing available template variables';

-- =====================================================
-- Email Routing Rules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS email.email_routing_rules (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'subject_contains', 'from_contains', 'to_contains', etc.
    condition JSONB NOT NULL, -- Rule condition configuration
    action VARCHAR(50) NOT NULL, -- 'route_to_client', 'assign_to_user', 'create_task', etc.
    action_config JSONB, -- Action-specific configuration
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority rules evaluated first
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_routing_rules_client_id ON email.email_routing_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_email_routing_rules_is_active ON email.email_routing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_email_routing_rules_priority ON email.email_routing_rules(priority);

COMMENT ON TABLE email.email_routing_rules IS 'Email routing rules for automatic email processing';
COMMENT ON COLUMN email.email_routing_rules.condition IS 'JSON object with rule condition: {type, value, operator}';
COMMENT ON COLUMN email.email_routing_rules.action_config IS 'JSON object with action-specific configuration';

-- =====================================================
-- Trigger Functions
-- =====================================================
CREATE OR REPLACE FUNCTION email.update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER email_accounts_updated_at BEFORE UPDATE ON email.email_accounts
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

CREATE TRIGGER email_messages_updated_at BEFORE UPDATE ON email.email_messages
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email.email_templates
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

CREATE TRIGGER email_routing_rules_updated_at BEFORE UPDATE ON email.email_routing_rules
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

-- DOWN
-- Drop email module schema and tables

DROP TRIGGER IF EXISTS email_routing_rules_updated_at ON email.email_routing_rules;
DROP TRIGGER IF EXISTS email_templates_updated_at ON email.email_templates;
DROP TRIGGER IF EXISTS email_messages_updated_at ON email.email_messages;
DROP TRIGGER IF EXISTS email_accounts_updated_at ON email.email_accounts;

DROP FUNCTION IF EXISTS email.update_email_updated_at();

DROP SCHEMA IF EXISTS email CASCADE;

