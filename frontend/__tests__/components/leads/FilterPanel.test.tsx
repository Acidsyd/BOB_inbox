import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FilterPanel from '@/components/leads/FilterPanel';
import { ColumnDefinition, FilterConfig, QuickFilter, FilterOperator } from '@/types/spreadsheet';

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
  Input: ({ onChange, value, placeholder, className, ...props }: any) => (
    <input 
      onChange={onChange}
      value={value}
      placeholder={placeholder}
      className={`input ${className}`}
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
  Badge: ({ children, variant, className, onClick }: any) => (
    <span 
      className={`badge ${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </span>
  ),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const mockIcon = ({ className }: { className?: string }) => <div className={`icon ${className}`} />;
  return {
    Filter: mockIcon,
    Plus: mockIcon,
    X: mockIcon,
    Search: mockIcon,
    Save: mockIcon,
    Trash2: mockIcon,
  };
});

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('FilterPanel', () => {
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
      pinned: null,
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
      hidden: false,
      pinned: null,
    },
    {
      id: 'notes',
      key: 'notes',
      name: 'Notes',
      type: 'text',
      width: 300,
      resizable: true,
      sortable: true,
      filterable: false, // Non-filterable column
      editable: true,
      hidden: false,
      pinned: null,
    }
  ];

  const mockFilterConfig: FilterConfig = {
    activeFilters: [
      {
        columnId: 'firstName',
        operator: 'contains',
        value: 'John'
      }
    ],
    quickFilters: ['active_leads'],
    searchTerm: 'test search'
  };

  const mockQuickFilters: QuickFilter[] = [
    {
      id: 'active_leads',
      name: 'Active Leads',
      filterConfig: {
        activeFilters: [{ columnId: 'status', operator: 'equals', value: 'active' }],
        quickFilters: [],
        searchTerm: ''
      },
      isActive: true
    },
    {
      id: 'new_leads',
      name: 'New Leads',
      filterConfig: {
        activeFilters: [{ columnId: 'status', operator: 'equals', value: 'new' }],
        quickFilters: [],
        searchTerm: ''
      },
      isActive: false
    },
    {
      id: 'qualified_leads',
      name: 'Qualified Leads',
      filterConfig: {
        activeFilters: [{ columnId: 'status', operator: 'equals', value: 'qualified' }],
        quickFilters: [],
        searchTerm: ''
      },
      isActive: false
    }
  ];

  const mockOnFilterChange = jest.fn();
  const mockOnQuickFilterToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders search input', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search across all fields...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveValue('test search');
    });

    it('renders quick filters section', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.getByText('Quick Filters')).toBeInTheDocument();
      expect(screen.getByText('Active Leads')).toBeInTheDocument();
      expect(screen.getByText('New Leads')).toBeInTheDocument();
      expect(screen.getByText('Qualified Leads')).toBeInTheDocument();
    });

    it('renders active filters section', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.getByText('Filters (1)')).toBeInTheDocument();
      expect(screen.getByText('Add Filter')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('shows no filters message when no active filters', () => {
      const emptyFilterConfig: FilterConfig = {
        activeFilters: [],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={emptyFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={[]}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.getByText('No filters applied. Click "Add Filter" to start filtering your data.')).toBeInTheDocument();
    });

    it('hides Clear All button when no filters', () => {
      const emptyFilterConfig: FilterConfig = {
        activeFilters: [],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={emptyFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={[]}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('updates search term when typing', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={{ ...mockFilterConfig, searchTerm: '' }}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search across all fields...');
      await user.type(searchInput, 'new search term');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        searchTerm: 'new search term'
      });
    });

    it('handles clearing search term', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search across all fields...');
      await user.clear(searchInput);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        searchTerm: ''
      });
    });
  });

  describe('Quick Filters', () => {
    it('shows active quick filters with different styling', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const activeFilter = screen.getByText('Active Leads');
      const inactiveFilter = screen.getByText('New Leads');

      expect(activeFilter.closest('.badge')).toHaveClass('bg-purple-600');
      expect(inactiveFilter.closest('.badge')).toHaveClass('secondary');
    });

    it('toggles quick filter when clicked', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const filterBadge = screen.getByText('New Leads');
      await user.click(filterBadge);

      expect(mockOnQuickFilterToggle).toHaveBeenCalledWith('new_leads');
    });

    it('shows X icon for active quick filters', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const activeFilterBadge = screen.getByText('Active Leads').closest('.badge');
      expect(activeFilterBadge?.querySelector('.icon')).toBeInTheDocument();
    });

    it('does not render quick filters section when no quick filters exist', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={[]}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.queryByText('Quick Filters')).not.toBeInTheDocument();
    });
  });

  describe('Active Filters', () => {
    it('displays active filter correctly', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      // Check that the filter components are rendered
      expect(screen.getByDisplayValue('firstName')).toBeInTheDocument();
      expect(screen.getByDisplayValue('contains')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    it('shows only filterable columns in column dropdown', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const columnSelect = screen.getByDisplayValue('firstName') as HTMLSelectElement;
      const options = Array.from(columnSelect.options).map(option => option.text);

      expect(options).toContain('First Name');
      expect(options).toContain('Email');
      expect(options).toContain('Age');
      expect(options).not.toContain('Notes'); // Not filterable
    });

    it('shows all filter operators', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const operatorSelect = screen.getByDisplayValue('contains') as HTMLSelectElement;
      const options = Array.from(operatorSelect.options).map(option => option.text);

      expect(options).toContain('Equals');
      expect(options).toContain('Contains');
      expect(options).toContain('Not equals');
      expect(options).toContain('Starts with');
      expect(options).toContain('Is empty');
      expect(options).toContain('Greater than');
    });

    it('hides value input for empty/not empty operators', () => {
      const filterConfigWithEmptyOperator: FilterConfig = {
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'is_empty',
            value: ''
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={filterConfigWithEmptyOperator}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const valueInputs = screen.queryAllByPlaceholderText('Filter value...');
      expect(valueInputs).toHaveLength(0);
    });

    it('shows value input for other operators', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const valueInput = screen.getByPlaceholderText('Filter value...');
      expect(valueInput).toBeInTheDocument();
      expect(valueInput).toHaveValue('John');
    });
  });

  describe('Filter Management', () => {
    it('adds new filter when Add Filter button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const addButton = screen.getByText('Add Filter');
      await user.click(addButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        activeFilters: [
          ...mockFilterConfig.activeFilters,
          {
            columnId: 'firstName', // First filterable column
            operator: 'equals',
            value: ''
          }
        ]
      });
    });

    it('does not add filter if no filterable columns exist', async () => {
      const user = userEvent.setup();
      const nonFilterableColumns = mockColumns.map(col => ({ ...col, filterable: false }));

      render(
        <FilterPanel
          columns={nonFilterableColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const addButton = screen.getByText('Add Filter');
      await user.click(addButton);

      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });

    it('removes filter when X button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const removeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('.icon')
      );
      const removeButton = removeButtons[removeButtons.length - 1]; // Last remove button

      await user.click(removeButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        activeFilters: []
      });
    });

    it('clears all filters when Clear All button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        activeFilters: [],
        quickFilters: [],
        searchTerm: ''
      });
    });
  });

  describe('Filter Updates', () => {
    it('updates filter column when column dropdown changes', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const columnSelect = screen.getByDisplayValue('firstName');
      await user.selectOptions(columnSelect, 'email');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        activeFilters: [
          {
            columnId: 'email',
            operator: 'contains',
            value: 'John'
          }
        ]
      });
    });

    it('updates filter operator when operator dropdown changes', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const operatorSelect = screen.getByDisplayValue('contains');
      await user.selectOptions(operatorSelect, 'equals');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'equals',
            value: 'John'
          }
        ]
      });
    });

    it('updates filter value when value input changes', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const valueInput = screen.getByDisplayValue('John');
      await user.clear(valueInput);
      await user.type(valueInput, 'Jane');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...mockFilterConfig,
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: 'Jane'
          }
        ]
      });
    });
  });

  describe('Multiple Filters', () => {
    it('handles multiple active filters correctly', () => {
      const multiFilterConfig: FilterConfig = {
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: 'John'
          },
          {
            columnId: 'email',
            operator: 'ends_with',
            value: '@company.com'
          },
          {
            columnId: 'age',
            operator: 'greater_than',
            value: '25'
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={multiFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.getByText('Filters (3)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('@company.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    });

    it('updates specific filter without affecting others', async () => {
      const user = userEvent.setup();
      const multiFilterConfig: FilterConfig = {
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: 'John'
          },
          {
            columnId: 'email',
            operator: 'ends_with',
            value: '@company.com'
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={multiFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      // Update the second filter's value
      const emailValueInput = screen.getByDisplayValue('@company.com');
      await user.clear(emailValueInput);
      await user.type(emailValueInput, '@newcompany.com');

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...multiFilterConfig,
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: 'John'
          },
          {
            columnId: 'email',
            operator: 'ends_with',
            value: '@newcompany.com'
          }
        ]
      });
    });

    it('removes specific filter without affecting others', async () => {
      const user = userEvent.setup();
      const multiFilterConfig: FilterConfig = {
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: 'John'
          },
          {
            columnId: 'email',
            operator: 'ends_with',
            value: '@company.com'
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={multiFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const removeButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('.icon')
      );
      // Click the first remove button (first filter)
      await user.click(removeButtons[0]);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...multiFilterConfig,
        activeFilters: [
          {
            columnId: 'email',
            operator: 'ends_with',
            value: '@company.com'
          }
        ]
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles filter with non-existent column gracefully', () => {
      const badFilterConfig: FilterConfig = {
        activeFilters: [
          {
            columnId: 'nonexistent',
            operator: 'contains',
            value: 'test'
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={badFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      // Should not crash, should not render the bad filter
      expect(screen.getByText('Filters (1)')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('test')).not.toBeInTheDocument();
    });

    it('handles empty filter value correctly', () => {
      const emptyValueConfig: FilterConfig = {
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: ''
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={emptyValueConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const valueInput = screen.getByPlaceholderText('Filter value...');
      expect(valueInput).toHaveValue('');
    });

    it('handles null/undefined filter values', () => {
      const nullValueConfig: FilterConfig = {
        activeFilters: [
          {
            columnId: 'firstName',
            operator: 'contains',
            value: null as any
          }
        ],
        quickFilters: [],
        searchTerm: ''
      };

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={nullValueConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const valueInput = screen.getByPlaceholderText('Filter value...');
      expect(valueInput).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('provides proper form controls', () => {
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      // Check for input and select elements
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      expect(searchInput).toBeInTheDocument();

      const columnSelect = screen.getByRole('combobox');
      expect(columnSelect).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('maintains focus when interacting with filters', async () => {
      const user = userEvent.setup();
      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search across all fields...');
      await user.click(searchInput);
      
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      // Re-render with same props
      rerender(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={mockQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      // Should still show the same content
      expect(screen.getByText('Filters (1)')).toBeInTheDocument();
    });

    it('handles large numbers of quick filters efficiently', () => {
      const manyQuickFilters: QuickFilter[] = Array.from({ length: 50 }, (_, index) => ({
        id: `filter-${index}`,
        name: `Filter ${index}`,
        filterConfig: {
          activeFilters: [],
          quickFilters: [],
          searchTerm: ''
        },
        isActive: index % 5 === 0
      }));

      render(
        <FilterPanel
          columns={mockColumns}
          filterConfig={mockFilterConfig}
          onFilterChange={mockOnFilterChange}
          quickFilters={manyQuickFilters}
          onQuickFilterToggle={mockOnQuickFilterToggle}
        />
      );

      expect(screen.getByText('Filter 0')).toBeInTheDocument();
      expect(screen.getByText('Filter 49')).toBeInTheDocument();
    });
  });
});