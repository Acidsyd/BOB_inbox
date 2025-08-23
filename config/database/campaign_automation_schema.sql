-- OPhir Campaign Automation Schema Extension
-- Extends existing schema to support advanced campaign automation features
-- Created: January 2025

-- Campaign Automation Configuration Table
CREATE TABLE campaign_automation_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
    
    -- Email Content
    subject VARCHAR(500) NOT NULL,
    body_text TEXT NOT NULL,
    
    -- Sending Frequency Configuration
    emails_per_day INTEGER DEFAULT 10,
    emails_per_hour INTEGER DEFAULT 5,
    emails_per_minute INTEGER DEFAULT 1,
    send_interval_minutes INTEGER DEFAULT 15, -- Minimum interval between sends
    
    -- Schedule Configuration
    send_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
    send_start_hour INTEGER DEFAULT 9, -- 24-hour format
    send_end_hour INTEGER DEFAULT 17, -- 24-hour format
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Email Account Selection
    email_account_ids UUID[] NOT NULL, -- Array of email_accounts.id
    account_rotation_type VARCHAR(20) DEFAULT 'round_robin', -- round_robin, random, sequential
    
    -- N8N Integration
    n8n_workflow_id VARCHAR(255), -- N8N workflow ID when created
    n8n_webhook_url VARCHAR(500), -- N8N webhook URL for triggers
    
    -- Campaign State
    total_leads INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_pending INTEGER DEFAULT 0,
    emails_failed INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP,
    next_scheduled_send TIMESTAMP,
    
    -- Control Flags
    is_active BOOLEAN DEFAULT false,
    auto_pause_when_complete BOOLEAN DEFAULT true,
    respect_business_hours BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Leads with Automation Status
CREATE TABLE campaign_lead_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Lead-specific status for this campaign
    status VARCHAR(50) DEFAULT 'pending', -- pending, queued, sent, failed, bounced, opened, clicked, replied
    scheduled_send_at TIMESTAMP,
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    
    -- Email content for this specific send (with personalization)
    personalized_subject VARCHAR(500),
    personalized_body TEXT,
    
    -- Email account used for this send
    email_account_id UUID REFERENCES email_accounts(id),
    
    -- N8N execution tracking
    n8n_execution_id VARCHAR(255),
    
    -- Error tracking
    failed_attempts INTEGER DEFAULT 0,
    last_error_message TEXT,
    last_attempt_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_id, lead_id)
);

-- Campaign Analytics Summary
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    
    -- Daily stats
    date DATE NOT NULL,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_replied INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_unsubscribed INTEGER DEFAULT 0,
    
    -- Performance metrics
    delivery_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    open_rate DECIMAL(5,2) DEFAULT 0,     -- Percentage
    click_rate DECIMAL(5,2) DEFAULT 0,    -- Percentage
    reply_rate DECIMAL(5,2) DEFAULT 0,    -- Percentage
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_id, date)
);

-- N8N Workflow Templates for campaigns
CREATE TABLE n8n_workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL, -- campaign_sender, email_warmup, analytics_tracker
    
    -- N8N workflow JSON template
    workflow_template JSONB NOT NULL,
    
    -- Configuration parameters that can be customized
    configurable_params JSONB DEFAULT '{}',
    
    -- Version control
    version VARCHAR(20) DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_campaign_automation_config_campaign_id ON campaign_automation_config(campaign_id);
CREATE INDEX idx_campaign_automation_config_active ON campaign_automation_config(is_active);
CREATE INDEX idx_campaign_automation_config_next_send ON campaign_automation_config(next_scheduled_send);

CREATE INDEX idx_campaign_lead_status_campaign_id ON campaign_lead_status(campaign_id);
CREATE INDEX idx_campaign_lead_status_lead_id ON campaign_lead_status(lead_id);
CREATE INDEX idx_campaign_lead_status_status ON campaign_lead_status(status);
CREATE INDEX idx_campaign_lead_status_scheduled_send ON campaign_lead_status(scheduled_send_at);

CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_date ON campaign_analytics(date);

CREATE INDEX idx_n8n_workflow_templates_type ON n8n_workflow_templates(template_type);
CREATE INDEX idx_n8n_workflow_templates_active ON n8n_workflow_templates(is_active);

-- Triggers for updated_at
CREATE TRIGGER update_campaign_automation_config_updated_at 
    BEFORE UPDATE ON campaign_automation_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_lead_status_updated_at 
    BEFORE UPDATE ON campaign_lead_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_analytics_updated_at 
    BEFORE UPDATE ON campaign_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_n8n_workflow_templates_updated_at 
    BEFORE UPDATE ON n8n_workflow_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next send time based on campaign configuration
CREATE OR REPLACE FUNCTION calculate_next_send_time(
    campaign_config_id UUID,
    current_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) RETURNS TIMESTAMP AS $$
