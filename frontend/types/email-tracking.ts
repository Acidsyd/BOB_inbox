// Email Tracking System TypeScript Types
// Generated types for SmartLead-style email tracking system
// Created: 2025-08-25

// ================================
// BASE TYPES AND ENUMS
// ================================

export type TrackingEventType = 
  | 'open' 
  | 'click' 
  | 'bounce' 
  | 'reply' 
  | 'unsubscribe' 
  | 'spam' 
  | 'delivered' 
  | 'sent';

export type ReplyType = 
  | 'positive' 
  | 'negative' 
  | 'neutral' 
  | 'ooo' 
  | 'unsubscribe' 
  | 'bounce' 
  | 'interested' 
  | 'not_interested' 
  | 'meeting_request'
  | 'question' 
  | 'objection' 
  | 'referral' 
  | 'auto_reply';

export type ReplySentiment = 'positive' | 'negative' | 'neutral' | 'ooo';

export type DeliverabilityEventType = 
  | 'delivered' 
  | 'bounced' 
  | 'rejected' 
  | 'spam' 
  | 'blocked' 
  | 'deferred';

export type BounceType = 'hard' | 'soft';

export type SummaryPeriod = 'hour' | 'day' | 'week' | 'month';

export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// ================================
// EMAIL TRACKING EVENTS
// ================================

export interface EmailTrackingEvent {
  id: string;
  campaign_id: string;
  lead_id: string;
  email_account_id?: string;
  organization_id: string;
  
  // Event classification
  event_type: TrackingEventType;
  event_subtype?: string;
  
  // Tracking identifiers
  tracking_token: string;
  pixel_token?: string;
  link_token?: string;
  message_id?: string;
  thread_id?: string;
  
  // Event metadata
  event_data: Record<string, any>;
  email_subject?: string;
  email_preview?: string;
  
  // Request/Response tracking
  user_agent?: string;
  ip_address?: string;
  country_code?: string;
  region?: string;
  city?: string;
  timezone?: string;
  
  // Device and client detection
  device_type?: DeviceType;
  device_brand?: string;
  device_model?: string;
  operating_system?: string;
  browser_name?: string;
  browser_version?: string;
  email_client?: string;
  
  // Click-specific data
  clicked_url?: string;
  link_position?: number;
  link_text?: string;
  
  // Reply-specific data
  reply_content?: string;
  reply_sentiment?: ReplySentiment;
  reply_category?: string;
  
  // Timing information
  created_at: string;
  processed_at?: string;
  server_timestamp: string;
  
  // Deduplication and validation
  event_hash?: string;
  is_valid: boolean;
  validation_errors: string[];
  
  // Performance tracking
  processing_time_ms?: number;
  source_system: string;
}

// ================================
// TRACKING PIXELS
// ================================

export interface TrackingPixel {
  id: string;
  campaign_id: string;
  lead_id: string;
  email_account_id?: string;
  organization_id: string;
  
  // Pixel identification
  pixel_token: string;
  pixel_url: string;
  
  // Email context
  email_subject?: string;
  email_message_id?: string;
  email_thread_id?: string;
  email_sent_at?: string;
  
  // Tracking status
  is_active: boolean;
  
  // Open tracking statistics
  first_opened_at?: string;
  last_opened_at?: string;
  total_opens: number;
  unique_opens: number;
  
  // Geographic and device insights
  open_locations: OpenLocation[];
  open_devices: OpenDevice[];
  open_times: string[];
  
  // Performance metrics
  avg_time_to_first_open_seconds?: number;
  peak_open_hour?: number;
  peak_open_day?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  expires_at: string;
  
  // Additional tracking data
  custom_data: Record<string, any>;
}

export interface OpenLocation {
  country: string;
  region?: string;
  city?: string;
  count: number;
}

export interface OpenDevice {
  device_type: DeviceType;
  email_client?: string;
  count: number;
}

// ================================
// TRACKING LINKS
// ================================

export interface TrackingLink {
  id: string;
  campaign_id: string;
  lead_id: string;
  email_account_id?: string;
  organization_id: string;
  
  // Link identification
  tracking_token: string;
  original_url: string;
  tracking_url: string;
  
  // Link context in email
  link_position?: number;
  link_text?: string;
  link_type: string;
  link_category?: string;
  
  // Email context
  email_subject?: string;
  email_message_id?: string;
  email_thread_id?: string;
  email_sent_at?: string;
  
  // Tracking status
  is_active: boolean;
  
  // Click tracking statistics
  first_clicked_at?: string;
  last_clicked_at?: string;
  click_count: number;
  unique_clicks: number;
  
  // Click analysis
  click_locations: ClickLocation[];
  click_devices: ClickDevice[];
  click_times: string[];
  
