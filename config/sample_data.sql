-- OPhir Email Automation Platform Sample Data
-- Inserts sample/test data for development and testing

-- Insert sample organization
INSERT INTO organizations (id, name) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'OPhir Demo Organization')
ON CONFLICT (id) DO NOTHING;

-- Insert test user (password: Test123456!)
INSERT INTO users (id, email, first_name, last_name, password_hash, role, organization_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'test@example.com', 'Test', 'User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewthXDfYhPT9XVTi', 'admin', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (email) DO NOTHING;

-- Insert another test user
INSERT INTO users (id, email, first_name, last_name, password_hash, role, organization_id) VALUES 
('550e8400-e29b-41d4-a716-446655440002', 'user@example.com', 'John', 'Doe', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewthXDfYhPT9XVTi', 'user', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (email) DO NOTHING;

-- Insert sample email accounts
INSERT INTO email_accounts (id, organization_id, email, provider, credentials, display_name, is_active, health_score, daily_limit) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'sender1@demo.com', 'gmail', '{"access_token": "demo_token_1", "refresh_token": "demo_refresh_1"}', 'Demo Sender 1', true, 95, 50),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'sender2@demo.com', 'outlook', '{"access_token": "demo_token_2", "refresh_token": "demo_refresh_2"}', 'Demo Sender 2', true, 88, 40),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'sender3@demo.com', 'smtp', '{"username": "sender3@demo.com", "password": "encrypted_password", "smtp_host": "smtp.demo.com", "smtp_port": 587}', 'Demo Sender 3', true, 92, 60)
ON CONFLICT (organization_id, email) DO NOTHING;

-- Insert sample campaigns
INSERT INTO campaigns (id, organization_id, name, subject, content, status, emails_per_day, emails_per_hour, emails_per_minute, sending_interval, active_days, sending_hours) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'Demo Cold Outreach Campaign', 'Quick question about {{company}}', 'Hi {{firstName}},

I noticed that {{company}} is doing amazing work in {{primaryIndustry}}. 

I wanted to reach out because we''ve been helping similar companies like yours increase their email deliverability by up to 40%.

Would you be interested in a quick 10-minute call to discuss how this could benefit {{company}}?

Best regards,
Demo Team', 'active', 25, 3, 1, 30, ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], '{"start": 9, "end": 17}'),

('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440000', 'Follow-up Sequence', 'Following up on {{company}}', 'Hi {{firstName}},

I wanted to follow up on my previous email regarding improving email deliverability for {{company}}.

Are you the right person to discuss this, or should I connect with someone else on your team?

Thanks,
Demo Team', 'draft', 15, 2, 1, 45, ARRAY['tuesday', 'wednesday', 'thursday'], '{"start": 10, "end": 16}')
ON CONFLICT (id) DO NOTHING;

-- Insert sample leads
INSERT INTO leads (id, organization_id, campaign_id, email, first_name, last_name, company, company_domain, job_title, location, primary_industry, linkedin_url, status) VALUES 
('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', 'john.smith@techcorp.com', 'John', 'Smith', 'TechCorp Inc', 'techcorp.com', 'VP of Marketing', 'San Francisco, CA', 'Technology', 'https://linkedin.com/in/johnsmith', 'active'),

('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', 'sarah.wilson@innovate.io', 'Sarah', 'Wilson', 'Innovate Solutions', 'innovate.io', 'CEO', 'New York, NY', 'SaaS', 'https://linkedin.com/in/sarahwilson', 'active'),

('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', 'mike.johnson@growth.co', 'Mike', 'Johnson', 'Growth Co', 'growth.co', 'Marketing Director', 'Austin, TX', 'Marketing', 'https://linkedin.com/in/mikejohnson', 'sent'),

('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', 'emma.davis@startup.com', 'Emma', 'Davis', 'StartupCo', 'startup.com', 'Head of Sales', 'Seattle, WA', 'E-commerce', 'https://linkedin.com/in/emmadavis', 'opened'),

('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020', 'alex.brown@enterprise.org', 'Alex', 'Brown', 'Enterprise Corp', 'enterprise.org', 'VP Sales', 'Chicago, IL', 'Enterprise Software', 'https://linkedin.com/in/alexbrown', 'replied')
ON CONFLICT (organization_id, email, campaign_id) DO NOTHING;

-- Insert campaign automation config
INSERT INTO campaign_automation_config (id, campaign_id, n8n_workflow_id, sequence_config, timing_config, email_account_rotation, is_active) VALUES 
('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440020', 'demo_workflow_123', '[{"step": 1, "delay_hours": 0, "subject": "Quick question about {{company}}", "template": "initial_outreach"}]', '{"business_hours": {"start": 9, "end": 17}, "days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "interval_minutes": 30}', 'round_robin', true)
ON CONFLICT (campaign_id) DO NOTHING;

-- Insert sample email activities
INSERT INTO email_activities (id, campaign_id, lead_id, event_type, event_data, timestamp) VALUES 
('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440032', 'sent', '{"message_id": "demo_msg_1", "email_account": "sender1@demo.com"}', NOW() - INTERVAL '2 hours'),

('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440033', 'sent', '{"message_id": "demo_msg_2", "email_account": "sender2@demo.com"}', NOW() - INTERVAL '1 hour'),

('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440033', 'opened', '{"message_id": "demo_msg_2", "ip_address": "192.168.1.1"}', NOW() - INTERVAL '30 minutes'),

('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440034', 'sent', '{"message_id": "demo_msg_3", "email_account": "sender1@demo.com"}', NOW() - INTERVAL '3 hours'),

('550e8400-e29b-41d4-a716-446655440054', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440034', 'opened', '{"message_id": "demo_msg_3", "ip_address": "192.168.1.2"}', NOW() - INTERVAL '2.5 hours'),

('550e8400-e29b-41d4-a716-446655440055', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440034', 'replied', '{"message_id": "demo_msg_3", "reply_text": "Thanks for reaching out! I am interested."}', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert campaign lead status
INSERT INTO campaign_lead_status (id, campaign_id, lead_id, current_sequence_step, status, last_contact_at, next_contact_at, total_emails_sent, total_opens, total_clicks, replied, unsubscribed) VALUES 
('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440030', 1, 'active', NULL, NOW() + INTERVAL '1 hour', 0, 0, 0, false, false),

('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440031', 1, 'active', NULL, NOW() + INTERVAL '2 hours', 0, 0, 0, false, false),

('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440032', 1, 'active', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '24 hours', 1, 0, 0, false, false),

('550e8400-e29b-41d4-a716-446655440063', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440033', 1, 'active', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '24 hours', 1, 1, 0, false, false),

('550e8400-e29b-41d4-a716-446655440064', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440034', 1, 'completed', NOW() - INTERVAL '3 hours', NULL, 1, 1, 0, true, false)
ON CONFLICT (campaign_id, lead_id) DO NOTHING;

-- Insert warmup schedules
INSERT INTO warmup_schedules (id, email_account_id, target_per_day, current_per_day, warmup_duration_days, current_day, is_active, last_warmup_sent) VALUES 
('550e8400-e29b-41d4-a716-446655440070', '550e8400-e29b-41d4-a716-446655440010', 50, 25, 30, 15, true, NOW() - INTERVAL '4 hours'),

('550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440011', 40, 20, 30, 10, true, NOW() - INTERVAL '6 hours'),

('550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440012', 60, 35, 30, 20, true, NOW() - INTERVAL '2 hours')
ON CONFLICT (email_account_id) DO NOTHING;