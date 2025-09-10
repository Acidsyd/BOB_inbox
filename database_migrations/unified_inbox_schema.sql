-- ====================================
-- UNIFIED INBOX DATABASE SCHEMA
-- Master inbox infrastructure for cross-account conversation management
-- ====================================

-- Conversations table: Groups related emails into threaded conversations
CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    
    -- Conversation metadata
    subject varchar NOT NULL,
    subject_normalized varchar GENERATED ALWAYS AS (
        TRIM(LOWER(REGEXP_REPLACE(subject, '^(re:|fwd?:|fw:)\s*', '', 'gi')))
    ) STORED, -- Normalized subject for better grouping
    
    -- Participants and threading
    participants jsonb NOT NULL DEFAULT '[]', -- All email addresses involved
    message_id_root varchar, -- Original Message-ID that started conversation
    thread_ids jsonb DEFAULT '[]', -- Gmail thread IDs if applicable
    
    -- Conversation state
    last_activity_at timestamp DEFAULT now(),
    last_message_preview text,
    message_count integer DEFAULT 0,
    unread_count integer DEFAULT 0,
    
    -- Classification
    conversation_type varchar DEFAULT 'organic' CHECK (conversation_type IN ('campaign', 'organic', 'auto_reply')),
    campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL, -- Link to campaign if applicable
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL, -- Link to lead if applicable
    
    -- User management
    status varchar DEFAULT 'active' CHECK (status IN ('active', 'archived', 'spam', 'deleted')),
    labels jsonb DEFAULT '[]', -- user-defined labels like ['important', 'follow-up']
    starred boolean DEFAULT false,
    priority integer DEFAULT 0, -- 0=normal, 1=high, -1=low
    
    -- Metadata
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    
    -- Indexes
    CONSTRAINT conversations_org_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Conversation messages: All emails (sent and received) in unified storage
CREATE TABLE IF NOT EXISTS conversation_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Email headers (RFC-compliant)
    message_id_header varchar NOT NULL, -- RFC Message-ID like <abc@mail.gmail.com>
    in_reply_to varchar, -- In-Reply-To header
    message_references text, -- References header (comma-separated Message-IDs)
    thread_id varchar, -- Gmail thread ID if applicable
    
    -- Email direction and routing
    direction varchar NOT NULL CHECK (direction IN ('sent', 'received')),
    email_account_id uuid, -- Which account sent/received this (references both tables)
    provider varchar DEFAULT 'gmail', -- gmail, outlook, smtp, etc
    
    -- Email addresses
    from_email varchar NOT NULL,
    from_name varchar,
    to_email varchar NOT NULL,
    to_name varchar,
    cc_emails jsonb DEFAULT '[]', -- Array of {email, name} objects
    bcc_emails jsonb DEFAULT '[]', -- Array of {email, name} objects
    reply_to_email varchar,
    
    -- Content
    subject varchar NOT NULL,
    content_html text,
    content_plain text,
    content_preview text, -- First ~200 chars for quick display
    attachments jsonb DEFAULT '[]', -- Array of attachment metadata
    
    -- Timestamps
    sent_at timestamp, -- When email was sent (for sent emails)
    received_at timestamp, -- When email was received (for received emails)
    delivered_at timestamp, -- Email delivery confirmation
    
    -- Message state
    is_read boolean DEFAULT false,
    is_important boolean DEFAULT false,
    bounce_type varchar, -- soft, hard, complaint, etc
    spam_score decimal(3,2), -- 0.00 to 1.00 spam probability
    
    -- Campaign integration
    scheduled_email_id uuid REFERENCES scheduled_emails(id) ON DELETE SET NULL,
    campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
    lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Organization isolation
    organization_id uuid NOT NULL,
    
    -- Metadata
    raw_headers jsonb DEFAULT '{}', -- Store all email headers for debugging
    processing_status varchar DEFAULT 'processed' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    
    -- Foreign key constraints
    CONSTRAINT conversation_messages_org_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- ====================================
