/**
 * Utility functions for Clay.com-style spreadsheet interface
 */

import { 
  Lead, 
  ColumnDefinition, 
  ColumnType, 
  FilterConfig, 
  ColumnFilter, 
  SortConfig,
  CellPosition,
  CellSelection,
  ViewConfig,
  ValidationError,
  SelectOption,
  FilterOperator
} from '@/types/spreadsheet';

// Column Management Utilities
export const createDefaultColumns = (): ColumnDefinition[] => [
  {
    id: 'select',
    key: 'select',
    name: '',
    type: 'boolean',
    width: 40,
    minWidth: 40,
    maxWidth: 40,
    resizable: false,
    sortable: false,
    filterable: false,
    editable: false,
    hidden: false,
    pinned: 'left'
  },
  {
    id: 'email',
    key: 'email',
    name: 'Email',
    type: 'email',
    width: 250,
    minWidth: 150,
    maxWidth: 400,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    required: true,
    hidden: false,
    pinned: null
  },
  {
    id: 'firstName',
    key: 'firstName',
    name: 'First Name',
    type: 'text',
    width: 120,
    minWidth: 80,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    hidden: false,
    pinned: null
  },
  {
    id: 'lastName',
    key: 'lastName',
    name: 'Last Name',
    type: 'text',
    width: 120,
    minWidth: 80,
    maxWidth: 200,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    hidden: false,
    pinned: null
  },
  {
    id: 'company',
    key: 'company',
    name: 'Company',
    type: 'text',
    width: 180,
    minWidth: 100,
    maxWidth: 300,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    hidden: false,
    pinned: null
  },
  {
    id: 'jobTitle',
    key: 'jobTitle',
    name: 'Job Title',
    type: 'text',
    width: 150,
    minWidth: 100,
    maxWidth: 250,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    hidden: false,
    pinned: null
  },
  {
    id: 'phone',
    key: 'phone',
    name: 'Phone',
    type: 'phone',
    width: 130,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    hidden: false,
    pinned: null
  },
  {
    id: 'status',
    key: 'status',
    name: 'Status',
    type: 'select',
    width: 100,
    minWidth: 80,
    maxWidth: 150,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: true,
    hidden: false,
    pinned: null,
    selectOptions: [
      { value: 'active', label: 'Active', color: '#10b981' },
      { value: 'inactive', label: 'Inactive', color: '#6b7280' },
      { value: 'bounced', label: 'Bounced', color: '#ef4444' },
      { value: 'unsubscribed', label: 'Unsubscribed', color: '#f59e0b' },
      { value: 'responded', label: 'Responded', color: '#8b5cf6' }
    ]
  },
  {
    id: 'lastActivity',
    key: 'lastActivity',
    name: 'Last Activity',
    type: 'date',
    width: 120,
    minWidth: 100,
    maxWidth: 180,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: false,
    hidden: false,
    pinned: null
  },
  {
    id: 'emailsSent',
    key: 'emailsSent',
    name: 'Emails Sent',
    type: 'number',
    width: 90,
    minWidth: 70,
    maxWidth: 120,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: false,
    hidden: false,
    pinned: null
  },
  {
    id: 'replies',
    key: 'replies',
    name: 'Replies',
    type: 'number',
    width: 80,
    minWidth: 60,
    maxWidth: 100,
    resizable: true,
    sortable: true,
    filterable: true,
    editable: false,
    hidden: false,
    pinned: null
  }
];

// Cell Value Utilities
export const getCellValue = (lead: Lead, column: ColumnDefinition): any => {
  if (column.key === 'select') {
    return false; // Selection state handled separately
  }
  
  const value = (lead as any)[column.key];
  
  // Handle extended fields
  if (value === undefined && lead.extendedFields) {
    return lead.extendedFields[column.key];
  }
  
  return value;
};

export const setCellValue = (lead: Lead, column: ColumnDefinition, value: any): Lead => {
  const updatedLead = { ...lead };
  
  if (column.key in lead) {
    (updatedLead as any)[column.key] = value;
  } else {
    // Handle extended fields
    updatedLead.extendedFields = {
      ...updatedLead.extendedFields,
      [column.key]: value
    };
  }
  
  return updatedLead;
};

