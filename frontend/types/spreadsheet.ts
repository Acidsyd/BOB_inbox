/**
 * Essential TypeScript types for leads management system
 */

// Core Lead Interface
export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  linkedinUrl?: string;
  status: LeadStatus;
  campaignId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  
  // Extended data from lead_data_extended table
  extendedFields: Record<string, any>;
  
  // Activity metrics
  emailsSent: number;
  emailsOpened: number;
  replies: number;
  
  // Metadata
  campaignName?: string;
  listName?: string;
}

export type LeadStatus = 'active' | 'inactive' | 'bounced' | 'unsubscribed' | 'responded';

// Import Related Types (keeping these as they may be needed for CSV import)
export interface LeadImport {
  id: string;
  importName: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'excel' | 'json';
  status: ImportStatus;
  createdAt: string;
  
  // Progress information
  progressCurrent: number;
  progressTotal: number;
  progressPercentage: number;
  
  // Results
  leadsTotal: number;
  leadsImported: number;
  leadsSkipped: number;
  leadsFailed: number;
  
  // Error information
  errorMessage?: string;
}

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// API Response Types
export interface LeadsApiResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: any;
  sorting: any;
}

export interface LeadImportsApiResponse {
  imports: LeadImport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}