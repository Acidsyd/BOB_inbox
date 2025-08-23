export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          plan_type: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          plan_type?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          plan_type?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string
          email: string
          password_hash: string
          first_name: string | null
          last_name: string | null
          role: string
          settings: Json
          email_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          password_hash: string
          first_name?: string | null
          last_name?: string | null
          role?: string
          settings?: Json
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          password_hash?: string
          first_name?: string | null
          last_name?: string | null
          role?: string
          settings?: Json
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      email_accounts: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          email: string
          provider: string
          credentials_encrypted: string
          settings: Json
          health_score: number
          warmup_status: string
          daily_limit: number
          current_sent_today: number
          last_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          email: string
          provider: string
          credentials_encrypted: string
          settings?: Json
          health_score?: number
          warmup_status?: string
          daily_limit?: number
          current_sent_today?: number
          last_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          email?: string
          provider?: string
          credentials_encrypted?: string
          settings?: Json
          health_score?: number
          warmup_status?: string
          daily_limit?: number
          current_sent_today?: number
          last_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          organization_id: string
          name: string
          status: string
          config: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          status?: string
          config: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          status?: string
          config?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          campaign_id: string | null
          email: string
          first_name: string | null
          last_name: string | null
          company: string | null
          data: Json
          status: string
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          campaign_id?: string | null
          email: string
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          data?: Json
          status?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          campaign_id?: string | null
          email?: string
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          data?: Json
          status?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      email_queue: {
        Row: {
          id: string
          campaign_id: string
          lead_id: string
          email_account_id: string
          sequence_step: number
          subject: string | null
          body: string | null
          scheduled_at: string
          status: string
          attempts: number
          last_attempt_at: string | null
          error_message: string | null
          n8n_execution_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          lead_id: string
          email_account_id: string
          sequence_step?: number
          subject?: string | null
          body?: string | null
          scheduled_at: string
          status?: string
          attempts?: number
          last_attempt_at?: string | null
          error_message?: string | null
          n8n_execution_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          lead_id?: string
          email_account_id?: string
          sequence_step?: number
          subject?: string | null
          body?: string | null
          scheduled_at?: string
          status?: string
          attempts?: number
          last_attempt_at?: string | null
          error_message?: string | null
          n8n_execution_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_activities: {
        Row: {
          id: string
          email_queue_id: string
          lead_id: string
          campaign_id: string
          event_type: string
          timestamp: string
          metadata: Json
          n8n_execution_id: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          email_queue_id: string
          lead_id: string
          campaign_id: string
          event_type: string
          timestamp?: string
          metadata?: Json
          n8n_execution_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          email_queue_id?: string
          lead_id?: string
          campaign_id?: string
          event_type?: string
          timestamp?: string
          metadata?: Json
          n8n_execution_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      templates: {
        Row: {
          id: string
          organization_id: string
          name: string
          category: string | null
          subject: string | null
          body: string
          variables: Json
          is_shared: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          category?: string | null
          subject?: string | null
          body: string
          variables?: Json
          is_shared?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          category?: string | null
          subject?: string | null
          body?: string
          variables?: Json
          is_shared?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Frontend-specific types for email accounts
export interface EmailAccount {
  id: string
  email: string
  provider: 'gmail' | 'outlook' | 'smtp'
  status: 'active' | 'warming' | 'paused' | 'error'
  health: number
  dailyLimit: number
  sentToday: number
  warmupProgress: number
  warmupDaysRemaining: number
  lastActivity: string
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  config: {
    sequences?: any[]
    settings?: any
    selectedAccounts?: string[]
  }
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  status: 'active' | 'contacted' | 'replied' | 'bounced' | 'unsubscribed'
  tags: string[]
  data: Record<string, any>
}

export interface EmailActivity {
  id: string
  eventType: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed'
  timestamp: string
  metadata: Record<string, any>
}