// Validation Utilities
export const validateCellValue = (
  value: any, 
  column: ColumnDefinition
): ValidationError | null => {
  const { validation, type, required } = column;
  
  // Required field validation
  if (required && (value === null || value === undefined || value === '')) {
    return {
      field: column.key,
      value,
      rule: 'required',
      message: `${column.name} is required`
    };
  }
  
  // Skip validation for empty optional fields
  if (!required && (value === null || value === undefined || value === '')) {
    return null;
  }
  
  // Type-specific validation
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return {
          field: column.key,
          value,
          rule: 'email',
          message: 'Invalid email format'
        };
      }
      break;
      
    case 'phone':
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanedPhone = String(value).replace(/[\s\-\(\)\.]/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        return {
          field: column.key,
          value,
          rule: 'phone',
          message: 'Invalid phone number format'
        };
      }
      break;
      
    case 'number':
      if (isNaN(Number(value))) {
        return {
          field: column.key,
          value,
          rule: 'number',
          message: 'Must be a valid number'
        };
      }
      break;
      
    case 'url':
      try {
        new URL(value);
      } catch {
        return {
          field: column.key,
          value,
          rule: 'url',
          message: 'Invalid URL format'
        };
      }
      break;
  }
  
  // Custom validation rules
  if (validation) {
    if (validation.minLength && String(value).length < validation.minLength) {
      return {
        field: column.key,
        value,
        rule: 'minLength',
        message: `Must be at least ${validation.minLength} characters`
      };
    }
    
    if (validation.maxLength && String(value).length > validation.maxLength) {
      return {
        field: column.key,
        value,
        rule: 'maxLength',
        message: `Must be no more than ${validation.maxLength} characters`
      };
    }
    
    if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
      return {
        field: column.key,
        value,
        rule: 'pattern',
        message: 'Invalid format'
      };
    }
    
    if (validation.customValidator) {
      const result = validation.customValidator(value);
      if (typeof result === 'string') {
        return {
          field: column.key,
          value,
          rule: 'custom',
          message: result
        };
      }
      if (result === false) {
        return {
          field: column.key,
          value,
          rule: 'custom',
          message: 'Invalid value'
        };
      }
    }
  }
  
  return null;
};

// Formatting Utilities
export const formatCellValue = (
  value: any, 
  column: ColumnDefinition
): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const { type, formatting } = column;
  
  switch (type) {
    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) return String(value);
      
      let formatted = numValue.toFixed(formatting?.numberFormat?.decimals ?? 0);
      
      if (formatting?.numberFormat?.prefix) {
        formatted = formatting.numberFormat.prefix + formatted;
      }
      if (formatting?.numberFormat?.suffix) {
        formatted = formatted + formatting.numberFormat.suffix;
      }
      
      return formatted;
      
    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value);
      
      const format = formatting?.dateFormat ?? 'MM/dd/yyyy';
      
      // Simple date formatting (consider using date-fns for more complex formats)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return format
        .replace('yyyy', String(year))
        .replace('MM', month)
        .replace('dd', day);
        
    case 'select':
      const option = column.selectOptions?.find(opt => opt.value === value);
      return option?.label ?? String(value);
      
    case 'tags':
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
      
    case 'boolean':
      return value ? 'Yes' : 'No';
      
    default:
      return String(value);
  }
};

// Filtering Utilities
export const applyFilters = (
  leads: Lead[], 
  filterConfig: FilterConfig, 
  columns: ColumnDefinition[]
): Lead[] => {
  let filteredLeads = [...leads];
  
  // Apply search term
  if (filterConfig.searchTerm) {
    const searchTerm = filterConfig.searchTerm.toLowerCase();
    filteredLeads = filteredLeads.filter(lead => {
      return columns.some(column => {
        if (!column.filterable) return false;
        const value = getCellValue(lead, column);
        return String(value || '').toLowerCase().includes(searchTerm);
      });
    });
  }
  
  // Apply column filters
  for (const filter of filterConfig.activeFilters) {
    filteredLeads = applyColumnFilter(filteredLeads, filter, columns);
  }
  
  return filteredLeads;
};

export const applyColumnFilter = (
  leads: Lead[], 
  filter: ColumnFilter, 
  columns: ColumnDefinition[]
): Lead[] => {
  const column = columns.find(col => col.id === filter.columnId);
  if (!column) return leads;
  
  return leads.filter(lead => {
    const cellValue = getCellValue(lead, column);
    return evaluateFilterCondition(cellValue, filter.operator, filter.value, filter.values);
  });
};

