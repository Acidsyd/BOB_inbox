-- Add missing columns to unsubscribes table
-- Migration: 20251114_add_unsubscribe_columns.sql

-- Add unsubscribed_at column to track when the unsubscribe happened
ALTER TABLE unsubscribes
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add source column to track where the unsubscribe came from (e.g., 'email_link', 'manual', 'api')
ALTER TABLE unsubscribes
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'email_link';

-- Update existing records to have unsubscribed_at = created_at if null
UPDATE unsubscribes
SET unsubscribed_at = created_at
WHERE unsubscribed_at IS NULL;

-- Create index for faster queries on unsubscribed_at
CREATE INDEX IF NOT EXISTS idx_unsubscribes_unsubscribed_at ON unsubscribes(unsubscribed_at);

-- Create index for faster queries on source
CREATE INDEX IF NOT EXISTS idx_unsubscribes_source ON unsubscribes(source);

COMMENT ON COLUMN unsubscribes.unsubscribed_at IS 'Timestamp when the user unsubscribed';
COMMENT ON COLUMN unsubscribes.source IS 'Source of unsubscribe: email_link, manual, api, bounce, complaint';
