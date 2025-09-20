-- Create sync_history table for tracking background sync operations
-- This table stores detailed sync history for autosync status reporting

CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL DEFAULT 'background', -- 'background', 'manual', 'initial'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    accounts_total INTEGER DEFAULT 0,
    accounts_success INTEGER DEFAULT 0,
    accounts_failed INTEGER DEFAULT 0,
    messages_synced INTEGER DEFAULT 0,
    messages_new INTEGER DEFAULT 0,
    error_message TEXT,
    sync_details JSONB DEFAULT '{}', -- Store detailed sync results
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_history_organization_id ON sync_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_sync_type ON sync_history(sync_type);

-- Composite index for common queries (organization + type + status)
CREATE INDEX IF NOT EXISTS idx_sync_history_org_type_status ON sync_history(organization_id, sync_type, status);

-- Add RLS (Row Level Security)
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see sync history for their own organization
-- Fixed to use users table instead of non-existent user_organizations table
CREATE POLICY sync_history_organization_isolation ON sync_history
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM users
            WHERE id = auth.uid()
        )
    );

-- Add helpful comments
COMMENT ON TABLE sync_history IS 'Tracks background and manual email sync operations with detailed metrics';
COMMENT ON COLUMN sync_history.sync_type IS 'Type of sync: background (auto), manual (user-triggered), initial (first sync)';
COMMENT ON COLUMN sync_history.sync_details IS 'JSON object with detailed sync results per account';
COMMENT ON COLUMN sync_history.duration_ms IS 'Total sync duration in milliseconds';