-- INDEXES FOR PERFORMANCE
-- ====================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(organization_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_campaign ON conversations(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_message_root ON conversations(message_id_root) WHERE message_id_root IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_subject_normalized ON conversations(organization_id, subject_normalized);

-- Conversation messages indexes  
CREATE INDEX IF NOT EXISTS idx_conv_messages_conversation ON conversation_messages(conversation_id, sent_at DESC NULLS LAST, received_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conv_messages_org_id ON conversation_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_message_id ON conversation_messages(message_id_header);
CREATE INDEX IF NOT EXISTS idx_conv_messages_in_reply_to ON conversation_messages(in_reply_to) WHERE in_reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_messages_thread_id ON conversation_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_messages_direction ON conversation_messages(organization_id, direction);
CREATE INDEX IF NOT EXISTS idx_conv_messages_account ON conversation_messages(email_account_id) WHERE email_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_messages_campaign ON conversation_messages(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_messages_scheduled_email ON conversation_messages(scheduled_email_id) WHERE scheduled_email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_messages_unread ON conversation_messages(organization_id, is_read, received_at DESC) WHERE is_read = false;

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_conversations_search ON conversations USING gin(to_tsvector('english', subject || ' ' || coalesce(last_message_preview, '')));
CREATE INDEX IF NOT EXISTS idx_conv_messages_search ON conversation_messages USING gin(to_tsvector('english', subject || ' ' || coalesce(content_plain, '') || ' ' || from_email || ' ' || to_email));

-- ====================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ====================================

-- Update conversation metadata when messages are added/changed
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation stats and preview
    UPDATE conversations SET
        message_count = (
            SELECT COUNT(*) FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
        ),
        unread_count = (
            SELECT COUNT(*) FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            AND direction = 'received' 
            AND is_read = false
        ),
        last_activity_at = (
            SELECT MAX(COALESCE(sent_at, received_at)) FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            AND COALESCE(sent_at, received_at) IS NOT NULL
        ),
        last_message_preview = (
            SELECT content_preview FROM conversation_messages 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            ORDER BY COALESCE(sent_at, received_at) DESC NULLS LAST
            LIMIT 1
        ),
        updated_at = now()
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_metadata ON conversation_messages;
CREATE TRIGGER trigger_update_conversation_metadata
    AFTER INSERT OR UPDATE OR DELETE ON conversation_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_metadata();

-- Update conversation updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_conversation_messages_updated_at ON conversation_messages;
CREATE TRIGGER trigger_conversation_messages_updated_at
    BEFORE UPDATE ON conversation_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- SAMPLE QUERIES FOR TESTING
-- ====================================

/*
-- Get all conversations for an organization, ordered by activity
SELECT 
    c.id,
    c.subject,
    c.participants,
    c.message_count,
    c.unread_count,
    c.last_activity_at,
    c.last_message_preview,
    c.status,
    c.conversation_type
FROM conversations c
WHERE c.organization_id = 'your-org-id'
    AND c.status = 'active'
ORDER BY c.last_activity_at DESC;

-- Get all messages in a conversation thread
SELECT 
    cm.id,
    cm.direction,
    cm.from_email,
    cm.to_email,
    cm.subject,
    cm.content_preview,
    cm.sent_at,
    cm.received_at,
    cm.is_read
FROM conversation_messages cm
WHERE cm.conversation_id = 'conversation-id'
ORDER BY COALESCE(cm.sent_at, cm.received_at) ASC;

-- Search conversations by content
SELECT DISTINCT c.*
FROM conversations c
JOIN conversation_messages cm ON cm.conversation_id = c.id
WHERE c.organization_id = 'your-org-id'
    AND (
        to_tsvector('english', c.subject) @@ plainto_tsquery('english', 'search term')
        OR to_tsvector('english', cm.content_plain) @@ plainto_tsquery('english', 'search term')
    )
ORDER BY c.last_activity_at DESC;
*/