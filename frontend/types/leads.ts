/**
 * Represents a lead in the system
 */
export interface Lead {
  /** Unique identifier for the lead */
  id: string
  /** Lead's email address */
  email: string
  /** Lead's first name */
  first_name: string | null
  /** Lead's last name */
  last_name: string | null
  /** Lead's company name */
  company: string | null
  /** Lead's job title */
  job_title: string | null
  /** Lead's phone number */
  phone: string | null
  /** Lead's LinkedIn profile URL */
  linkedin_url: string | null
  /** Current status of the lead */
  status: LeadStatus
  /** Additional JSON data for the lead */
  data: Record<string, unknown> | null
  /** ID of associated campaign */
  campaign_id: string | null
  /** Name of associated campaign */
  campaign_name: string | null
  /** Organization this lead belongs to */
  organization_id: string
  /** When the lead was created */
  created_at: string
  /** When the lead was last updated */
  updated_at: string
  
  // Extended fields from the API
  /** Name of the list this lead belongs to */
  list_name: string | null
  /** Additional custom fields */
  extended_fields: Record<string, unknown>
  /** Number of emails sent to this lead */
  emails_sent: number
  /** Number of emails opened by this lead */
  emails_opened: number
  /** Number of replies from this lead */
  replies: number
  /** Last activity timestamp */
  last_activity: string | null
}

/**
 * Valid lead status values
 */
export type LeadStatus = 'active' | 'inactive' | 'bounced' | 'unsubscribed' | 'responded'

/**
 * API response structure for leads queries
 */
export interface LeadsResponse {
  /** Array of leads */
  leads: Lead[]
  /** Total number of leads matching the query */
  total: number
  /** Current page number */
  page: number
  /** Number of items per page */
  limit: number
  /** Total number of pages */
  totalPages: number
  /** Applied filters */
  filters: LeadFilters
  /** Applied sorting */
  sorting: LeadSorting
}

/**
 * Available filters for lead queries
 */
export interface LeadFilters {
  /** Search term for name, email, or company */
  search?: string
  /** Filter by lead status */
  status?: LeadStatus
  /** Filter by campaign ID */
  campaignId?: string
  /** Filter by lead list ID */
  leadListId?: string
  /** Filter leads that have email */
  hasEmail?: boolean
  /** Filter leads that have phone */
  hasPhone?: boolean
  /** Filter leads created after this date */
  dateFrom?: string
  /** Filter leads created before this date */
  dateTo?: string
}

/**
 * Valid sortable columns for leads
 */
export type LeadSortableColumn = 'created_at' | 'updated_at' | 'email' | 'company' | 'last_activity'

/**
 * Sort order options
 */
export type SortOrder = 'asc' | 'desc'

/**
 * Sorting configuration for lead queries
 */
export interface LeadSorting {
  /** Column to sort by */
  sortBy: LeadSortableColumn
  /** Sort direction */
  sortOrder: SortOrder
}

/**
 * Configuration parameters for useLeads hook
 */
export interface UseLeadsParams {
  /** Initial page number */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Initial filters to apply */
  filters?: LeadFilters
  /** Initial sorting configuration */
  sorting?: LeadSorting
}

/**
 * Request payload for bulk updating leads
 */
export interface BulkUpdateRequest {
  /** Array of lead IDs to update */
  leadIds: string[]
  /** Updates to apply to the leads */
  updates: {
    /** New status for the leads */
    status?: LeadStatus
    /** New campaign ID for the leads */
    campaignId?: string | null
    /** New lead list ID for the leads */
    leadListId?: string | null
    /** Custom fields to update */
    customFields?: Record<string, unknown>
  }
}

/**
 * Response from bulk update operation
 */
export interface BulkUpdateResponse {
  /** Number of leads successfully updated */
  updated: number
  /** Number of leads requested to be updated */
  requested: number
  /** Updated lead information */
  leads: Pick<Lead, 'id' | 'status' | 'campaign_id' | 'updated_at'>[]
}

/**
 * Lead statistics summary
 */
export interface LeadStatsSummary {
  /** Total number of leads */
  total_leads: number
  /** Number of active leads */
  active_leads: number
  /** Number of inactive leads */
  inactive_leads: number
  /** Number of bounced leads */
  bounced_leads: number
  /** Number of unsubscribed leads */
  unsubscribed_leads: number
  /** Number of leads who responded */
  responded_leads: number
  /** Number of leads with email addresses */
  leads_with_email: number
  /** Number of leads with phone numbers */
  leads_with_phone: number
  /** Number of leads with LinkedIn profiles */
  leads_with_linkedin: number
  /** Number of leads added in the last week */
  leads_added_last_week: number
  /** Number of leads added in the last month */
  leads_added_last_month: number
}

/**
 * Campaign distribution data point
 */
export interface CampaignDistribution {
  /** Name of the campaign */
  campaign_name: string
  /** Number of leads in this campaign */
  lead_count: number
}

/**
 * Complete lead statistics
 */
export interface LeadStats {
  /** Summary statistics */
  summary: LeadStatsSummary
  /** Distribution across campaigns */
  campaignDistribution: CampaignDistribution[]
}