  // Performance metrics
  avg_time_to_first_click_seconds?: number;
  click_through_rate?: number;
  conversion_rate?: number;
  
  // A/B Testing support
  link_variant?: string;
  test_group?: string;
  
  // Link validation and monitoring
  last_validated_at?: string;
  is_url_valid: boolean;
  url_status_code?: number;
  url_error_message?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  expires_at: string;
  
  // Additional tracking data
  custom_data: Record<string, any>;
}

export interface ClickLocation {
  country: string;
  region?: string;
  city?: string;
  count: number;
}

export interface ClickDevice {
  device_type: DeviceType;
  browser?: string;
  count: number;
}

// ================================
// EMAIL REPLIES
// ================================

export interface EmailReply {
  id: string;
  campaign_id: string;
  lead_id: string;
  email_account_id: string;
  organization_id: string;
  
  // Email identification
  thread_id: string;
  reply_message_id: string;
  in_reply_to_message_id?: string;
  
  // Reply classification
  reply_type: ReplyType;
  reply_category?: string;
  
  // Reply content
  reply_subject?: string;
  reply_content: string;
  reply_content_plain?: string;
  reply_content_html?: string;
  reply_snippet?: string;
  
  // Content analysis
  sentiment_score?: number; // -1 to 1
  confidence_score?: number; // 0 to 1
  emotion_detected?: string;
  urgency_level?: UrgencyLevel;
  
  // Language and communication analysis
  language_detected?: string;
  word_count?: number;
  reading_level?: number;
  tone?: string;
  
  // Categorization (AI and manual)
  auto_categorized: boolean;
  manual_review: boolean;
  manual_category?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  
  // Reply metadata
  reply_from_email: string;
  reply_from_name?: string;
  reply_to_email?: string;
  reply_received_at: string;
  
  // Tracking and processing
  processed_at?: string;
  processing_time_ms?: number;
  
  // Attachments and additional content
  has_attachments: boolean;
  attachment_count: number;
  attachment_details: AttachmentDetail[];
  
  // Integration data
  external_message_id?: string;
  raw_headers: Record<string, any>;
  
  // Follow-up tracking
  requires_followup: boolean;
  followup_priority?: Priority;
  followup_due_at?: string;
  followup_notes?: string;
  
  // Quality and spam detection
  is_spam: boolean;
  spam_score?: number;
  is_autoresponder: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface AttachmentDetail {
  filename: string;
  content_type: string;
  size: number;
}

// ================================
// EMAIL DELIVERABILITY EVENTS
// ================================

export interface EmailDeliverabilityEvent {
  id: string;
  campaign_id: string;
  lead_id: string;
  email_account_id: string;
  organization_id: string;
  
  // Event identification
  message_id: string;
  event_type: DeliverabilityEventType;
  
  // Bounce/Error details
  bounce_type?: BounceType;
  bounce_subtype?: string;
  
  // Provider and infrastructure details
  smtp_response_code?: number;
  smtp_response_message?: string;
  receiving_mx_server?: string;
  sending_ip?: string;
  
  // Delivery timing
  sent_at: string;
  delivered_at?: string;
  bounced_at?: string;
  
  // Reputation and deliverability impact
  sender_reputation_score?: number;
  domain_reputation_score?: number;
  ip_reputation_score?: number;
  
  // Error analysis
  error_code?: string;
  error_message?: string;
  error_category?: string;
  
  // Retry tracking
  retry_attempt: number;
  max_retries: number;
  next_retry_at?: string;
  
  // Additional metadata
  provider_details: Record<string, any>;
  raw_event_data: Record<string, any>;
  
  created_at: string;
}

// ================================
// TRACKING ANALYTICS SUMMARIES
// ================================

export interface TrackingAnalyticsSummary {
  id: string;
  organization_id: string;
  campaign_id?: string;
  
  // Time period
  summary_date: string;
  summary_period: SummaryPeriod;
  period_start: string;
  period_end: string;
  
  // Email volume metrics
  emails_sent: number;
  emails_delivered: number;
  emails_bounced: number;
  emails_rejected: number;
  
  // Engagement metrics
  total_opens: number;
  unique_opens: number;
  total_clicks: number;
  unique_clicks: number;
  replies_received: number;
  unsubscribes: number;
  spam_reports: number;
  
  // Calculated rates
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  unsubscribe_rate: number;
  spam_rate: number;
  
  // Advanced metrics
  unique_open_rate: number;
  click_to_open_rate: number;
  
  // Reply analysis
  positive_replies: number;
  negative_replies: number;
  neutral_replies: number;
  ooo_replies: number;
  
  // Geographic insights
  top_countries: GeographicInsight[];
  top_regions: GeographicInsight[];
  
