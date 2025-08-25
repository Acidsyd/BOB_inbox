/**
 * Comprehensive TypeScript types for Clay.com-style spreadsheet interface
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

// Column Types and Definitions
export type ColumnType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'formula' 
  | 'enrichment' 
  | 'tags' 
  | 'url'
  | 'boolean';

export interface ColumnDefinition {
  id: string;
  key: string; // Field key in the lead object
  name: string; // Display name
  type: ColumnType;
  width: number;
  minWidth: number;
  maxWidth?: number;
  resizable: boolean;
  sortable: boolean;
  filterable: boolean;
  editable: boolean;
  required?: boolean;
  hidden: boolean;
  pinned?: 'left' | 'right' | null;
  
  // Type-specific configuration
  validation?: ColumnValidation;
  formatting?: ColumnFormatting;
  selectOptions?: SelectOption[];
  
  // Formula configuration
  formula?: FormulaConfig;
  
  // Enrichment configuration
  enrichment?: EnrichmentConfig;
}

export interface ColumnValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean | string;
}

export interface ColumnFormatting {
  currency?: string;
  dateFormat?: string;
  numberFormat?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface FormulaConfig {
  expression: string;
  dependencies: string[]; // Column IDs this formula depends on
  resultType: ColumnType;
}

export interface EnrichmentConfig {
  provider: string;
  endpoint: string;
  mapping: Record<string, string>;
  autoRun: boolean;
}

// Spreadsheet State and Configuration
export interface SpreadsheetState {
  leads: Lead[];
  columns: ColumnDefinition[];
  selectedRows: Set<string>;
  selectedCells: CellSelection[];
  editingCell?: CellPosition;
  sortConfig?: SortConfig;
  filterConfig: FilterConfig;
  viewConfig: ViewConfig;
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Performance metrics
  totalRows: number;
  visibleRows: [number, number]; // [start, end] of visible row range
  
  // Clipboard
  copiedCells?: CopiedCellData;
}

export interface CellPosition {
  rowId: string;
  columnId: string;
}

export interface CellSelection {
  start: CellPosition;
  end?: CellPosition;
}

export interface CopiedCellData {
  cells: Array<{
    position: CellPosition;
    value: any;
    formattedValue: string;
  }>;
  range: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  activeFilters: ColumnFilter[];
  quickFilters: QuickFilter[];
  searchTerm: string;
}

export interface ColumnFilter {
  columnId: string;
  operator: FilterOperator;
  value: any;
  values?: any[]; // For multi-select filters
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'is_empty' 
  | 'is_not_empty' 
  | 'greater_than' 
  | 'less_than' 
  | 'between' 
  | 'in' 
  | 'not_in';

export interface QuickFilter {
  id: string;
  name: string;
  filters: ColumnFilter[];
  isActive: boolean;
}

export interface ViewConfig {
  id?: string;
  name: string;
  columnOrder: string[];
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  pinnedColumns: {
    left: string[];
    right: string[];
  };
  sortConfig?: SortConfig;
  filterConfig?: FilterConfig;
  isDefault: boolean;
}

// Cell Editor Types
export interface CellEditorProps {
  value: any;
  column: ColumnDefinition;
  lead: Lead;
  onChange: (value: any) => void;
  onComplete: () => void;
  onCancel: () => void;
  isValid: boolean;
  validationError?: string;
}

export interface CellRendererProps {
  value: any;
  column: ColumnDefinition;
  lead: Lead;
  isSelected: boolean;
  isEditing: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

// Virtual Scrolling Types
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  horizontal: boolean;
}

export interface VirtualScrollState {
  scrollTop: number;
  scrollLeft: number;
  startIndex: number;
  endIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

// Import Related Types
export interface LeadImport {
  id: string;
  importName: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'excel' | 'json';
  status: ImportStatus;
  mappingConfig: ImportMappingConfig;
  validationRules: ValidationRule[];
  deduplicationEnabled: boolean;
  deduplicationFields: string[];
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
  failedRows: ImportFailedRow[];
  validationErrors: ValidationError[];
}

export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImportMappingConfig {
  [csvColumn: string]: {
    leadField: string;
    columnType: ColumnType;
    transformation?: string;
  };
}

export interface ValidationRule {
  field: string;
  rule: string;
  parameters: any[];
  message: string;
}

export interface ImportFailedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
}

export interface ValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
}

// Bulk Operations
export interface BulkOperation {
  id: string;
  name: string;
  icon: React.ComponentType;
  action: (selectedLeads: Lead[]) => void;
  confirmationRequired: boolean;
  confirmationMessage?: string;
  isDestructive: boolean;
  requiredPermission?: string;
}

export interface BulkUpdateOperation {
  field: string;
  operation: 'set' | 'append' | 'remove' | 'clear';
  value?: any;
  values?: any[];
}

// Keyboard Navigation
export interface KeyboardNavigationState {
  focusedCell?: CellPosition;
  selectionStart?: CellPosition;
  selectionEnd?: CellPosition;
  isSelectingRange: boolean;
  lastFocusedCell?: CellPosition;
}

// Context Menu Types
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  target?: 'cell' | 'column' | 'row' | 'selection';
  targetId?: string;
}

// Performance Monitoring
export interface PerformanceMetrics {
  renderTime: number;
  scrollPerformance: {
    fps: number;
    averageFrameTime: number;
  };
  dataLoadTime: number;
  filterTime: number;
  sortTime: number;
}

// Error Handling
export interface SpreadsheetError {
  type: 'data' | 'validation' | 'network' | 'permission' | 'performance';
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
}

// Undo/Redo System
export interface UndoRedoState {
  history: SpreadsheetAction[];
  currentIndex: number;
  maxHistorySize: number;
}

export interface SpreadsheetAction {
  type: string;
  timestamp: Date;
  data: {
    before: any;
    after: any;
    affectedRows: string[];
    affectedColumns: string[];
  };
  description: string;
}

// WebSocket Real-time Updates
export interface RealTimeUpdate {
  type: 'lead_updated' | 'lead_created' | 'lead_deleted' | 'bulk_update' | 'column_updated';
  data: any;
  timestamp: string;
  organizationId: string;
}

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

// Component Props
export interface ClayStyleSpreadsheetProps {
  organizationId: string;
  initialFilters?: FilterConfig;
  initialColumns?: ColumnDefinition[];
  initialView?: ViewConfig;
  onSelectionChange?: (selectedRows: Set<string>) => void;
  onLeadUpdate?: (lead: Lead) => void;
  onBulkUpdate?: (leadIds: string[], updates: any) => void;
  enableRealTime?: boolean;
  maxRows?: number;
}

export interface LeadsImportPickerProps {
  onImportSelected: (importId: string) => void;
  selectedImportId?: string;
  organizationId: string;
}

export interface ColumnManagerProps {
  columns: ColumnDefinition[];
  onColumnsChange: (columns: ColumnDefinition[]) => void;
  onViewSave: (view: ViewConfig) => void;
  availableViews: ViewConfig[];
}

export interface FilterPanelProps {
  columns: ColumnDefinition[];
  filterConfig: FilterConfig;
  onFilterChange: (filterConfig: FilterConfig) => void;
  quickFilters: QuickFilter[];
  onQuickFilterToggle: (filterId: string) => void;
}

export interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedLeads: Lead[];
  onBulkAction: (operation: BulkUpdateOperation[]) => void;
  availableActions: BulkOperation[];
  isProcessing: boolean;
}