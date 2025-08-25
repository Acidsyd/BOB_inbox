'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { 
  Lead, 
  ColumnDefinition, 
  CellPosition,
  CellSelection,
  ContextMenuState,
  ContextMenuItem 
} from '@/types/spreadsheet';
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
import { getCellValue, formatCellValue, isRowSelected } from '@/lib/spreadsheetUtils';
import { cn } from '@/lib/utils';

interface VirtualScrollTableProps {
  leads: Lead[];
  columns: ColumnDefinition[];
  height: number;
  width: number;
  rowHeight: number;
  selectedRows: Set<string>;
  selectedCells: CellSelection[];
  editingCell?: CellPosition;
  contextMenu?: ContextMenuState;
  
  // Event handlers
  onRowSelect: (leadId: string, isMultiSelect: boolean, isRangeSelect: boolean) => void;
  onCellClick: (position: CellPosition) => void;
  onCellDoubleClick: (position: CellPosition) => void;
  onCellRightClick: (position: CellPosition, event: React.MouseEvent) => void;
  onColumnHeaderClick: (columnId: string) => void;
  onColumnHeaderRightClick: (columnId: string, event: React.MouseEvent) => void;
  onColumnResize: (columnId: string, newWidth: number) => void;
  
  // Cell rendering
  renderCell?: (props: {
    value: any;
    formattedValue: string;
    lead: Lead;
    column: ColumnDefinition;
    isSelected: boolean;
    isEditing: boolean;
    position: CellPosition;
  }) => React.ReactNode;
  
  // Performance options
  overscan?: number;
  enableHorizontalScrolling?: boolean;
}

