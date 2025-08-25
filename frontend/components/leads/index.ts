/**
 * Export all leads-related components for easy importing
 */

export { default as ClayStyleSpreadsheet } from './ClayStyleSpreadsheet';
export { default as VirtualScrollTable } from './VirtualScrollTable';
export { default as CellEditor } from './CellEditor';
export { default as LeadsImportPicker } from './LeadsImportPicker';
export { default as ColumnManager } from './ColumnManager';
export { default as FilterPanel } from './FilterPanel';
export { default as LeadSegmentationDashboard } from './LeadSegmentationDashboard';

// Re-export types for convenience
export type {
  ClayStyleSpreadsheetProps,
  LeadsImportPickerProps,
  ColumnManagerProps,
  FilterPanelProps,
  CellEditorProps,
  Lead,
  ColumnDefinition,
  ColumnType,
  FilterConfig,
  SortConfig,
  ViewConfig,
  SpreadsheetState,
  CellPosition,
  CellSelection
} from '@/types/spreadsheet';