export const evaluateFilterCondition = (
  cellValue: any, 
  operator: FilterOperator, 
  filterValue: any, 
  filterValues?: any[]
): boolean => {
  const cellStr = String(cellValue || '').toLowerCase();
  const filterStr = String(filterValue || '').toLowerCase();
  
  switch (operator) {
    case 'equals':
      return cellValue === filterValue;
    case 'not_equals':
      return cellValue !== filterValue;
    case 'contains':
      return cellStr.includes(filterStr);
    case 'not_contains':
      return !cellStr.includes(filterStr);
    case 'starts_with':
      return cellStr.startsWith(filterStr);
    case 'ends_with':
      return cellStr.endsWith(filterStr);
    case 'is_empty':
      return cellValue === null || cellValue === undefined || cellValue === '';
    case 'is_not_empty':
      return cellValue !== null && cellValue !== undefined && cellValue !== '';
    case 'greater_than':
      return Number(cellValue) > Number(filterValue);
    case 'less_than':
      return Number(cellValue) < Number(filterValue);
    case 'between':
      if (filterValues && filterValues.length >= 2) {
        const num = Number(cellValue);
        return num >= Number(filterValues[0]) && num <= Number(filterValues[1]);
      }
      return false;
    case 'in':
      return filterValues ? filterValues.includes(cellValue) : false;
    case 'not_in':
      return filterValues ? !filterValues.includes(cellValue) : true;
    default:
      return true;
  }
};

// Sorting Utilities
export const applySorting = (
  leads: Lead[], 
  sortConfig: SortConfig, 
  columns: ColumnDefinition[]
): Lead[] => {
  const column = columns.find(col => col.id === sortConfig.columnId);
  if (!column || !column.sortable) return leads;
  
  return [...leads].sort((a, b) => {
    const aValue = getCellValue(a, column);
    const bValue = getCellValue(b, column);
    
    let comparison = 0;
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    // Type-specific comparison
    switch (column.type) {
      case 'number':
        comparison = Number(aValue) - Number(bValue);
        break;
      case 'date':
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        comparison = aDate.getTime() - bDate.getTime();
        break;
      default:
        comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortConfig.direction === 'desc' ? -comparison : comparison;
  });
};

// Selection Utilities
export const isRowSelected = (rowId: string, selectedRows: Set<string>): boolean => {
  return selectedRows.has(rowId);
};

export const toggleRowSelection = (
  rowId: string, 
  selectedRows: Set<string>, 
  isMultiSelect: boolean = false
): Set<string> => {
  const newSelection = new Set(isMultiSelect ? selectedRows : []);
  
  if (newSelection.has(rowId)) {
    newSelection.delete(rowId);
  } else {
    newSelection.add(rowId);
  }
  
  return newSelection;
};

export const selectRowRange = (
  startRowId: string, 
  endRowId: string, 
  leads: Lead[], 
  selectedRows: Set<string>
): Set<string> => {
  const startIndex = leads.findIndex(lead => lead.id === startRowId);
  const endIndex = leads.findIndex(lead => lead.id === endRowId);
  
  if (startIndex === -1 || endIndex === -1) return selectedRows;
  
  const minIndex = Math.min(startIndex, endIndex);
  const maxIndex = Math.max(startIndex, endIndex);
  
  const newSelection = new Set(selectedRows);
  
  for (let i = minIndex; i <= maxIndex; i++) {
    newSelection.add(leads[i].id);
  }
  
  return newSelection;
};

// Cell Navigation Utilities
export const getNextCell = (
  currentPosition: CellPosition, 
  direction: 'up' | 'down' | 'left' | 'right', 
  leads: Lead[], 
  columns: ColumnDefinition[]
): CellPosition | null => {
  const currentRowIndex = leads.findIndex(lead => lead.id === currentPosition.rowId);
  const currentColumnIndex = columns.findIndex(col => col.id === currentPosition.columnId);
  
  if (currentRowIndex === -1 || currentColumnIndex === -1) return null;
  
  let nextRowIndex = currentRowIndex;
  let nextColumnIndex = currentColumnIndex;
  
  switch (direction) {
    case 'up':
      nextRowIndex = Math.max(0, currentRowIndex - 1);
      break;
    case 'down':
      nextRowIndex = Math.min(leads.length - 1, currentRowIndex + 1);
      break;
    case 'left':
      nextColumnIndex = Math.max(0, currentColumnIndex - 1);
      break;
    case 'right':
      nextColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1);
      break;
  }
  
  // Skip non-editable columns when navigating horizontally
  if (direction === 'left' || direction === 'right') {
    while (nextColumnIndex >= 0 && nextColumnIndex < columns.length) {
      const column = columns[nextColumnIndex];
      if (column.editable && !column.hidden) break;
      
      if (direction === 'left') {
        nextColumnIndex--;
      } else {
        nextColumnIndex++;
      }
    }
    
    // Wrap to next/previous row if we hit the end
    if (nextColumnIndex < 0 || nextColumnIndex >= columns.length) {
      if (direction === 'left' && currentRowIndex > 0) {
        nextRowIndex = currentRowIndex - 1;
        nextColumnIndex = columns.length - 1;
      } else if (direction === 'right' && currentRowIndex < leads.length - 1) {
        nextRowIndex = currentRowIndex + 1;
        nextColumnIndex = 0;
      } else {
        return null;
      }
    }
  }
  
  if (nextRowIndex >= 0 && nextRowIndex < leads.length && 
      nextColumnIndex >= 0 && nextColumnIndex < columns.length) {
    return {
      rowId: leads[nextRowIndex].id,
      columnId: columns[nextColumnIndex].id
    };
  }
  
  return null;
};