const VirtualScrollTable = memo<VirtualScrollTableProps>(({
  leads,
  columns,
  height,
  width,
  rowHeight,
  selectedRows,
  selectedCells,
  editingCell,
  contextMenu,
  onRowSelect,
  onCellClick,
  onCellDoubleClick,
  onCellRightClick,
  onColumnHeaderClick,
  onColumnHeaderRightClick,
  onColumnResize,
  renderCell,
  overscan = 10,
  enableHorizontalScrolling = true
}) => {
  const headerHeight = 40;
  const effectiveHeight = height - headerHeight;
  
  // Virtual scrolling hook
  const {
    visibleItems,
    visibleColumns,
    onScroll,
    containerProps,
    topSpacer,
    bottomSpacer,
    leftSpacer,
    rightSpacer,
    scrollState
  } = useVirtualScrolling({
    itemCount: leads.length,
    itemHeight: rowHeight,
    containerHeight: effectiveHeight,
    containerWidth: width,
    columns,
    overscan,
    horizontal: enableHorizontalScrolling
  });
  
  const resizingColumn = useRef<{ columnId: string; startX: number; startWidth: number } | null>(null);
  
  // Handle column resize mouse down
  const handleResizeMouseDown = useCallback((
    columnId: string, 
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    
    const column = columns.find(col => col.id === columnId);
    if (!column || !column.resizable) return;
    
    resizingColumn.current = {
      columnId,
      startX: event.clientX,
      startWidth: column.width
    };
    
    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [columns]);
  
  // Handle column resize mouse move
  const handleResizeMouseMove = useCallback((event: MouseEvent) => {
    if (!resizingColumn.current) return;
    
    const { columnId, startX, startWidth } = resizingColumn.current;
    const deltaX = event.clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
    
    onColumnResize(columnId, newWidth);
  }, [onColumnResize]);
  
  // Handle column resize mouse up
  const handleResizeMouseUp = useCallback(() => {
    if (!resizingColumn.current) return;
    
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
    document.body.style.cursor = '';
  }, [handleResizeMouseMove]);
  
  // Cleanup resize listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMouseMove);
      document.removeEventListener('mouseup', handleResizeMouseUp);
      document.body.style.cursor = '';
    };
  }, [handleResizeMouseMove, handleResizeMouseUp]);
  
  // Check if cell is selected
  const isCellSelected = useCallback((position: CellPosition): boolean => {
    return selectedCells.some(selection => {
      if (!selection.end) {
        return selection.start.rowId === position.rowId && 
               selection.start.columnId === position.columnId;
      }
      
      // Range selection logic would go here
      return false;
    });
  }, [selectedCells]);
  
  // Check if cell is being edited
  const isCellEditing = useCallback((position: CellPosition): boolean => {
    return editingCell?.rowId === position.rowId && 
           editingCell?.columnId === position.columnId;
  }, [editingCell]);
  
  // Default cell renderer
  const defaultCellRenderer = useCallback((props: {
    value: any;
    formattedValue: string;
    lead: Lead;
    column: ColumnDefinition;
    isSelected: boolean;
    isEditing: boolean;
    position: CellPosition;
  }) => {
    const { formattedValue, column, isSelected, isEditing } = props;
    
    if (column.key === 'select') {
      return (
        <div className="flex items-center justify-center h-full">
          <input
            type="checkbox"
            checked={isRowSelected(props.lead.id, selectedRows)}
            onChange={() => {}}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </div>
      );
    }
    
    if (isEditing) {
      return (
        <div className="h-full bg-white border border-purple-500 shadow-sm">
          {/* Placeholder for editor - would be replaced by actual editor */}
          <input
            type="text"
            defaultValue={formattedValue}
            className="w-full h-full px-2 text-sm outline-none"
          />
        </div>
      );
    }
    
    return (
      <div 
        className={cn(
          "px-2 py-1 text-sm truncate h-full flex items-center",
          isSelected && "bg-purple-50 border-purple-200",
          "hover:bg-gray-50"
        )}
        title={formattedValue}
      >
        {formattedValue}
      </div>
    );
  }, [selectedRows]);
  
  // Calculate column positions for horizontal scrolling
  const getColumnLeft = useCallback((columnIndex: number): number => {
    let left = 0;
    for (let i = 0; i < columnIndex; i++) {
      if (!columns[i]?.hidden) {
        left += columns[i].width;
      }
    }
    return left;
  }, [columns]);
  
  // Render table header
  const renderHeader = useCallback(() => (
    <div 
      className="sticky top-0 z-20 bg-white border-b border-gray-200"
      style={{ height: headerHeight }}
    >
      <div className="flex" style={{ transform: `translateX(-${scrollState.scrollLeft}px)` }}>
        {leftSpacer > 0 && <div style={{ width: leftSpacer, flexShrink: 0 }} />}
        
        {visibleColumns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "relative flex items-center justify-between border-r border-gray-200 bg-gray-50 hover:bg-gray-100 select-none font-medium text-sm text-gray-900",
              column.pinned === 'left' && "sticky left-0 z-30 bg-gray-50",
              column.pinned === 'right' && "sticky right-0 z-30 bg-gray-50"
            )}
            style={{ 
              width: column.width, 
              minWidth: column.width,
              maxWidth: column.width,
              left: column.pinned === 'left' ? getColumnLeft(columns.indexOf(column)) : undefined,
              right: column.pinned === 'right' ? 0 : undefined
            }}
            onClick={() => onColumnHeaderClick(column.id)}
            onContextMenu={(e) => onColumnHeaderRightClick(column.id, e)}
          >
            <div className="px-3 py-2 truncate flex-1">
              {column.name}
            </div>
            
            {/* Sort indicator */}
            <div className="px-1">
              {/* Sort icons would go here */}
            </div>
            
            {/* Resize handle */}
            {column.resizable && (
              <div
                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-purple-300 active:bg-purple-400"
                onMouseDown={(e) => handleResizeMouseDown(column.id, e)}
              />
            )}
          </div>
        ))}
        
        {rightSpacer > 0 && <div style={{ width: rightSpacer, flexShrink: 0 }} />}
      </div>
    </div>
  ), [
    visibleColumns, 
    scrollState.scrollLeft, 
    leftSpacer, 
    rightSpacer, 
    columns,
    getColumnLeft,
    onColumnHeaderClick,
    onColumnHeaderRightClick,
    handleResizeMouseDown
  ]);
  
  // Render table rows
  const renderRows = useCallback(() => (
    <div style={{ height: effectiveHeight, overflow: 'auto' }} {...containerProps}>
      {/* Top spacer */}
      {topSpacer > 0 && <div style={{ height: topSpacer, flexShrink: 0 }} />}
      
      {/* Visible rows */}
      {visibleItems.map((rowIndex) => {
        const lead = leads[rowIndex];
        if (!lead) return null;
        
        const isSelected = isRowSelected(lead.id, selectedRows);
        
        return (
          <div
            key={lead.id}
            className={cn(
              "flex border-b border-gray-100 hover:bg-gray-50",
              isSelected && "bg-purple-50"
            )}
            style={{ 
              height: rowHeight,
              minHeight: rowHeight,
              transform: `translateX(-${scrollState.scrollLeft}px)`
            }}
            onClick={(e) => {
              const isMultiSelect = e.ctrlKey || e.metaKey;
              const isRangeSelect = e.shiftKey;
              onRowSelect(lead.id, isMultiSelect, isRangeSelect);
            }}
          >
            {leftSpacer > 0 && <div style={{ width: leftSpacer, flexShrink: 0 }} />}
            
            {visibleColumns.map((column) => {
              const position: CellPosition = { rowId: lead.id, columnId: column.id };
              const value = getCellValue(lead, column);
              const formattedValue = formatCellValue(value, column);
              const cellSelected = isCellSelected(position);
              const cellEditing = isCellEditing(position);
              
              return (
                <div
                  key={column.id}
                  className={cn(
                    "border-r border-gray-100 relative",
                    cellSelected && "ring-1 ring-purple-400",
                    column.pinned === 'left' && "sticky left-0 z-10 bg-white",
                    column.pinned === 'right' && "sticky right-0 z-10 bg-white"
                  )}
                  style={{ 
                    width: column.width,
                    minWidth: column.width,
                    maxWidth: column.width,
                    left: column.pinned === 'left' ? getColumnLeft(columns.indexOf(column)) : undefined,
                    right: column.pinned === 'right' ? 0 : undefined
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCellClick(position);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onCellDoubleClick(position);
                  }}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    onCellRightClick(position, e);
                  }}
                >
                  {renderCell ? renderCell({
                    value,
                    formattedValue,
                    lead,
                    column,
                    isSelected: cellSelected,
                    isEditing: cellEditing,
                    position
                  }) : defaultCellRenderer({
                    value,
                    formattedValue,
                    lead,
                    column,
                    isSelected: cellSelected,
                    isEditing: cellEditing,
                    position
                  })}
                </div>
              );
            })}
            
            {rightSpacer > 0 && <div style={{ width: rightSpacer, flexShrink: 0 }} />}
          </div>
        );
      })}
      
      {/* Bottom spacer */}
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer, flexShrink: 0 }} />}
    </div>
  ), [
    effectiveHeight,
    containerProps,
    topSpacer,
    bottomSpacer,
    leftSpacer,
    rightSpacer,
    visibleItems,
    visibleColumns,
    leads,
    selectedRows,
    rowHeight,
    scrollState.scrollLeft,
    columns,
    getColumnLeft,
    onRowSelect,
    onCellClick,
    onCellDoubleClick,
    onCellRightClick,
    isCellSelected,
    isCellEditing,
    renderCell,
    defaultCellRenderer
  ]);
  
  return (
    <div 
      className="relative bg-white border border-gray-200 rounded-lg shadow-sm"
      style={{ height, width }}
    >
      {/* Header */}
      {renderHeader()}
      
      {/* Body */}
      {renderRows()}
      
      {/* Context menu overlay */}
      {contextMenu?.isOpen && (
        <div 
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1"
          style={{
            left: contextMenu.position.x,
            top: contextMenu.position.y
          }}
        >
          {contextMenu.items.map((item, index) => (
            item.separator ? (
              <div key={index} className="border-t border-gray-100 my-1" />
            ) : (
              <button
                key={item.id}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={item.action}
                disabled={item.disabled}
              >
                {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="ml-2 text-xs text-gray-400">{item.shortcut}</span>
                )}
              </button>
            )
          ))}
        </div>
      )}
      
      {/* Loading overlay */}
      {leads.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading leads...</p>
          </div>
        </div>
      )}
      
      {/* No data state */}
      {leads.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-500 mb-6">Get started by importing your first lead list</p>
          </div>
        </div>
      )}
    </div>
  );
});

VirtualScrollTable.displayName = 'VirtualScrollTable';

export default VirtualScrollTable;