-- Migration: Add display_name column to email accounts tables
-- Date: 2025-01-15
-- Description: Adds display_name column to oauth2_tokens and email_accounts tables
--              and sets all accounts to "Gianpiero Di Felice"

-- 1. Add display_name column to oauth2_tokens table
ALTER TABLE oauth2_tokens
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- 2. Add display_name column to email_accounts table
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- 3. Update all OAuth2 accounts with display name
UPDATE oauth2_tokens
SET display_name = 'Gianpiero Di Felice'
WHERE organization_id = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

-- 4. Update all Mailgun/email_accounts with display name
UPDATE email_accounts
SET display_name = 'Gianpiero Di Felice'
WHERE organization_id = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';

-- 5. Verify the updates
SELECT
  'oauth2_tokens' as table_name,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN display_name = 'Gianpiero Di Felice' THEN 1 END) as updated_accounts
FROM oauth2_tokens
WHERE organization_id = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8'

UNION ALL

SELECT
  'email_accounts' as table_name,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN display_name = 'Gianpiero Di Felice' THEN 1 END) as updated_accounts
FROM email_accounts
WHERE organization_id = 'e0007877-cbc8-43ef-b306-31b99b0a5cf8';
