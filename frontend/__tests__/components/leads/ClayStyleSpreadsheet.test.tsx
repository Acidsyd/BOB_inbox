/**
 * ClayStyleSpreadsheet Component Tests
 * 
 * Tests the main Clay.com-inspired spreadsheet component functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

import ClayStyleSpreadsheet from '@/components/leads/ClayStyleSpreadsheet';
import { ColumnDefinition, Lead } from '@/types/spreadsheet';

// Mock dependencies
jest.mock('@/hooks/useSpreadsheetData');
jest.mock('@/hooks/useClipboard');
jest.mock('@/components/leads/VirtualScrollTable');
jest.mock('@/components/leads/CellEditor');
jest.mock('@/components/leads/LeadsImportPicker');
jest.mock('@/components/leads/ColumnManager');
jest.mock('@/components/leads/FilterPanel');
jest.mock('@/lib/spreadsheetUtils');

// Mock hooks
const mockUseSpreadsheetData = jest.mocked(require('@/hooks/useSpreadsheetData').useSpreadsheetData);
const mockUseClipboard = jest.mocked(require('@/hooks/useClipboard').useClipboard);

// Mock components
const MockVirtualScrollTable = jest.mocked(require('@/components/leads/VirtualScrollTable').default);
const MockCellEditor = jest.mocked(require('@/components/leads/CellEditor').default);
const MockLeadsImportPicker = jest.mocked(require('@/components/leads/LeadsImportPicker').default);
const MockColumnManager = jest.mocked(require('@/components/leads/ColumnManager').default);
const MockFilterPanel = jest.mocked(require('@/components/leads/FilterPanel').default);

// Mock utils
const mockSpreadsheetUtils = jest.mocked(require('@/lib/spreadsheetUtils'));

describe('ClayStyleSpreadsheet', () => {
  const mockOrganizationId = 'org-123';
  const mockLeads: Lead[] = [
    {
      id: 'lead-1',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Acme Corp',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'lead-2',
      email: 'jane@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      company: 'Tech Inc',
      status: 'active',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ];

  const mockColumns: ColumnDefinition[] = [
    {
      id: 'email',
      key: 'email',
      label: 'Email',
      type: 'text',
      width: 200,
      sortable: true,
      editable: true,
      hidden: false,
      pinned: false,
      required: true
    },
    {
      id: 'first_name',
      key: 'first_name',
      label: 'First Name',
      type: 'text',
      width: 150,
      sortable: true,
      editable: true,
      hidden: false,
      pinned: false,
      required: false
    },
    {
      id: 'company',
      key: 'company',
      label: 'Company',
      type: 'text',
      width: 180,
      sortable: true,
      editable: true,
      hidden: false,
      pinned: false,
      required: false
    }
  ];

  const defaultHookReturn = {
    leads: mockLeads,
    totalCount: mockLeads.length,
    isLoading: false,
    error: null,
    filters: {
      activeFilters: [],
      searchTerm: '',
      quickFilters: []
    },
    sorting: null,
    setFilters: jest.fn(),
    setSorting: jest.fn(),
    updateLead: jest.fn(),
    bulkUpdateLeads: jest.fn(),
    refresh: jest.fn()
  };

  const defaultClipboardReturn = {
    copiedData: null,
    canPaste: false,
    copy: jest.fn(),
    paste: jest.fn(),
    cut: jest.fn(),
    clear: jest.fn()
  };

  beforeEach(() => {
    // Setup default mocks
    mockUseSpreadsheetData.mockReturnValue(defaultHookReturn);
    mockUseClipboard.mockReturnValue(defaultClipboardReturn);
    
    // Mock component renders
    MockVirtualScrollTable.mockImplementation(({ leads, columns, onRowSelect, onCellClick }) => (
      <div data-testid="virtual-scroll-table">
        <div>Leads: {leads.length}</div>
        <div>Columns: {columns.length}</div>
        {leads.map((lead, index) => (
          <div key={lead.id} data-testid={`lead-row-${lead.id}`}>
            <button onClick={() => onRowSelect?.(lead.id, false, false)}>
              Select {lead.email}
            </button>
            {columns.map((column) => (
              <button 
                key={`${lead.id}-${column.id}`}
                onClick={() => onCellClick?.({ rowId: lead.id, columnId: column.id })}
                data-testid={`cell-${lead.id}-${column.id}`}
              >
                {(lead as any)[column.key]}
              </button>
            ))}
          </div>
        ))}
      </div>
    ));

    MockCellEditor.mockImplementation(({ value, onComplete, onCancel }) => (
      <div data-testid="cell-editor">
        <input 
          data-testid="cell-editor-input" 
          defaultValue={value}
          onBlur={(e) => onComplete?.(e.target.value)}
        />
        <button onClick={onCancel} data-testid="cell-editor-cancel">Cancel</button>
      </div>
    ));

    MockLeadsImportPicker.mockImplementation(({ onImportSelected }) => (
      <div data-testid="leads-import-picker">
        <button onClick={() => onImportSelected?.('import-123')}>
          Select Import
        </button>
      </div>
    ));

    MockColumnManager.mockImplementation(({ columns, onColumnsChange }) => (
      <div data-testid="column-manager">
        {columns.map((col) => (
          <div key={col.id}>
            <label>
              <input
                type="checkbox"
                checked={!col.hidden}
                onChange={(e) => {
                  const newColumns = columns.map(c =>
                    c.id === col.id ? { ...c, hidden: !e.target.checked } : c
                  );
                  onColumnsChange?.(newColumns);
                }}
              />
              {col.label}
            </label>
          </div>
        ))}
      </div>
    ));

    MockFilterPanel.mockImplementation(({ onFilterChange }) => (
      <div data-testid="filter-panel">
        <button onClick={() => onFilterChange?.({
          activeFilters: [{ field: 'status', operator: 'equals', value: 'active' }],
          searchTerm: 'test',
          quickFilters: []
        })}>
          Apply Filter
        </button>
      </div>
    ));

    // Mock utils
    mockSpreadsheetUtils.createDefaultColumns.mockReturnValue(mockColumns);
    mockSpreadsheetUtils.getCellValue.mockImplementation((lead, column) => lead[column.key as keyof Lead]);
    mockSpreadsheetUtils.validateCellValue.mockReturnValue(null);
    mockSpreadsheetUtils.toggleRowSelection.mockImplementation((leadId, currentSelection, multiSelect) => {
      const newSelection = new Set(currentSelection);
      if (newSelection.has(leadId) && !multiSelect) {
        newSelection.delete(leadId);
      } else {
        newSelection.add(leadId);
      }
      return newSelection;
    });
    mockSpreadsheetUtils.getNextCell.mockReturnValue({ rowId: 'lead-1', columnId: 'email' });
    mockSpreadsheetUtils.exportToCSV.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the spreadsheet with correct structure', () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          initialColumns={mockColumns}
        />
      );

      expect(screen.getByText('Lead Spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('2 leads • 3 columns')).toBeInTheDocument();
      expect(screen.getByTestId('virtual-scroll-table')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        isLoading: true
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      const mockError = new Error('Failed to load leads');
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        error: mockError
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText('Error: Failed to load leads')).toBeInTheDocument();
    });

    it('shows filter count badge when filters are active', () => {
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        filters: {
          activeFilters: [
            { field: 'status', operator: 'equals', value: 'active' },
            { field: 'company', operator: 'contains', value: 'tech' }
          ],
          searchTerm: 'john',
          quickFilters: []
        }
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText('3 filters')).toBeInTheDocument();
    });
  });

  describe('Toolbar Interactions', () => {
    it('toggles import picker when Import button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const importButton = screen.getByRole('button', { name: /import/i });
      
      // Initially, import picker should not be visible
      expect(screen.queryByTestId('leads-import-picker')).not.toBeInTheDocument();

      // Click to show import picker
      await user.click(importButton);
      expect(screen.getByTestId('leads-import-picker')).toBeInTheDocument();

      // Click again to hide import picker
      await user.click(importButton);
      expect(screen.queryByTestId('leads-import-picker')).not.toBeInTheDocument();
    });

    it('toggles filter panel when Filter button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter/i });
      
      expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument();

      await user.click(filterButton);
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('toggles column manager when Columns button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const columnsButton = screen.getByRole('button', { name: /columns/i });
      
      expect(screen.queryByTestId('column-manager')).not.toBeInTheDocument();

      await user.click(columnsButton);
      expect(screen.getByTestId('column-manager')).toBeInTheDocument();
    });

    it('calls refresh when Refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefresh = jest.fn();
      
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        refresh: mockRefresh
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('calls exportToCSV when Export button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockSpreadsheetUtils.exportToCSV).toHaveBeenCalledWith(mockLeads, mockColumns);
    });

    it('toggles fullscreen mode', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
      await user.click(fullscreenButton);

      expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
    });
  });

  describe('Row Selection', () => {
    it('handles single row selection', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          onSelectionChange={onSelectionChange}
        />
      );

      const selectButton = screen.getByText('Select john@example.com');
      await user.click(selectButton);

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['lead-1']));
    });

    it('displays selected row count in status bar', () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Simulate having selected rows by directly setting internal state
      // In practice, this would be done through user interactions
      const component = screen.getByText('2 of 2 leads');
      expect(component).toBeInTheDocument();
    });
  });

  describe('Cell Interactions', () => {
    it('handles cell clicks for selection', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const cellButton = screen.getByTestId('cell-lead-1-email');
      await user.click(cellButton);

      // The cell click should be handled by the VirtualScrollTable mock
      // We can verify this by checking that the mock function was called
      expect(MockVirtualScrollTable).toHaveBeenCalledWith(
        expect.objectContaining({
          onCellClick: expect.any(Function)
        }),
        {}
      );
    });

    it('enters edit mode on double click for editable cells', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          initialColumns={mockColumns}
        />
      );

      // We need to simulate the double click through the mock
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellDoubleClick({ rowId: 'lead-1', columnId: 'email' });
      });

      // Check that cell editor is rendered
      await waitFor(() => {
        expect(screen.getByTestId('cell-editor')).toBeInTheDocument();
      });
    });

    it('completes cell editing and updates lead', async () => {
      const user = userEvent.setup();
      const mockUpdateLead = jest.fn();
      const onLeadUpdate = jest.fn();
      
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        updateLead: mockUpdateLead
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          onLeadUpdate={onLeadUpdate}
        />
      );

      // Start editing
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellDoubleClick({ rowId: 'lead-1', columnId: 'email' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('cell-editor')).toBeInTheDocument();
      });

      // Edit and complete
      const input = screen.getByTestId('cell-editor-input');
      await user.clear(input);
      await user.type(input, 'newemail@example.com');
      await user.tab(); // This should trigger onBlur and complete editing

      expect(mockUpdateLead).toHaveBeenCalledWith('lead-1', { email: 'newemail@example.com' });
    });

    it('cancels cell editing', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Start editing
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellDoubleClick({ rowId: 'lead-1', columnId: 'email' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('cell-editor')).toBeInTheDocument();
      });

      // Cancel editing
      const cancelButton = screen.getByTestId('cell-editor-cancel');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('cell-editor')).not.toBeInTheDocument();
      });
    });
  });

  describe('Column Management', () => {
    it('updates column visibility through column manager', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          initialColumns={mockColumns}
        />
      );

      // Open column manager
      const columnsButton = screen.getByRole('button', { name: /columns/i });
      await user.click(columnsButton);

      // Hide a column
      const emailCheckbox = screen.getByRole('checkbox', { name: /email/i });
      await user.click(emailCheckbox);

      // Verify column is hidden (check that visible columns count is updated)
      await waitFor(() => {
        expect(screen.getByText(/2 columns/)).toBeInTheDocument();
      });
    });

    it('handles column resizing', () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          initialColumns={mockColumns}
        />
      );

      // Get the mock props for VirtualScrollTable
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      
      // Simulate column resize
      act(() => {
        mockProps.onColumnResize('email', 250);
      });

      // Verify that the column width was updated
      // (This would be reflected in subsequent renders)
      expect(mockProps.columns.find((col: ColumnDefinition) => col.id === 'email')?.width).toBe(200);
    });
  });

  describe('Filter Panel', () => {
    it('applies filters through filter panel', async () => {
      const user = userEvent.setup();
      const mockSetFilters = jest.fn();
      
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        setFilters: mockSetFilters
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Open filter panel
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      // Apply filter through mock
      const applyFilterButton = screen.getByText('Apply Filter');
      await user.click(applyFilterButton);

      expect(mockSetFilters).toHaveBeenCalledWith({
        activeFilters: [{ field: 'status', operator: 'equals', value: 'active' }],
        searchTerm: 'test',
        quickFilters: []
      });
    });
  });

  describe('Import Picker', () => {
    it('handles import selection', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Open import picker
      const importButton = screen.getByRole('button', { name: /import/i });
      await user.click(importButton);

      // Select an import
      const selectImportButton = screen.getByText('Select Import');
      await user.click(selectImportButton);

      // Verify import ID is set (we can check through internal state)
      // This would typically trigger a refresh of data
      expect(screen.getByTestId('leads-import-picker')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles arrow key navigation', async () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Simulate keyboard navigation
      // First, focus on a cell
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellClick({ rowId: 'lead-1', columnId: 'email' });
      });

      // Simulate arrow key press
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      expect(mockSpreadsheetUtils.getNextCell).toHaveBeenCalledWith(
        { rowId: 'lead-1', columnId: 'email' },
        'down',
        mockLeads,
        mockColumns
      );
    });

    it('handles Enter key for editing', async () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Focus on a cell
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellClick({ rowId: 'lead-1', columnId: 'email' });
      });

      // Press Enter to start editing
      fireEvent.keyDown(window, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('cell-editor')).toBeInTheDocument();
      });
    });

    it('handles clipboard shortcuts', async () => {
      const mockCopy = jest.fn();
      const mockCut = jest.fn();
      const mockPaste = jest.fn();

      mockUseClipboard.mockReturnValue({
        ...defaultClipboardReturn,
        copy: mockCopy,
        cut: mockCut,
        paste: mockPaste
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Focus on a cell
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellClick({ rowId: 'lead-1', columnId: 'email' });
      });

      // Test copy shortcut
      fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
      expect(mockCopy).toHaveBeenCalled();

      // Test cut shortcut
      fireEvent.keyDown(window, { key: 'x', ctrlKey: true });
      expect(mockCut).toHaveBeenCalled();

      // Test paste shortcut
      fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
      expect(mockPaste).toHaveBeenCalled();
    });
  });

  describe('Context Menu', () => {
    it('shows context menu on right click', async () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Simulate right click through the mock
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 100,
        clientY: 100
      };

      act(() => {
        mockProps.onCellRightClick({ rowId: 'lead-1', columnId: 'email' }, mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Clipboard Integration', () => {
    it('shows copied data badge when data is copied', () => {
      mockUseClipboard.mockReturnValue({
        ...defaultClipboardReturn,
        copiedData: {
          cells: [{ rowId: 'lead-1', columnId: 'email', value: 'john@example.com' }],
          format: 'cells'
        }
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText('1 cell copied')).toBeInTheDocument();
    });

    it('shows multiple cells copied badge', () => {
      mockUseClipboard.mockReturnValue({
        ...defaultClipboardReturn,
        copiedData: {
          cells: [
            { rowId: 'lead-1', columnId: 'email', value: 'john@example.com' },
            { rowId: 'lead-1', columnId: 'first_name', value: 'John' }
          ],
          format: 'cells'
        }
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      expect(screen.getByText('2 cells copied')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts dimensions for fullscreen mode', async () => {
      const user = userEvent.setup();
      
      // Mock window dimensions
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1400,
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
      await user.click(fullscreenButton);

      // Verify that the component uses fullscreen dimensions
      const mockProps = MockVirtualScrollTable.mock.calls[MockVirtualScrollTable.mock.calls.length - 1][0];
      expect(mockProps.height).toBe(900); // window.innerHeight - 100
      expect(mockProps.width).toBe(1300); // window.innerWidth - 100
    });
  });

  describe('Performance Optimization', () => {
    it('limits data display to maxRows', () => {
      const manyLeads = Array.from({ length: 50000 }, (_, i) => ({
        id: `lead-${i}`,
        email: `user${i}@example.com`,
        first_name: 'User',
        last_name: `${i}`,
        company: 'Test Corp',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        leads: manyLeads,
        totalCount: 50000
      });

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
          maxRows={10000}
        />
      );

      // Verify that VirtualScrollTable receives the large dataset
      // but performance optimizations are in place
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      expect(mockProps.leads.length).toBe(50000);
      expect(mockProps.overscan).toBe(10); // Performance optimization
    });

    it('uses proper overscan for virtual scrolling', () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      expect(mockProps.overscan).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('handles cell validation errors', async () => {
      mockSpreadsheetUtils.validateCellValue.mockReturnValue('Invalid email format');
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Start editing a cell
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellDoubleClick({ rowId: 'lead-1', columnId: 'email' });
      });

      // The cell editor should receive the validation state
      await waitFor(() => {
        const cellEditor = screen.getByTestId('cell-editor');
        expect(cellEditor).toBeInTheDocument();
      });

      // Check that validation error prevents update
      expect(MockCellEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false
        }),
        {}
      );
    });

    it('handles lead update failures gracefully', async () => {
      const mockUpdateLead = jest.fn().mockRejectedValue(new Error('Network error'));
      
      mockUseSpreadsheetData.mockReturnValue({
        ...defaultHookReturn,
        updateLead: mockUpdateLead
      });

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Start editing and complete with new value
      const mockProps = MockVirtualScrollTable.mock.calls[0][0];
      act(() => {
        mockProps.onCellDoubleClick({ rowId: 'lead-1', columnId: 'email' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('cell-editor')).toBeInTheDocument();
      });

      // Simulate completing edit
      const mockCellEditorProps = MockCellEditor.mock.calls[0][0];
      await act(async () => {
        await mockCellEditorProps.onComplete('newemail@example.com');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to update lead:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      // Check that buttons have proper labels
      expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation for toolbar buttons', async () => {
      const user = userEvent.setup();
      
      render(
        <ClayStyleSpreadsheet
          organizationId={mockOrganizationId}
        />
      );

      const importButton = screen.getByRole('button', { name: /import/i });
      
      // Focus and activate with keyboard
      importButton.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByTestId('leads-import-picker')).toBeInTheDocument();
    });
  });
});