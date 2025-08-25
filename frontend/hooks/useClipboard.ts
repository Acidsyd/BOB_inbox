'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  Lead, 
  ColumnDefinition, 
  CellSelection, 
  CopiedCellData,
  CellPosition 
} from '@/types/spreadsheet';
import { getCellValue, formatCellValue, setCellValue } from '@/lib/spreadsheetUtils';

interface UseClipboardProps {
  leads: Lead[];
  columns: ColumnDefinition[];
  onLeadsUpdate: (leads: Lead[]) => void;
}

interface UseClipboardReturn {
  // Clipboard state
  copiedData: CopiedCellData | null;
  canPaste: boolean;
  
  // Actions
  copy: (selection: CellSelection[]) => Promise<boolean>;
  paste: (targetPosition: CellPosition) => Promise<boolean>;
  cut: (selection: CellSelection[]) => Promise<boolean>;
  clear: () => void;
  
  // Utilities
  copyAsText: (selection: CellSelection[]) => Promise<boolean>;
  copyAsCSV: (selection: CellSelection[]) => Promise<boolean>;
  pasteFromClipboard: (targetPosition: CellPosition) => Promise<boolean>;
}

export const useClipboard = ({
  leads,
  columns,
  onLeadsUpdate
}: UseClipboardProps): UseClipboardReturn => {
  const [copiedData, setCopiedData] = useState<CopiedCellData | null>(null);
  const clipboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if we can paste
  const canPaste = copiedData !== null;
  
  // Get lead by ID
  const getLeadById = useCallback((leadId: string): Lead | undefined => {
    return leads.find(lead => lead.id === leadId);
  }, [leads]);
  
  // Get column by ID
  const getColumnById = useCallback((columnId: string): ColumnDefinition | undefined => {
    return columns.find(col => col.id === columnId);
  }, [columns]);
  
  // Get cell data for a specific position
  const getCellData = useCallback((position: CellPosition) => {
    const lead = getLeadById(position.rowId);
    const column = getColumnById(position.columnId);
    
    if (!lead || !column) return null;
    
    const value = getCellValue(lead, column);
    const formattedValue = formatCellValue(value, column);
    
    return { value, formattedValue, lead, column };
  }, [getLeadById, getColumnById]);
  
  // Convert selection to range
  const selectionToRange = useCallback((selection: CellSelection[]): {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
    cells: Array<{ position: CellPosition; value: any; formattedValue: string }>;
  } | null => {
    if (selection.length === 0) return null;
    
    // For single cell selection
    if (selection.length === 1 && !selection[0].end) {
      const cellData = getCellData(selection[0].start);
      if (!cellData) return null;
      
      const startRowIndex = leads.findIndex(lead => lead.id === selection[0].start.rowId);
      const startColIndex = columns.findIndex(col => col.id === selection[0].start.columnId);
      
      return {
        startRow: startRowIndex,
        endRow: startRowIndex,
        startCol: startColIndex,
        endCol: startColIndex,
        cells: [{
          position: selection[0].start,
          value: cellData.value,
          formattedValue: cellData.formattedValue
        }]
      };
    }
    
    // For range selection (simplified - assumes rectangular selection)
    const firstSelection = selection[0];
    if (!firstSelection.end) return null;
    
    const startRowIndex = leads.findIndex(lead => lead.id === firstSelection.start.rowId);
    const endRowIndex = leads.findIndex(lead => lead.id === firstSelection.end.rowId);
    const startColIndex = columns.findIndex(col => col.id === firstSelection.start.columnId);
    const endColIndex = columns.findIndex(col => col.id === firstSelection.end.columnId);
    
    const minRow = Math.min(startRowIndex, endRowIndex);
    const maxRow = Math.max(startRowIndex, endRowIndex);
    const minCol = Math.min(startColIndex, endColIndex);
    const maxCol = Math.max(startColIndex, endColIndex);
    
    const cells: Array<{ position: CellPosition; value: any; formattedValue: string }> = [];
    
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const lead = leads[row];
        const column = columns[col];
        
        if (lead && column && !column.hidden) {
          const position: CellPosition = {
            rowId: lead.id,
            columnId: column.id
          };
          
          const value = getCellValue(lead, column);
          const formattedValue = formatCellValue(value, column);
          
          cells.push({ position, value, formattedValue });
        }
      }
    }
    
    return {
      startRow: minRow,
      endRow: maxRow,
      startCol: minCol,
      endCol: maxCol,
      cells
    };
  }, [leads, columns, getCellData]);
  
  // Copy selection to internal clipboard
  const copy = useCallback(async (selection: CellSelection[]): Promise<boolean> => {
    try {
      const range = selectionToRange(selection);
      if (!range) return false;
      
      const copiedCellData: CopiedCellData = {
        cells: range.cells,
        range: {
          startRow: range.startRow,
          endRow: range.endRow,
          startCol: range.startCol,
          endCol: range.endCol
        }
      };
      
      setCopiedData(copiedCellData);
      
      // Also copy to system clipboard as tab-separated values
      await copyAsText(selection);
      
      // Clear clipboard after 5 minutes for security
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }
      
      clipboardTimeoutRef.current = setTimeout(() => {
        setCopiedData(null);
      }, 300000); // 5 minutes
      
      return true;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }, [selectionToRange]);
  
  // Copy as plain text (TSV format)
  const copyAsText = useCallback(async (selection: CellSelection[]): Promise<boolean> => {
    try {
      const range = selectionToRange(selection);
      if (!range) return false;
      
      // Create 2D array of values
      const rows: string[][] = [];
      const { startRow, endRow, startCol, endCol } = range.range;
      
      for (let row = startRow; row <= endRow; row++) {
        const rowData: string[] = [];
        for (let col = startCol; col <= endCol; col++) {
          const cell = range.cells.find(c => {
            const cellRowIndex = leads.findIndex(l => l.id === c.position.rowId);
            const cellColIndex = columns.findIndex(c2 => c2.id === c.position.columnId);
            return cellRowIndex === row && cellColIndex === col;
          });
          
          rowData.push(cell ? cell.formattedValue : '');
        }
        rows.push(rowData);
      }
      
      // Convert to TSV
      const tsvContent = rows.map(row => row.join('\t')).join('\n');
      
      // Copy to system clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsvContent);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = tsvContent;
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Copy as text failed:', error);
      return false;
    }
  }, [selectionToRange, leads, columns]);
  
  // Copy as CSV format
  const copyAsCSV = useCallback(async (selection: CellSelection[]): Promise<boolean> => {
    try {
      const range = selectionToRange(selection);
      if (!range) return false;
      
      // Create 2D array of values
      const rows: string[][] = [];
      const { startRow, endRow, startCol, endCol } = range.range;
      
      for (let row = startRow; row <= endRow; row++) {
        const rowData: string[] = [];
        for (let col = startCol; col <= endCol; col++) {
          const cell = range.cells.find(c => {
            const cellRowIndex = leads.findIndex(l => l.id === c.position.rowId);
            const cellColIndex = columns.findIndex(c2 => c2.id === c.position.columnId);
            return cellRowIndex === row && cellColIndex === col;
          });
          
          // Escape CSV values
          let value = cell ? cell.formattedValue : '';
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          rowData.push(value);
        }
        rows.push(rowData);
      }
      
      // Convert to CSV
      const csvContent = rows.map(row => row.join(',')).join('\n');
      
      // Copy to system clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(csvContent);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Copy as CSV failed:', error);
      return false;
    }
  }, [selectionToRange, leads, columns]);
  
  // Paste data at target position
  const paste = useCallback(async (targetPosition: CellPosition): Promise<boolean> => {
    if (!copiedData) return false;
    
    try {
      const targetRowIndex = leads.findIndex(lead => lead.id === targetPosition.rowId);
      const targetColIndex = columns.findIndex(col => col.id === targetPosition.columnId);
      
      if (targetRowIndex === -1 || targetColIndex === -1) return false;
      
      const updatedLeads = [...leads];
      const { cells, range } = copiedData;
      
      // Calculate paste range
      const pasteHeight = range.endRow - range.startRow + 1;
      const pasteWidth = range.endCol - range.startCol + 1;
      
      for (let rowOffset = 0; rowOffset < pasteHeight; rowOffset++) {
        for (let colOffset = 0; colOffset < pasteWidth; colOffset++) {
          const targetRowIdx = targetRowIndex + rowOffset;
          const targetColIdx = targetColIndex + colOffset;
          
          // Check bounds
          if (targetRowIdx >= leads.length || targetColIdx >= columns.length) continue;
          
          const targetLead = updatedLeads[targetRowIdx];
          const targetColumn = columns[targetColIdx];
          
          if (!targetColumn.editable || targetColumn.hidden) continue;
          
          // Find corresponding source cell
          const sourceCell = cells.find(cell => {
            const sourceCellRowIdx = range.startRow + rowOffset;
            const sourceCellColIdx = range.startCol + colOffset;
            
            const cellRowIndex = leads.findIndex(l => l.id === cell.position.rowId);
            const cellColIndex = columns.findIndex(c => c.id === cell.position.columnId);
            
            return cellRowIndex === sourceCellRowIdx && cellColIndex === sourceCellColIdx;
          });
          
          if (sourceCell) {
            // Validate the value for the target column
            const sourceColumn = getColumnById(sourceCell.position.columnId);
            let valueToSet = sourceCell.value;
            
            // Type conversion if necessary
            if (sourceColumn && sourceColumn.type !== targetColumn.type) {
              valueToSet = convertValueForColumn(sourceCell.value, targetColumn);
            }
            
            // Update the lead
            updatedLeads[targetRowIdx] = setCellValue(targetLead, targetColumn, valueToSet);
          }
        }
      }
      
      onLeadsUpdate(updatedLeads);
      return true;
    } catch (error) {
      console.error('Paste failed:', error);
      return false;
    }
  }, [copiedData, leads, columns, onLeadsUpdate, getColumnById]);
  
  // Paste from system clipboard
  const pasteFromClipboard = useCallback(async (targetPosition: CellPosition): Promise<boolean> => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        return false;
      }
      
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return false;
      
      // Parse clipboard data (assuming TSV format)
      const rows = clipboardText.split('\n').map(row => row.split('\t'));
      
      const targetRowIndex = leads.findIndex(lead => lead.id === targetPosition.rowId);
      const targetColIndex = columns.findIndex(col => col.id === targetPosition.columnId);
      
      if (targetRowIndex === -1 || targetColIndex === -1) return false;
      
      const updatedLeads = [...leads];
      
      for (let rowOffset = 0; rowOffset < rows.length; rowOffset++) {
        const row = rows[rowOffset];
        
        for (let colOffset = 0; colOffset < row.length; colOffset++) {
          const targetRowIdx = targetRowIndex + rowOffset;
          const targetColIdx = targetColIndex + colOffset;
          
          // Check bounds
          if (targetRowIdx >= leads.length || targetColIdx >= columns.length) continue;
          
          const targetLead = updatedLeads[targetRowIdx];
          const targetColumn = columns[targetColIdx];
          
          if (!targetColumn.editable || targetColumn.hidden) continue;
          
          const rawValue = row[colOffset];
          const convertedValue = convertValueForColumn(rawValue, targetColumn);
          
          // Update the lead
          updatedLeads[targetRowIdx] = setCellValue(targetLead, targetColumn, convertedValue);
        }
      }
      
      onLeadsUpdate(updatedLeads);
      return true;
    } catch (error) {
      console.error('Paste from clipboard failed:', error);
      return false;
    }
  }, [leads, columns, onLeadsUpdate]);
  
  // Cut (copy + clear original cells)
  const cut = useCallback(async (selection: CellSelection[]): Promise<boolean> => {
    try {
      const copySuccess = await copy(selection);
      if (!copySuccess) return false;
      
      // Clear original cells
      const range = selectionToRange(selection);
      if (!range) return false;
      
      const updatedLeads = [...leads];
      
      for (const cell of range.cells) {
        const leadIndex = leads.findIndex(lead => lead.id === cell.position.rowId);
        const column = getColumnById(cell.position.columnId);
        
        if (leadIndex >= 0 && column && column.editable) {
          updatedLeads[leadIndex] = setCellValue(updatedLeads[leadIndex], column, null);
        }
      }
      
      onLeadsUpdate(updatedLeads);
      return true;
    } catch (error) {
      console.error('Cut failed:', error);
      return false;
    }
  }, [copy, selectionToRange, leads, getColumnById, onLeadsUpdate]);
  
  // Clear clipboard
  const clear = useCallback(() => {
    setCopiedData(null);
    if (clipboardTimeoutRef.current) {
      clearTimeout(clipboardTimeoutRef.current);
      clipboardTimeoutRef.current = null;
    }
  }, []);
  
  // Convert value for target column type
  const convertValueForColumn = useCallback((value: any, targetColumn: ColumnDefinition): any => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    switch (targetColumn.type) {
      case 'number':
        const num = parseFloat(String(value));
        return isNaN(num) ? null : num;
      
      case 'boolean':
        if (typeof value === 'boolean') return value;
        const strValue = String(value).toLowerCase();
        return strValue === 'true' || strValue === '1' || strValue === 'yes';
      
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      
      case 'select':
        // Check if value exists in select options
        const option = targetColumn.selectOptions?.find(opt => 
          opt.value === value || opt.label === value
        );
        return option ? option.value : null;
      
      case 'tags':
        if (Array.isArray(value)) return value;
        return String(value).split(',').map(tag => tag.trim()).filter(Boolean);
      
      default:
        return String(value);
    }
  }, []);
  
  return {
    // Clipboard state
    copiedData,
    canPaste,
    
    // Actions
    copy,
    paste,
    cut,
    clear,
    
    // Utilities
    copyAsText,
    copyAsCSV,
    pasteFromClipboard
  };
};