  // Device and client insights
  top_devices: DeviceInsight[];
  top_email_clients: EmailClientInsight[];
  
  // Timing insights
  best_send_hour?: number;
  best_send_day?: string;
  
  // Quality metrics
  avg_sentiment_score?: number;
  engagement_quality_score?: number;
  
  created_at: string;
  updated_at: string;
}

export interface GeographicInsight {
  name: string;
  count: number;
  percentage: number;
}

export interface DeviceInsight {
  device_type: DeviceType;
  count: number;
  percentage: number;
}

export interface EmailClientInsight {
  client_name: string;
  count: number;
  percentage: number;
}

// ================================
// API RESPONSE TYPES
// ================================

export interface CampaignEngagementRates {
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  replied_count: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  click_to_open_rate: number;
}

export interface TrackingEventCreateRequest {
  campaign_id: string;
  lead_id: string;
  email_account_id?: string;
  event_type: TrackingEventType;
  tracking_token: string;
  event_data?: Record<string, any>;
  user_agent?: string;
  ip_address?: string;
  clicked_url?: string;
  reply_content?: string;
}

export interface TrackingPixelCreateRequest {
  campaign_id: string;
  lead_id: string;
  email_account_id?: string;
  email_subject?: string;
  email_message_id?: string;
  custom_data?: Record<string, any>;
}

export interface TrackingLinkCreateRequest {
  campaign_id: string;
  lead_id: string;
  email_account_id?: string;
  original_url: string;
  link_position?: number;
  link_text?: string;
  link_type?: string;
  link_category?: string;
  email_subject?: string;
  custom_data?: Record<string, any>;
}

export interface EmailReplyCreateRequest {
  campaign_id: string;
  lead_id: string;
  email_account_id: string;
  thread_id: string;
  reply_message_id: string;
  reply_content: string;
  reply_from_email: string;
  reply_received_at: string;
  reply_type?: ReplyType;
  sentiment_score?: number;
}

// ================================
// DASHBOARD AND UI TYPES
// ================================

export interface TrackingDashboardData {
  summary: TrackingAnalyticsSummary;
  recent_events: EmailTrackingEvent[];
  top_performing_links: TrackingLink[];
  recent_replies: EmailReply[];
  geographic_distribution: GeographicInsight[];
  device_breakdown: DeviceInsight[];
}

export interface CampaignTrackingOverview {
  campaign_id: string;
  campaign_name: string;
  total_sent: number;
  engagement_rates: CampaignEngagementRates;
  recent_activity: EmailTrackingEvent[];
  top_links: TrackingLink[];
  replies_summary: {
    total: number;
    positive: number;
    negative: number;
    pending_review: number;
  };
}

export interface LeadTrackingProfile {
  lead_id: string;
  lead_name: string;
  lead_email: string;
  engagement_history: EmailTrackingEvent[];
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  last_activity: string;
  engagement_score: number;
}

// ================================
// REAL-TIME SUBSCRIPTION TYPES
// ================================

export interface TrackingEventSubscription {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: EmailTrackingEvent;
  old?: EmailTrackingEvent;
}

export interface AnalyticsUpdateSubscription {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: TrackingAnalyticsSummary;
  old?: TrackingAnalyticsSummary;
}

// ================================
// UTILITY TYPES
// ================================

export interface TrackingToken {
  token: string;
  type: 'pixel' | 'link' | 'general';
  campaign_id: string;
  lead_id: string;
  expires_at: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface BulkTrackingOperation {
  operation: 'create' | 'update' | 'delete';
  records: any[];
  results: {
    successful: number;
    failed: number;
    errors: ValidationError[];
  };
}

// ================================
// EXPORT ALL TYPES
// ================================

export type {
  // Main entities
  EmailTrackingEvent,
  TrackingPixel,
  TrackingLink,
  EmailReply,
  EmailDeliverabilityEvent,
  TrackingAnalyticsSummary,
  
  // Supporting types
  OpenLocation,
  OpenDevice,
  ClickLocation,
  ClickDevice,
  AttachmentDetail,
  GeographicInsight,
  DeviceInsight,
  EmailClientInsight,
  
  // API types
  CampaignEngagementRates,
  TrackingEventCreateRequest,
  TrackingPixelCreateRequest,
  TrackingLinkCreateRequest,
  EmailReplyCreateRequest,
  
  // Dashboard types
  TrackingDashboardData,
  CampaignTrackingOverview,
  LeadTrackingProfile,
  
  // Real-time types
  TrackingEventSubscription,
  AnalyticsUpdateSubscription,
  
  // Utility types
  TrackingToken,
  ValidationError,
  BulkTrackingOperation,
};