// Clipboard Utilities
export const serializeSelection = (
  selection: CellSelection[], 
  leads: Lead[], 
  columns: ColumnDefinition[]
): string => {
  if (selection.length === 0) return '';
  
  // For simplicity, handle single selection for now
  const sel = selection[0];
  if (!sel.end) {
    // Single cell
    const lead = leads.find(l => l.id === sel.start.rowId);
    const column = columns.find(c => c.id === sel.start.columnId);
    if (!lead || !column) return '';
    
    return formatCellValue(getCellValue(lead, column), column);
  }
  
  // Range selection - create TSV format
  const rows: string[] = [];
  // Implementation would depend on the specific selection range
  // This is a simplified version
  
  return rows.join('\n');
};

// View Configuration Utilities
export const createViewFromCurrentState = (
  name: string,
  columns: ColumnDefinition[],
  sortConfig?: SortConfig,
  filterConfig?: FilterConfig,
  isDefault: boolean = false
): ViewConfig => {
  return {
    name,
    columnOrder: columns.map(col => col.id),
    columnWidths: columns.reduce((acc, col) => {
      acc[col.id] = col.width;
      return acc;
    }, {} as Record<string, number>),
    hiddenColumns: columns.filter(col => col.hidden).map(col => col.id),
    pinnedColumns: {
      left: columns.filter(col => col.pinned === 'left').map(col => col.id),
      right: columns.filter(col => col.pinned === 'right').map(col => col.id)
    },
    sortConfig,
    filterConfig,
    isDefault
  };
};

export const applyViewToColumns = (
  columns: ColumnDefinition[], 
  view: ViewConfig
): ColumnDefinition[] => {
  // Reorder columns based on view
  const orderedColumns = view.columnOrder
    .map(colId => columns.find(col => col.id === colId))
    .filter(Boolean) as ColumnDefinition[];
  
  // Add any columns not in the view order
  const remainingColumns = columns.filter(
    col => !view.columnOrder.includes(col.id)
  );
  
  const allColumns = [...orderedColumns, ...remainingColumns];
  
  // Apply view configuration
  return allColumns.map(column => ({
    ...column,
    width: view.columnWidths[column.id] ?? column.width,
    hidden: view.hiddenColumns.includes(column.id),
    pinned: view.pinnedColumns.left.includes(column.id) ? 'left' :
           view.pinnedColumns.right.includes(column.id) ? 'right' : null
  }));
};

// Performance Utilities
export const debounce = <T extends (...args: any[]) => void>(
  func: T, 
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T, 
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastExecution = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastExecution > delay) {
      func(...args);
      lastExecution = now;
    }
  };
};

// Data Export Utilities
export const exportToCSV = (
  leads: Lead[], 
  columns: ColumnDefinition[], 
  filename: string = 'leads.csv'
): void => {
  const headers = columns.filter(col => !col.hidden && col.key !== 'select')
    .map(col => col.name);
  
  const rows = leads.map(lead => 
    columns.filter(col => !col.hidden && col.key !== 'select')
      .map(col => {
        const value = getCellValue(lead, col);
        const formatted = formatCellValue(value, col);
        // Escape commas and quotes for CSV
        return `"${formatted.replace(/"/g, '""')}"`;
      })
  );
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
};