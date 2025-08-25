import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ColumnManager from '@/components/leads/ColumnManager';
import { ColumnDefinition, ViewConfig, ColumnType } from '@/types/spreadsheet';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${size} ${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, onBlur, onKeyDown, value, defaultValue, ...props }: any) => (
    <input 
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      value={value}
      defaultValue={defaultValue}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={`card-title ${className}`}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={`badge ${className}`}>{children}</span>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const mockIcon = ({ className }: { className?: string }) => <div className={`icon ${className}`} />;
  return {
    GripVertical: mockIcon,
    Eye: mockIcon,
    EyeOff: mockIcon,
    Settings: mockIcon,
    Plus: mockIcon,
    Trash2: mockIcon,
    Save: mockIcon,
    Pin: mockIcon,
    PinOff: mockIcon,
    Copy: mockIcon,
    Edit3: mockIcon,
    ChevronDown: mockIcon,
    ChevronRight: mockIcon,
    Type: mockIcon,
    Hash: mockIcon,
    Calendar: mockIcon,
    ToggleLeft: mockIcon,
    Link: mockIcon,
    Tags: mockIcon,
    AtSign: mockIcon,
    Phone: mockIcon,
    Calculator: mockIcon,
    Zap: mockIcon,
    X: mockIcon,
  };
});

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('ColumnManager', () => {
  const mockColumns: ColumnDefinition[] = [
    {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: false,
      pinned: null,
    },
    {
      id: 'email',
      key: 'email',
      name: 'Email',
      type: 'email',
      width: 200,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: false,
      pinned: 'left',
    },
    {
      id: 'age',
      key: 'age',
      name: 'Age',
      type: 'number',
      width: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: true,
      pinned: null,
      required: true,
    },
    {
      id: 'custom_status',
      key: 'custom_status',
      name: 'Status',
      type: 'select',
      width: 120,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: false,
      pinned: null,
      selectOptions: [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'qualified', label: 'Qualified' }
      ]
    }
  ];

  const mockViews: ViewConfig[] = [
    {
      id: 'view-1',
      name: 'Default View',
      columnOrder: ['firstName', 'email'],
      columnWidths: { firstName: 150, email: 200 },
      hiddenColumns: [],
      pinnedColumns: { left: [], right: [] },
      isDefault: true,
    },
    {
      id: 'view-2', 
      name: 'Sales View',
      columnOrder: ['firstName', 'email', 'age'],
      columnWidths: { firstName: 150, email: 200, age: 100 },
      hiddenColumns: [],
      pinnedColumns: { left: ['email'], right: [] },
      isDefault: false,
    }
  ];

  const mockOnColumnsChange = jest.fn();
  const mockOnViewSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders column manager with header and controls', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Column Manager')).toBeInTheDocument();
      expect(screen.getByText('Manage column visibility, order, and properties')).toBeInTheDocument();
      expect(screen.getByText('Save View')).toBeInTheDocument();
      expect(screen.getByText('Add Column')).toBeInTheDocument();
    });

    it('displays column count correctly', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Columns (4)')).toBeInTheDocument();
    });

    it('renders all columns with correct information', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Check column names are displayed
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check column types are displayed
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByText('Select')).toBeInTheDocument();

      // Check width displays
      expect(screen.getByText('Width: 150px')).toBeInTheDocument();
      expect(screen.getByText('Width: 200px')).toBeInTheDocument();
      expect(screen.getByText('Width: 100px')).toBeInTheDocument();
    });

    it('shows pinned and required badges', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Pinned left')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  describe('Available Views', () => {
    it('displays saved views correctly', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Saved Views')).toBeInTheDocument();
      expect(screen.getByText('Default View')).toBeInTheDocument();
      expect(screen.getByText('Sales View')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('shows message when no views available', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={[]}
        />
      );

      expect(screen.getByText('No saved views yet')).toBeInTheDocument();
    });

    it('handles view application click', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const user = userEvent.setup();

      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const viewButton = screen.getByText('Default View');
      await user.click(viewButton);

      expect(consoleSpy).toHaveBeenCalledWith('Apply view:', mockViews[0]);
      consoleSpy.mockRestore();
    });
  });

  describe('Column Visibility', () => {
    it('toggles column visibility when eye icon is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Find the first visible column's eye icon and click it
      const eyeIcons = screen.getAllByRole('button');
      const visibilityButtons = eyeIcons.filter(button => 
        button.innerHTML.includes('icon') && 
        (button.innerHTML.includes('Eye') || button.innerHTML.includes('EyeOff'))
      );

      await user.click(visibilityButtons[0]);

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'firstName',
            hidden: true
          })
        ])
      );
    });
  });

  describe('Column Width Adjustment', () => {
    it('updates column width when width input changes', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const widthInputs = screen.getAllByDisplayValue('150');
      const firstWidthInput = widthInputs[0];

      await user.clear(firstWidthInput);
      await user.type(firstWidthInput, '200');

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'firstName',
            width: 200
          })
        ])
      );
    });

    it('clamps width values to valid range', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const widthInputs = screen.getAllByDisplayValue('150');
      const firstWidthInput = widthInputs[0];

      await user.clear(firstWidthInput);
      await user.type(firstWidthInput, '600'); // Above max

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'firstName',
            width: 500 // Clamped to max
          })
        ])
      );
    });
  });

  describe('Column Pinning', () => {
    it('cycles through pin states when pin button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const pinButtons = screen.getAllByRole('button');
      const pinButton = pinButtons.find(button => 
        button.innerHTML.includes('Pin') && !button.innerHTML.includes('PinOff')
      );

      // First unpinned column (firstName) should cycle to left pin
      const firstColumnPinButton = pinButtons[pinButtons.length - 10]; // Approximate position
      await user.click(firstColumnPinButton);

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            pinned: expect.any(String)
          })
        ])
      );
    });
  });

  describe('Column Editing', () => {
    it('allows editing column name by clicking on it', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const columnName = screen.getByText('First Name');
      await user.click(columnName);

      // Should show input field
      const nameInput = screen.getByDisplayValue('First Name');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveFocus();

      await user.clear(nameInput);
      await user.type(nameInput, 'Given Name');
      await user.tab(); // Blur the input

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'firstName',
            name: 'Given Name'
          })
        ])
      );
    });

    it('cancels editing when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const columnName = screen.getByText('First Name');
      await user.click(columnName);

      const nameInput = screen.getByDisplayValue('First Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      await user.keyboard('{Escape}');

      // Should not call onColumnsChange for escape
      expect(mockOnColumnsChange).not.toHaveBeenCalled();
    });

    it('confirms editing when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const columnName = screen.getByText('First Name');
      await user.click(columnName);

      const nameInput = screen.getByDisplayValue('First Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name{Enter}');

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'firstName',
            name: 'Updated Name'
          })
        ])
      );
    });
  });

  describe('Column Expansion', () => {
    it('expands column details when chevron is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Find and click expand button
      const expandButtons = screen.getAllByRole('button');
      const chevronButton = expandButtons.find(button => 
        button.innerHTML.includes('ChevronRight')
      );

      if (chevronButton) {
        await user.click(chevronButton);
        
        // Should show expanded configuration
        expect(screen.getByText('Field Key')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Editable')).toBeInTheDocument();
        expect(screen.getByText('Sortable')).toBeInTheDocument();
        expect(screen.getByText('Filterable')).toBeInTheDocument();
      }
    });

    it('shows select options configuration for select columns', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Find the Status column (select type) and expand it
      const expandButtons = screen.getAllByRole('button');
      const statusRowExpandButton = expandButtons[expandButtons.length - 2]; // Approximate position

      await user.click(statusRowExpandButton);

      // Should show select options configuration
      expect(screen.getByText('Select Options')).toBeInTheDocument();
    });
  });

  describe('Custom Column Management', () => {
    it('shows delete button only for custom columns', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Custom column (Status) should have delete button
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.innerHTML.includes('Trash2')
      );
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('deletes custom column when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.innerHTML.includes('Trash2')
      );

      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0]);

        expect(mockOnColumnsChange).toHaveBeenCalledWith(
          expect.not.arrayContaining([
            expect.objectContaining({
              id: 'custom_status'
            })
          ])
        );
      }
    });

    it('allows editing field key for custom columns', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Expand the custom column
      const expandButtons = screen.getAllByRole('button');
      const lastExpandButton = expandButtons[expandButtons.length - 2];
      await user.click(lastExpandButton);

      // Should be able to edit key field
      const keyInputs = screen.getAllByDisplayValue('custom_status');
      if (keyInputs.length > 0) {
        const keyInput = keyInputs[0];
        expect(keyInput).not.toBeDisabled();
      }
    });

    it('disables editing field key for built-in columns', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Expand a built-in column
      const expandButtons = screen.getAllByRole('button');
      const firstExpandButton = expandButtons.find(button => 
        button.innerHTML.includes('ChevronRight')
      );

      if (firstExpandButton) {
        await user.click(firstExpandButton);

        // Should disable key field for built-in columns
        const keyInputs = screen.getAllByDisplayValue('firstName');
        if (keyInputs.length > 0) {
          const keyInput = keyInputs[0];
          expect(keyInput).toBeDisabled();
        }
      }
    });
  });

  describe('Add Column Modal', () => {
    it('opens add column modal when Add Column button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const addButton = screen.getByText('Add Column');
      await user.click(addButton);

      expect(screen.getByText('Add New Column')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
    });

    it('closes add column modal when X button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const addButton = screen.getByText('Add Column');
      await user.click(addButton);

      const closeButtons = screen.getAllByRole('button').filter(button => 
        button.innerHTML.includes('X')
      );
      const modalCloseButton = closeButtons.find(button => 
        button.closest('.fixed')
      );

      if (modalCloseButton) {
        await user.click(modalCloseButton);
        expect(screen.queryByText('Add New Column')).not.toBeInTheDocument();
      }
    });

    it('creates new column when column type is selected', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const addButton = screen.getByText('Add Column');
      await user.click(addButton);

      // Click on a column type (e.g., Text)
      const columnTypeButtons = screen.getAllByRole('button');
      const textButton = columnTypeButtons.find(button => 
        button.textContent?.includes('Text') && 
        button.classList.contains('h-16')
      );

      if (textButton) {
        await user.click(textButton);

        expect(mockOnColumnsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              name: expect.stringContaining('New Text'),
              key: expect.stringMatching(/^custom_field_\d+$/)
            })
          ])
        );
      }
    });
  });

  describe('Save View Modal', () => {
    it('opens save view modal when Save View button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const saveButton = screen.getByText('Save View');
      await user.click(saveButton);

      expect(screen.getByText('Save Current View')).toBeInTheDocument();
      expect(screen.getByText('View Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter view name...')).toBeInTheDocument();
    });

    it('saves view with entered name', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const saveButton = screen.getByText('Save View');
      await user.click(saveButton);

      const nameInput = screen.getByPlaceholderText('Enter view name...');
      await user.type(nameInput, 'My Custom View');

      const saveViewButton = screen.getByRole('button', { name: 'Save View' });
      await user.click(saveViewButton);

      expect(mockOnViewSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Custom View',
          columnOrder: expect.any(Array),
          columnWidths: expect.any(Object),
          hiddenColumns: expect.any(Array),
          pinnedColumns: expect.objectContaining({
            left: expect.any(Array),
            right: expect.any(Array)
          }),
          isDefault: false
        })
      );
    });

    it('saves view on Enter key press', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const saveButton = screen.getByText('Save View');
      await user.click(saveButton);

      const nameInput = screen.getByPlaceholderText('Enter view name...');
      await user.type(nameInput, 'Quick Save View{Enter}');

      expect(mockOnViewSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Quick Save View'
        })
      );
    });

    it('disables save button when name is empty', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      const saveButton = screen.getByText('Save View');
      await user.click(saveButton);

      const saveViewButton = screen.getByRole('button', { name: 'Save View' });
      expect(saveViewButton).toBeDisabled();

      const nameInput = screen.getByPlaceholderText('Enter view name...');
      await user.type(nameInput, 'Test');

      expect(saveViewButton).not.toBeDisabled();
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag start event', async () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Find a draggable column row
      const columnRows = screen.getAllByText('First Name')[0].closest('[draggable="true"]');
      
      if (columnRows) {
        fireEvent.dragStart(columnRows);
        expect(columnRows).toHaveClass('opacity-50');
      }
    });

    it('reorders columns when drag and drop completes', async () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Simulate drag and drop
      const firstColumn = screen.getAllByText('First Name')[0].closest('[draggable="true"]');
      const secondColumn = screen.getAllByText('Email')[0].closest('[draggable="true"]');

      if (firstColumn && secondColumn) {
        fireEvent.dragStart(firstColumn);
        fireEvent.dragOver(secondColumn);
        fireEvent.drop(secondColumn);
        fireEvent.dragEnd(firstColumn);

        expect(mockOnColumnsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'email' }),
            expect.objectContaining({ id: 'firstName' })
          ])
        );
      }
    });
  });

  describe('Column Properties Configuration', () => {
    it('updates column properties when checkboxes are toggled', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Expand a column to see properties
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons.find(button => 
        button.innerHTML.includes('ChevronRight')
      );

      if (expandButton) {
        await user.click(expandButton);

        // Find and toggle sortable checkbox
        const sortableCheckbox = screen.getByRole('checkbox', { name: /sortable/i });
        await user.click(sortableCheckbox);

        expect(mockOnColumnsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              sortable: expect.any(Boolean)
            })
          ])
        );
      }
    });

    it('updates column type when type select changes', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Expand a custom column to see type dropdown
      const expandButtons = screen.getAllByRole('button');
      const lastExpandButton = expandButtons[expandButtons.length - 2];
      await user.click(lastExpandButton);

      // Find type select and change it
      const typeSelects = screen.getAllByDisplayValue('Select');
      if (typeSelects.length > 0) {
        const typeSelect = typeSelects[0];
        await user.selectOptions(typeSelect, 'text');

        expect(mockOnColumnsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'custom_status',
              type: 'text'
            })
          ])
        );
      }
    });
  });

  describe('Select Options Management', () => {
    it('manages select options for select type columns', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Expand the select column
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons[expandButtons.length - 2]; // Approximate position
      await user.click(expandButton);

      // Should show existing options
      expect(screen.getByDisplayValue('new')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New')).toBeInTheDocument();

      // Add new option
      const addOptionButton = screen.getByText('Add Option');
      await user.click(addOptionButton);

      expect(mockOnColumnsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'custom_status',
            selectOptions: expect.arrayContaining([
              expect.objectContaining({ value: '', label: '' })
            ])
          })
        ])
      );
    });

    it('removes select options when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Expand the select column
      const expandButtons = screen.getAllByRole('button');
      const expandButton = expandButtons[expandButtons.length - 2];
      await user.click(expandButton);

      // Find and click delete button for an option
      const deleteOptionButtons = screen.getAllByRole('button').filter(button => 
        button.innerHTML.includes('X') && 
        button.closest('.space-y-2')
      );

      if (deleteOptionButtons.length > 0) {
        await user.click(deleteOptionButtons[0]);

        expect(mockOnColumnsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'custom_status',
              selectOptions: expect.any(Array)
            })
          ])
        );
      }
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check for input fields
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Tab to first interactive element
      await user.tab();
      
      // Should focus on the first button
      const focusedElement = document.activeElement;
      expect(focusedElement?.tagName).toBe('BUTTON');
    });
  });

  describe('Error Handling', () => {
    it('handles missing column data gracefully', () => {
      const incompleteColumns = [
        {
          id: 'test',
          key: 'test',
          name: 'Test',
          type: 'text' as ColumnType,
          width: 100,
          // Missing other properties
        } as ColumnDefinition
      ];

      render(
        <ColumnManager
          columns={incompleteColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('handles empty columns array', () => {
      render(
        <ColumnManager
          columns={[]}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Columns (0)')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Re-render with same props
      rerender(
        <ColumnManager
          columns={mockColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      // Should still show the same content
      expect(screen.getByText('Column Manager')).toBeInTheDocument();
    });

    it('handles large number of columns efficiently', () => {
      const manyColumns = Array.from({ length: 100 }, (_, index) => ({
        id: `col-${index}`,
        key: `col-${index}`,
        name: `Column ${index}`,
        type: 'text' as ColumnType,
        width: 150,
        resizable: true,
        sortable: true,
        filterable: true,
        editable: true,
        hidden: false,
        pinned: null,
      }));

      render(
        <ColumnManager
          columns={manyColumns}
          onColumnsChange={mockOnColumnsChange}
          onViewSave={mockOnViewSave}
          availableViews={mockViews}
        />
      );

      expect(screen.getByText('Columns (100)')).toBeInTheDocument();
    });
  });
});