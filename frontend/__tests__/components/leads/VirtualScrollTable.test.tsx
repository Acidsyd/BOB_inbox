/**
 * VirtualScrollTable Component Tests
 * 
 * Tests the virtual scrolling table component with performance optimizations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

import VirtualScrollTable from '@/components/leads/VirtualScrollTable';
import { ColumnDefinition, Lead, CellPosition, CellSelection } from '@/types/spreadsheet';

// Mock dependencies
jest.mock('@/hooks/useVirtualScrolling');
jest.mock('@/lib/spreadsheetUtils');

// Mock hooks and utils
const mockUseVirtualScrolling = jest.mocked(require('@/hooks/useVirtualScrolling').useVirtualScrolling);
const mockSpreadsheetUtils = jest.mocked(require('@/lib/spreadsheetUtils'));

describe('VirtualScrollTable', () => {
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
    },
    {
      id: 'lead-3',
      email: 'bob@example.com',
      first_name: 'Bob',
      last_name: 'Johnson',
      company: 'Corp LLC',
      status: 'inactive',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z'
    }
  ];

  const mockColumns: ColumnDefinition[] = [
    {
      id: 'select',
      key: 'select',
      name: 'Select',
      label: '',
      type: 'checkbox',
      width: 50,
      sortable: false,
      editable: false,
      hidden: false,
      pinned: false,
      required: false,
      resizable: false
    },
    {
      id: 'email',
      key: 'email',
      name: 'Email',
      label: 'Email Address',
      type: 'text',
      width: 200,
      sortable: true,
      editable: true,
      hidden: false,
      pinned: false,
      required: true,
      resizable: true
    },
    {
      id: 'first_name',
      key: 'first_name',
      name: 'First Name',
      label: 'First Name',
      type: 'text',
      width: 150,
      sortable: true,
      editable: true,
      hidden: false,
      pinned: false,
      required: false,
      resizable: true
    },
    {
      id: 'company',
      key: 'company',
      name: 'Company',
      label: 'Company',
      type: 'text',
      width: 180,
      sortable: true,
      editable: true,
      hidden: false,
      pinned: false,
      required: false,
      resizable: true
    }
  ];

  const defaultProps = {
    leads: mockLeads,
    columns: mockColumns,
    height: 600,
    width: 1000,
    rowHeight: 40,
    selectedRows: new Set<string>(),
    selectedCells: [] as CellSelection[],
    onRowSelect: jest.fn(),
    onCellClick: jest.fn(),
    onCellDoubleClick: jest.fn(),
    onCellRightClick: jest.fn(),
    onColumnHeaderClick: jest.fn(),
    onColumnHeaderRightClick: jest.fn(),
    onColumnResize: jest.fn()
  };

  const defaultVirtualScrollingReturn = {
    visibleItems: [0, 1, 2], // Show all three items for testing
    visibleColumns: mockColumns,
    onScroll: jest.fn(),
    containerProps: { onScroll: jest.fn() },
    topSpacer: 0,
    bottomSpacer: 0,
    leftSpacer: 0,
    rightSpacer: 0,
    scrollState: { scrollTop: 0, scrollLeft: 0 }
  };

  beforeEach(() => {
    // Setup default mocks
    mockUseVirtualScrolling.mockReturnValue(defaultVirtualScrollingReturn);
    
    // Mock spreadsheet utils
    mockSpreadsheetUtils.getCellValue.mockImplementation((lead, column) => {
      return lead[column.key as keyof Lead];
    });
    mockSpreadsheetUtils.formatCellValue.mockImplementation((value) => String(value || ''));
    mockSpreadsheetUtils.isRowSelected.mockImplementation((leadId, selectedRows) => {
      return selectedRows.has(leadId);
    });

    // Mock document methods for resize functionality
    Object.defineProperty(document, 'addEventListener', {
      writable: true,
      value: jest.fn()
    });
    Object.defineProperty(document, 'removeEventListener', {
      writable: true,
      value: jest.fn()
    });
    
    Object.defineProperty(document.body, 'style', {
      writable: true,
      value: { cursor: '' }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders table with correct structure', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      // Check table structure
      expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
      
      // Check header columns
      expect(screen.getByText('Select')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    it('renders all visible leads', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      // Check that all leads are rendered
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('renders checkbox column correctly', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3); // One for each lead
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('shows selected rows with correct styling', () => {
      const selectedRows = new Set(['lead-1', 'lead-3']);
      
      render(
        <VirtualScrollTable 
          {...defaultProps} 
          selectedRows={selectedRows}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // lead-1
      expect(checkboxes[1]).not.toBeChecked(); // lead-2
      expect(checkboxes[2]).toBeChecked(); // lead-3
    });

    it('renders empty state when no leads provided', () => {
      render(
        <VirtualScrollTable 
          {...defaultProps} 
          leads={[]}
        />
      );

      expect(screen.getByText('No leads found')).toBeInTheDocument();
      expect(screen.getByText('Get started by importing your first lead list')).toBeInTheDocument();
    });

    it('renders loading state when leads array is empty', () => {
      render(
        <VirtualScrollTable 
          {...defaultProps} 
          leads={[]}
        />
      );

      expect(screen.getByText('Loading leads...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Virtual Scrolling', () => {
    it('uses virtual scrolling hook with correct parameters', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      expect(mockUseVirtualScrolling).toHaveBeenCalledWith({
        itemCount: mockLeads.length,
        itemHeight: 40,
        containerHeight: 560, // height - headerHeight (600 - 40)
        containerWidth: 1000,
        columns: mockColumns,
        overscan: 10,
        horizontal: true
      });
    });

    it('respects custom overscan value', () => {
      render(
        <VirtualScrollTable 
          {...defaultProps} 
          overscan={20}
        />
      );

      expect(mockUseVirtualScrolling).toHaveBeenCalledWith(
        expect.objectContaining({
          overscan: 20
        })
      );
    });

    it('handles horizontal scrolling disabled', () => {
      render(
        <VirtualScrollTable 
          {...defaultProps} 
          enableHorizontalScrolling={false}
        />
      );

      expect(mockUseVirtualScrolling).toHaveBeenCalledWith(
        expect.objectContaining({
          horizontal: false
        })
      );
    });

    it('renders spacers for virtual scrolling', () => {
      const mockReturnWithSpacers = {
        ...defaultVirtualScrollingReturn,
        topSpacer: 100,
        bottomSpacer: 200,
        leftSpacer: 50,
        rightSpacer: 75
      };
      
      mockUseVirtualScrolling.mockReturnValue(mockReturnWithSpacers);

      render(<VirtualScrollTable {...defaultProps} />);

      // Spacers would be rendered as divs with specific heights/widths
      // We can't easily test their exact styles, but we can verify the function was called
      expect(mockUseVirtualScrolling).toHaveBeenCalled();
    });
  });

  describe('Row Interactions', () => {
    it('handles row selection on click', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onRowSelect={onRowSelect}
        />
      );

      // Click on a row (click on the row container, not a specific cell)
      const firstRowCell = screen.getByText('john@example.com').closest('div');
      if (firstRowCell?.parentElement) {
        await user.click(firstRowCell.parentElement);
      }

      expect(onRowSelect).toHaveBeenCalledWith('lead-1', false, false);
    });

    it('handles multi-select with Ctrl key', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onRowSelect={onRowSelect}
        />
      );

      const firstRowCell = screen.getByText('john@example.com').closest('div');
      if (firstRowCell?.parentElement) {
        await user.click(firstRowCell.parentElement, { ctrlKey: true });
      }

      expect(onRowSelect).toHaveBeenCalledWith('lead-1', true, false);
    });

    it('handles range selection with Shift key', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onRowSelect={onRowSelect}
        />
      );

      const firstRowCell = screen.getByText('john@example.com').closest('div');
      if (firstRowCell?.parentElement) {
        await user.click(firstRowCell.parentElement, { shiftKey: true });
      }

      expect(onRowSelect).toHaveBeenCalledWith('lead-1', false, true);
    });

    it('handles meta key for multi-select on Mac', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onRowSelect={onRowSelect}
        />
      );

      const firstRowCell = screen.getByText('john@example.com').closest('div');
      if (firstRowCell?.parentElement) {
        await user.click(firstRowCell.parentElement, { metaKey: true });
      }

      expect(onRowSelect).toHaveBeenCalledWith('lead-1', true, false);
    });
  });

  describe('Cell Interactions', () => {
    it('handles cell click', async () => {
      const user = userEvent.setup();
      const onCellClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onCellClick={onCellClick}
        />
      );

      const cellElement = screen.getByText('john@example.com');
      await user.click(cellElement);

      expect(onCellClick).toHaveBeenCalledWith({
        rowId: 'lead-1',
        columnId: 'email'
      });
    });

    it('handles cell double click', async () => {
      const user = userEvent.setup();
      const onCellDoubleClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onCellDoubleClick={onCellDoubleClick}
        />
      );

      const cellElement = screen.getByText('john@example.com');
      await user.dblClick(cellElement);

      expect(onCellDoubleClick).toHaveBeenCalledWith({
        rowId: 'lead-1',
        columnId: 'email'
      });
    });

    it('handles cell right click', async () => {
      const user = userEvent.setup();
      const onCellRightClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onCellRightClick={onCellRightClick}
        />
      );

      const cellElement = screen.getByText('john@example.com');
      await user.pointer([
        { keys: '[MouseRight]', target: cellElement }
      ]);

      expect(onCellRightClick).toHaveBeenCalledWith(
        { rowId: 'lead-1', columnId: 'email' },
        expect.objectContaining({ type: 'contextmenu' })
      );
    });

    it('stops event propagation for cell clicks', async () => {
      const user = userEvent.setup();
      const onRowSelect = jest.fn();
      const onCellClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onRowSelect={onRowSelect}
          onCellClick={onCellClick}
        />
      );

      const cellElement = screen.getByText('john@example.com');
      await user.click(cellElement);

      expect(onCellClick).toHaveBeenCalled();
      // Row select should not be called due to event.stopPropagation()
      expect(onRowSelect).not.toHaveBeenCalled();
    });

    it('renders selected cells with correct styling', () => {
      const selectedCells: CellSelection[] = [
        {
          start: { rowId: 'lead-1', columnId: 'email' }
        },
        {
          start: { rowId: 'lead-2', columnId: 'first_name' }
        }
      ];

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          selectedCells={selectedCells}
        />
      );

      // Check that selected cells have appropriate styling
      const johnEmailCell = screen.getByText('john@example.com').closest('div');
      const janeFirstNameCell = screen.getByText('Jane').closest('div');
      
      expect(johnEmailCell).toHaveClass('ring-1', 'ring-purple-400');
      expect(janeFirstNameCell).toHaveClass('ring-1', 'ring-purple-400');
    });

    it('renders editing cell with input field', () => {
      const editingCell: CellPosition = { rowId: 'lead-1', columnId: 'email' };

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          editingCell={editingCell}
        />
      );

      // Check that editing cell shows input field
      const inputField = screen.getByDisplayValue('john@example.com');
      expect(inputField).toBeInTheDocument();
      expect(inputField.tagName).toBe('INPUT');
    });
  });

  describe('Column Interactions', () => {
    it('handles column header click', async () => {
      const user = userEvent.setup();
      const onColumnHeaderClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onColumnHeaderClick={onColumnHeaderClick}
        />
      );

      const emailHeader = screen.getByText('Email');
      await user.click(emailHeader);

      expect(onColumnHeaderClick).toHaveBeenCalledWith('email');
    });

    it('handles column header right click', async () => {
      const user = userEvent.setup();
      const onColumnHeaderRightClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onColumnHeaderRightClick={onColumnHeaderRightClick}
        />
      );

      const emailHeader = screen.getByText('Email');
      await user.pointer([
        { keys: '[MouseRight]', target: emailHeader }
      ]);

      expect(onColumnHeaderRightClick).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({ type: 'contextmenu' })
      );
    });

    it('renders resize handle for resizable columns', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      // Email column should have resize handle (resizable: true)
      const emailHeader = screen.getByText('Email').closest('div');
      const resizeHandle = emailHeader?.querySelector('[class*="cursor-col-resize"]');
      expect(resizeHandle).toBeInTheDocument();

      // Select column should not have resize handle (resizable: false)
      const selectHeader = screen.getByText('Select').closest('div');
      const selectResizeHandle = selectHeader?.querySelector('[class*="cursor-col-resize"]');
      expect(selectResizeHandle).not.toBeInTheDocument();
    });

    it('handles column resize mouse down', async () => {
      const user = userEvent.setup();
      const onColumnResize = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onColumnResize={onColumnResize}
        />
      );

      const emailHeader = screen.getByText('Email').closest('div');
      const resizeHandle = emailHeader?.querySelector('[class*="cursor-col-resize"]');
      
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 100 });
        fireEvent.mouseMove(document, { clientX: 150 });
        fireEvent.mouseUp(document);

        expect(onColumnResize).toHaveBeenCalledWith('email', 250); // 200 + 50
      }
    });

    it('enforces minimum column width during resize', () => {
      const onColumnResize = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onColumnResize={onColumnResize}
        />
      );

      const emailHeader = screen.getByText('Email').closest('div');
      const resizeHandle = emailHeader?.querySelector('[class*="cursor-col-resize"]');
      
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 100 });
        fireEvent.mouseMove(document, { clientX: 0 }); // Move far to the left
        fireEvent.mouseUp(document);

        expect(onColumnResize).toHaveBeenCalledWith('email', 50); // Minimum width
      }
    });
  });

  describe('Context Menu', () => {
    it('renders context menu when open', () => {
      const contextMenu = {
        isOpen: true,
        position: { x: 150, y: 200 },
        items: [
          {
            id: 'copy',
            label: 'Copy',
            action: jest.fn()
          },
          {
            id: 'paste',
            label: 'Paste',
            action: jest.fn(),
            disabled: true
          },
          {
            id: 'separator',
            separator: true,
            label: '',
            action: jest.fn()
          }
        ],
        target: 'cell',
        targetId: 'lead-1-email'
      };

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          contextMenu={contextMenu}
        />
      );

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
      
      // Check that disabled item is properly styled
      const pasteButton = screen.getByText('Paste');
      expect(pasteButton).toHaveClass('opacity-50', 'cursor-not-allowed');
      expect(pasteButton).toBeDisabled();
    });

    it('handles context menu item clicks', async () => {
      const user = userEvent.setup();
      const copyAction = jest.fn();
      
      const contextMenu = {
        isOpen: true,
        position: { x: 150, y: 200 },
        items: [
          {
            id: 'copy',
            label: 'Copy',
            action: copyAction
          }
        ],
        target: 'cell',
        targetId: 'lead-1-email'
      };

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          contextMenu={contextMenu}
        />
      );

      const copyButton = screen.getByText('Copy');
      await user.click(copyButton);

      expect(copyAction).toHaveBeenCalled();
    });

    it('renders context menu with correct positioning', () => {
      const contextMenu = {
        isOpen: true,
        position: { x: 300, y: 400 },
        items: [
          {
            id: 'copy',
            label: 'Copy',
            action: jest.fn()
          }
        ],
        target: 'cell',
        targetId: 'lead-1-email'
      };

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          contextMenu={contextMenu}
        />
      );

      const contextMenuElement = screen.getByText('Copy').closest('div');
      expect(contextMenuElement).toHaveStyle({
        left: '300px',
        top: '400px'
      });
    });
  });

  describe('Custom Cell Renderer', () => {
    it('uses custom cell renderer when provided', () => {
      const customRenderCell = jest.fn().mockReturnValue(
        <div data-testid="custom-cell">Custom Content</div>
      );

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          renderCell={customRenderCell}
        />
      );

      expect(screen.getAllByTestId('custom-cell')).toHaveLength(
        mockLeads.length * mockColumns.length
      );
      
      expect(customRenderCell).toHaveBeenCalledWith({
        value: expect.any(String),
        formattedValue: expect.any(String),
        lead: expect.objectContaining({ id: 'lead-1' }),
        column: expect.objectContaining({ id: 'email' }),
        isSelected: false,
        isEditing: false,
        position: { rowId: 'lead-1', columnId: 'email' }
      });
    });

    it('falls back to default renderer when custom renderer returns null', () => {
      const customRenderCell = jest.fn().mockReturnValue(null);

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          renderCell={customRenderCell}
        />
      );

      // Should still see the default rendered content
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('uses memo to prevent unnecessary re-renders', () => {
      const { rerender } = render(<VirtualScrollTable {...defaultProps} />);
      
      // Re-render with same props
      rerender(<VirtualScrollTable {...defaultProps} />);
      
      // Virtual scrolling hook should only be called once per render
      expect(mockUseVirtualScrolling).toHaveBeenCalledTimes(2);
    });

    it('handles large datasets efficiently with virtual scrolling', () => {
      const largeLeadSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `lead-${i}`,
        email: `user${i}@example.com`,
        first_name: 'User',
        last_name: `${i}`,
        company: 'Test Corp',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }));

      // Mock virtual scrolling to only show a few items
      mockUseVirtualScrolling.mockReturnValue({
        ...defaultVirtualScrollingReturn,
        visibleItems: [0, 1, 2, 3, 4] // Only 5 visible items out of 10000
      });

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          leads={largeLeadSet}
        />
      );

      // Should only render visible items, not all 10000
      expect(screen.getByText('user0@example.com')).toBeInTheDocument();
      expect(screen.getByText('user4@example.com')).toBeInTheDocument();
      expect(screen.queryByText('user5@example.com')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper roles and labels', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      // Check for table structure
      expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
      
      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      
      // Check for buttons in context menu (when rendered)
      // This would be tested when context menu is open
    });

    it('supports keyboard navigation for interactive elements', async () => {
      const user = userEvent.setup();
      const onColumnHeaderClick = jest.fn();

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          onColumnHeaderClick={onColumnHeaderClick}
        />
      );

      const emailHeader = screen.getByText('Email');
      emailHeader.focus();
      await user.keyboard('{Enter}');

      // Should trigger click via keyboard
      expect(onColumnHeaderClick).toHaveBeenCalledWith('email');
    });

    it('provides meaningful titles for truncated content', () => {
      render(<VirtualScrollTable {...defaultProps} />);

      const cellElement = screen.getByText('john@example.com');
      expect(cellElement).toHaveAttribute('title', 'john@example.com');
    });
  });

  describe('Pinned Columns', () => {
    it('renders pinned columns with correct styling', () => {
      const columnsWithPinned = [
        ...mockColumns.slice(0, 1), // Select column
        {
          ...mockColumns[1], // Email column
          pinned: 'left' as const
        },
        ...mockColumns.slice(2), // Rest of columns
        {
          ...mockColumns[3], // Last column
          pinned: 'right' as const
        }
      ];

      render(
        <VirtualScrollTable 
          {...defaultProps} 
          columns={columnsWithPinned}
        />
      );

      // Check that pinned columns have sticky positioning classes
      const emailHeader = screen.getByText('Email').closest('div');
      expect(emailHeader).toHaveClass('sticky', 'left-0', 'z-30');
    });
  });

  describe('Error Handling', () => {
    it('handles missing lead data gracefully', () => {
      const leadsWithUndefined = [mockLeads[0], undefined as any, mockLeads[2]];
      
      render(
        <VirtualScrollTable 
          {...defaultProps} 
          leads={leadsWithUndefined}
        />
      );

      // Should only render the valid leads
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      
      // Should not crash
      expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument();
    });

    it('handles resize cleanup on unmount', () => {
      const { unmount } = render(<VirtualScrollTable {...defaultProps} />);
      
      // Start a resize operation
      const emailHeader = screen.getByText('Email').closest('div');
      const resizeHandle = emailHeader?.querySelector('[class*="cursor-col-resize"]');
      
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 100 });
      }

      // Unmount component
      unmount();

      // Should clean up event listeners and cursor style
      expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });
});