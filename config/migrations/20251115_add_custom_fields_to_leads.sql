-- Migration: Add custom_fields column to leads table
-- Date: 2025-11-15
-- Description: Adds custom_fields JSONB column to store flexible, custom lead data

-- Add custom_fields column to leads table if it doesn't exist
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN leads.custom_fields IS 'Flexible JSONB storage for custom lead attributes. Accepts any valid JSON: strings, numbers, objects, or arrays.';

-- Create a GIN index for efficient JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_leads_custom_fields ON leads USING GIN (custom_fields);

-- Verify the migration
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name = 'custom_fields';
