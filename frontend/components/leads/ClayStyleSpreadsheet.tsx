'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ClayStyleSpreadsheetProps,
  Lead,
  ColumnDefinition,
  CellPosition,
  CellSelection,
  SpreadsheetState,
  ContextMenuState,
  ContextMenuItem,
  KeyboardNavigationState,
  FilterConfig,
  SortConfig,
  ViewConfig
} from '@/types/spreadsheet';

// Components
import VirtualScrollTable from './VirtualScrollTable';
import CellEditor from './CellEditor';
import LeadsImportPicker from './LeadsImportPicker';
import ColumnManager from './ColumnManager';
import FilterPanel from './FilterPanel';

// Hooks
import { useSpreadsheetData } from '@/hooks/useSpreadsheetData';
import { useClipboard } from '@/hooks/useClipboard';

// Utils
import { 
  createDefaultColumns,
  getCellValue,
  setCellValue,
  getNextCell,
  toggleRowSelection,
  selectRowRange,
  isRowSelected,
  validateCellValue,
  createViewFromCurrentState,
  applyViewToColumns,
  exportToCSV
} from '@/lib/spreadsheetUtils';
import { cn } from '@/lib/utils';

// Icons
import {
  Columns3,
  Filter,
  Upload,
  Download,
  Settings,
  Maximize2,
  RefreshCw,
  Copy,
  Scissors,
  ClipboardPaste,
  MoreHorizontal
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ClayStyleSpreadsheet: React.FC<ClayStyleSpreadsheetProps> = ({
  organizationId,
  initialFilters,
  initialColumns,
  initialView,
  onSelectionChange,
  onLeadUpdate,
  onBulkUpdate,
  enableRealTime = true,
  maxRows = 100000
}) => {
  // State management
  const [columns, setColumns] = useState<ColumnDefinition[]>(
    initialColumns || createDefaultColumns()
  );
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<CellSelection[]>([]);
  const [editingCell, setEditingCell] = useState<CellPosition | undefined>();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | undefined>();
  const [keyboardNavigation, setKeyboardNavigation] = useState<KeyboardNavigationState>({});
  const [selectedImportId, setSelectedImportId] = useState<string>('');
  
  // Panel states
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showImportPicker, setShowImportPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Spreadsheet dimensions
  const containerHeight = isFullscreen ? window.innerHeight - 100 : 600;
  const containerWidth = isFullscreen ? window.innerWidth - 100 : 1200;
  const rowHeight = 40;
  
  // Data hook
  const {
    leads,
    totalCount,
    isLoading,
    error,
    filters,
    sorting,
    setFilters,
    setSorting,
    updateLead,
    bulkUpdateLeads,
    refresh
  } = useSpreadsheetData({
    organizationId,
    initialFilters,
    enableRealTime
  });
  
  // Clipboard hook
  const {
    copiedData,
    canPaste,
    copy,
    paste,
    cut,
    clear: clearClipboard
  } = useClipboard({
    leads,
    columns,
    onLeadsUpdate: (updatedLeads) => {
      // Handle local lead updates
      console.log('Leads updated via clipboard:', updatedLeads.length);
    }
  });
  
  // Handle row selection
  const handleRowSelect = useCallback((
    leadId: string,
    isMultiSelect: boolean,
    isRangeSelect: boolean
  ) => {
    let newSelection: Set<string>;
    
    if (isRangeSelect && selectedRows.size > 0) {
      const lastSelectedId = Array.from(selectedRows).pop() || leadId;
      newSelection = selectRowRange(lastSelectedId, leadId, leads, selectedRows);
    } else {
      newSelection = toggleRowSelection(leadId, selectedRows, isMultiSelect);
    }
    
    setSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  }, [selectedRows, leads, onSelectionChange]);
  
  // Handle cell click
  const handleCellClick = useCallback((position: CellPosition) => {
    setSelectedCells([{ start: position }]);
    setKeyboardNavigation({ focusedCell: position });
    
    // Clear editing if clicking different cell
    if (editingCell && 
        (editingCell.rowId !== position.rowId || editingCell.columnId !== position.columnId)) {
      setEditingCell(undefined);
    }
  }, [editingCell]);
  
  // Handle cell double click (start editing)
  const handleCellDoubleClick = useCallback((position: CellPosition) => {
    const column = columns.find(col => col.id === position.columnId);
    if (column?.editable) {
      setEditingCell(position);
    }
  }, [columns]);
  
  // Handle cell right click (context menu)
  const handleCellRightClick = useCallback((position: CellPosition, event: React.MouseEvent) => {
    event.preventDefault();
    
    const menuItems: ContextMenuItem[] = [
      {
        id: 'copy',
        label: 'Copy',
        icon: Copy,
        action: () => copy([{ start: position }]),
        shortcut: 'Ctrl+C'
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: Scissors,
        action: () => cut([{ start: position }]),
        shortcut: 'Ctrl+X'
      },
      {
        id: 'paste',
        label: 'Paste',
        icon: ClipboardPaste,
        action: () => paste(position),
        shortcut: 'Ctrl+V',
        disabled: !canPaste
      },
      { id: 'separator', separator: true, label: '', action: () => {} },
      {
        id: 'edit',
        label: 'Edit Cell',
        action: () => setEditingCell(position),
        disabled: !columns.find(col => col.id === position.columnId)?.editable
      }
    ];
    
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      items: menuItems,
      target: 'cell',
      targetId: `${position.rowId}-${position.columnId}`
    });
  }, [columns, copy, cut, paste, canPaste]);
  
  // Handle column header click (sorting)
  const handleColumnHeaderClick = useCallback((columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;
    
    const newDirection = sorting?.columnId === columnId && sorting.direction === 'asc' 
      ? 'desc' 
      : 'asc';
    
    setSorting({ columnId, direction: newDirection });
  }, [columns, sorting, setSorting]);
  
  // Handle column resize
  const handleColumnResize = useCallback((columnId: string, newWidth: number) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, width: newWidth } : col
    );
    setColumns(newColumns);
  }, [columns]);
  
  // Handle cell edit complete
  const handleCellEditComplete = useCallback(async (value: any) => {
    if (!editingCell) return;
    
    const lead = leads.find(l => l.id === editingCell.rowId);
    const column = columns.find(c => c.id === editingCell.columnId);
    
    if (!lead || !column) return;
    
    // Validate the value
    const validationError = validateCellValue(value, column);
    if (validationError) {
      console.error('Validation error:', validationError);
      return;
    }
    
    try {
      // Update the lead
      const updatedLead = setCellValue(lead, column, value);
      await updateLead(lead.id, { [column.key]: value });
      
      onLeadUpdate?.(updatedLead);
      setEditingCell(undefined);
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  }, [editingCell, leads, columns, updateLead, onLeadUpdate]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!keyboardNavigation.focusedCell) return;
      
      // Don't handle keyboard events while editing
      if (editingCell) return;
      
      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          event.preventDefault();
          const direction = event.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
          const nextCell = getNextCell(keyboardNavigation.focusedCell, direction, leads, columns);
          if (nextCell) {
            setKeyboardNavigation({ focusedCell: nextCell });
            setSelectedCells([{ start: nextCell }]);
          }
          break;
          
        case 'Enter':
          event.preventDefault();
          handleCellDoubleClick(keyboardNavigation.focusedCell);
          break;
          
        case 'Delete':
        case 'Backspace':
          if (selectedRows.size > 0) {
            event.preventDefault();
            // Handle bulk delete
            console.log('Delete selected rows:', selectedRows);
          }
          break;
          
        // Copy/Paste shortcuts
        case 'c':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            copy([{ start: keyboardNavigation.focusedCell }]);
          }
          break;
          
        case 'x':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            cut([{ start: keyboardNavigation.focusedCell }]);
          }
          break;
          
        case 'v':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            paste(keyboardNavigation.focusedCell);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    keyboardNavigation.focusedCell,
    editingCell,
    leads,
    columns,
    selectedRows,
    copy,
    cut,
    paste,
    handleCellDoubleClick
  ]);
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu?.isOpen) {
        setContextMenu(undefined);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);
  
  // Render cell with editor if editing
  const renderCell = useCallback((props: any) => {
    if (editingCell && 
        editingCell.rowId === props.lead.id && 
        editingCell.columnId === props.column.id) {
      return (
        <CellEditor
          value={props.value}
          column={props.column}
          lead={props.lead}
          onChange={(value) => {
            // Live preview changes could go here
          }}
          onComplete={() => handleCellEditComplete(props.value)}
          onCancel={() => setEditingCell(undefined)}
          isValid={!validateCellValue(props.value, props.column)}
        />
      );
    }
    
    return null; // Use default renderer
  }, [editingCell, handleCellEditComplete]);
  
  const visibleColumns = columns.filter(col => !col.hidden);
  const activeFilterCount = filters.activeFilters.length + (filters.searchTerm ? 1 : 0);
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-white",
      isFullscreen && "fixed inset-4 z-50 shadow-2xl rounded-lg"
    )}>
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Lead Spreadsheet
            </h2>
            <p className="text-sm text-gray-600">
              {totalCount.toLocaleString()} leads • {visibleColumns.length} columns
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-purple-100 text-purple-700">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </Badge>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowImportPicker(!showImportPicker)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={activeFilterCount > 0 ? "bg-purple-50 text-purple-700" : ""}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {activeFilterCount > 0 && (
              <Badge className="ml-1 bg-purple-600 text-white text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowColumnManager(!showColumnManager)}
          >
            <Columns3 className="h-4 w-4 mr-2" />
            Columns
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportToCSV(leads, visibleColumns)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Side Panels */}
        <div className="flex">
          {showImportPicker && (
            <Card className="w-80 m-2 overflow-y-auto">
              <CardContent className="p-4">
                <LeadsImportPicker
                  onImportSelected={setSelectedImportId}
                  selectedImportId={selectedImportId}
                  organizationId={organizationId}
                />
              </CardContent>
            </Card>
          )}
          
          {showFilterPanel && (
            <Card className="w-80 m-2 overflow-y-auto">
              <CardContent className="p-4">
                <FilterPanel
                  columns={columns}
                  filterConfig={filters}
                  onFilterChange={setFilters}
                  quickFilters={[]}
                  onQuickFilterToggle={() => {}}
                />
              </CardContent>
            </Card>
          )}
          
          {showColumnManager && (
            <Card className="w-96 m-2 overflow-y-auto">
              <CardContent className="p-4">
                <ColumnManager
                  columns={columns}
                  onColumnsChange={setColumns}
                  onViewSave={(view) => {
                    console.log('Save view:', view);
                  }}
                  availableViews={[]}
                />
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Main Spreadsheet */}
        <div className="flex-1 p-2">
          <VirtualScrollTable
            leads={leads}
            columns={visibleColumns}
            height={containerHeight}
            width={containerWidth}
            rowHeight={rowHeight}
            selectedRows={selectedRows}
            selectedCells={selectedCells}
            editingCell={editingCell}
            contextMenu={contextMenu}
            onRowSelect={handleRowSelect}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
            onCellRightClick={handleCellRightClick}
            onColumnHeaderClick={handleColumnHeaderClick}
            onColumnHeaderRightClick={(columnId, event) => {
              // Column header context menu
              console.log('Column context menu:', columnId);
            }}
            onColumnResize={handleColumnResize}
            renderCell={renderCell}
            overscan={10}
          />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>{leads.length} of {totalCount} leads</span>
          {selectedRows.size > 0 && (
            <Badge className="bg-purple-100 text-purple-700">
              {selectedRows.size} selected
            </Badge>
          )}
          {copiedData && (
            <Badge className="bg-blue-100 text-blue-700">
              {copiedData.cells.length} cell{copiedData.cells.length > 1 ? 's' : ''} copied
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {error && (
            <span className="text-red-600">
              Error: {error.message}
            </span>
          )}
          {isLoading && (
            <span className="flex items-center">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Loading...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClayStyleSpreadsheet;