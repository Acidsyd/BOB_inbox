/**
 * Export all leads-related components for easy importing
 * Optimized for tree-shaking and performance
 */

export { default as LeadsTable } from './LeadsTable';
export { default as LeadsImportPicker } from './LeadsImportPicker';
export { default as LeadSegmentationDashboard } from './LeadSegmentationDashboard';

// Re-export optimized lead types
export type {
  Lead,
  LeadStatus,
  LeadFilters,
  LeadSorting,
  LeadSortableColumn,
  LeadsResponse,
  BulkUpdateRequest,
  BulkUpdateResponse,
  UseLeadsParams,
  LeadStats,
  LeadStatsSummary,
  CampaignDistribution
} from '@/types/leads';