DECLARE
    config_record RECORD;
    next_send TIMESTAMP;
    current_dow INTEGER; -- Day of week (1=Monday, 7=Sunday)
    current_hour INTEGER;
    send_interval INTEGER;
BEGIN
    -- Get campaign configuration
    SELECT * INTO config_record 
    FROM campaign_automation_config 
    WHERE id = campaign_config_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Get current day of week and hour
    current_dow := EXTRACT(dow FROM current_time);
    current_dow := CASE WHEN current_dow = 0 THEN 7 ELSE current_dow END; -- Convert Sunday from 0 to 7
    current_hour := EXTRACT(hour FROM current_time);
    
    -- Start with minimum interval
    next_send := current_time + (config_record.send_interval_minutes || ' minutes')::INTERVAL;
    
    -- Check if we need to respect business hours
    IF config_record.respect_business_hours THEN
        -- If outside business hours, move to next business day start
        IF current_hour < config_record.send_start_hour OR current_hour >= config_record.send_end_hour THEN
            next_send := date_trunc('day', next_send) + (config_record.send_start_hour || ' hours')::INTERVAL;
        END IF;
        
        -- If outside allowed days, find next allowed day
        WHILE NOT (EXTRACT(dow FROM next_send) = ANY(
            CASE WHEN EXTRACT(dow FROM next_send) = 0 THEN ARRAY[7] 
                 ELSE ARRAY[EXTRACT(dow FROM next_send)::INTEGER] END || config_record.send_days_of_week
        )) LOOP
            next_send := next_send + '1 day'::INTERVAL;
            next_send := date_trunc('day', next_send) + (config_record.send_start_hour || ' hours')::INTERVAL;
        END LOOP;
    END IF;
    
    RETURN next_send;
END;
$$ LANGUAGE plpgsql;

-- Function to get next lead to send in campaign
CREATE OR REPLACE FUNCTION get_next_campaign_lead(campaign_config_id UUID) 
RETURNS UUID AS $$
DECLARE
    lead_id UUID;
    config_record RECORD;
BEGIN
    -- Get campaign configuration
    SELECT c.id as campaign_id, cac.* 
    INTO config_record 
    FROM campaign_automation_config cac
    JOIN campaigns c ON c.id = cac.campaign_id
    WHERE cac.id = campaign_config_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Get next pending lead that hasn't been sent yet
    SELECT cls.lead_id INTO lead_id
    FROM campaign_lead_status cls
    WHERE cls.campaign_id = config_record.campaign_id
      AND cls.status = 'pending'
      AND (cls.scheduled_send_at IS NULL OR cls.scheduled_send_at <= CURRENT_TIMESTAMP)
    ORDER BY cls.created_at ASC
    LIMIT 1;
    
    RETURN lead_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default N8N workflow template for campaign sender
INSERT INTO n8n_workflow_templates (
    name, 
    description, 
    template_type, 
    workflow_template,
    configurable_params
) VALUES (
    'Basic Campaign Sender',
    'Standard email campaign workflow with Supabase integration',
    'campaign_sender',
    '{
        "name": "Campaign Sender - {{campaign_name}}",
        "nodes": [
            {
                "parameters": {
                    "rule": "*/{{send_interval_minutes}} * * * *"
                },
                "id": "schedule-trigger",
                "name": "Schedule Trigger",
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [250, 300]
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "{{supabase_url}}/rest/v1/rpc/get_next_campaign_lead",
                    "headers": {
                        "apikey": "{{supabase_anon_key}}",
                        "authorization": "Bearer {{supabase_service_key}}",
                        "content-type": "application/json"
                    },
                    "body": {
                        "campaign_config_id": "{{campaign_config_id}}"
                    }
                },
                "id": "get-next-lead",
                "name": "Get Next Lead",
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [450, 300]
            },
            {
                "parameters": {
                    "resource": "message",
                    "operation": "send",
                    "to": "{{ $json.email }}",
                    "subject": "{{ $json.personalized_subject }}",
                    "message": "{{ $json.personalized_body }}",
                    "from": "{{sender_email}}"
                },
                "id": "send-email",
                "name": "Send Email",
                "type": "n8n-nodes-base.gmail",
                "typeVersion": 2.1,
                "position": [650, 300]
            }
        ],
        "connections": {
            "Schedule Trigger": {
                "main": [
                    [
                        {
                            "node": "Get Next Lead",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            },
            "Get Next Lead": {
                "main": [
                    [
                        {
                            "node": "Send Email",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            }
        }
    }',
    '{
        "campaign_name": "string",
        "campaign_config_id": "uuid",
        "send_interval_minutes": "integer",
        "supabase_url": "string",
        "supabase_anon_key": "string", 
        "supabase_service_key": "string",
        "sender_email": "string"
    }'
);