import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CellEditor from '@/components/leads/CellEditor';
import { ColumnDefinition, Lead, ValidationError } from '@/types/spreadsheet';
import * as spreadsheetUtils from '@/lib/spreadsheetUtils';

// Mock the spreadsheet utilities
jest.mock('@/lib/spreadsheetUtils', () => ({
  validateCellValue: jest.fn(),
  formatCellValue: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('CellEditor', () => {
  const mockLead: Lead = {
    id: 'lead-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Test Corp',
    title: 'Developer',
    phone: '+1-555-123-4567',
    website: 'https://test.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOnChange = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  const mockValidateCellValue = spreadsheetUtils.validateCellValue as jest.MockedFunction<typeof spreadsheetUtils.validateCellValue>;
  const mockFormatCellValue = spreadsheetUtils.formatCellValue as jest.MockedFunction<typeof spreadsheetUtils.formatCellValue>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateCellValue.mockReturnValue(null);
    mockFormatCellValue.mockImplementation((value) => String(value));
  });

  describe('Text Input Editor', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true,
      validation: { maxLength: 100 }
    };

    it('renders text input with initial value', () => {
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('John');
      expect(input).toHaveAttribute('maxLength', '100');
    });

    it('focuses input on mount and selects text', async () => {
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });

    it('calls onChange when value changes', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Jane');

      expect(mockOnChange).toHaveBeenCalledWith('Jane');
    });

    it('completes editing on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{Enter}');

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('cancels editing on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('completes editing on Tab key', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{Tab}');

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Email Input Editor', () => {
    const emailColumn: ColumnDefinition = {
      id: 'email',
      key: 'email',
      name: 'Email',
      type: 'email',
      width: 200,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('renders email input with correct type and placeholder', () => {
      render(
        <CellEditor
          value="test@example.com"
          column={emailColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'email@example.com');
      expect(input).toHaveValue('test@example.com');
    });

    it('validates email format', async () => {
      const validationError: ValidationError = {
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT'
      };
      mockValidateCellValue.mockReturnValue(validationError);

      render(
        <CellEditor
          value="invalid-email"
          column={emailColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  describe('Number Input Editor', () => {
    const numberColumn: ColumnDefinition = {
      id: 'age',
      key: 'age',
      name: 'Age',
      type: 'number',
      width: 100,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('renders number input with correct type', () => {
      render(
        <CellEditor
          value={25}
          column={numberColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveValue(25);
      expect(input).toHaveAttribute('step', 'any');
    });

    it('handles number value changes', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value={25}
          column={numberColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '30');

      expect(mockOnChange).toHaveBeenCalledWith(30);
    });

    it('handles empty number input', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value={25}
          column={numberColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('spinbutton');
      await user.clear(input);

      expect(mockOnChange).toHaveBeenCalledWith(null);
    });

    it('handles null initial value', () => {
      render(
        <CellEditor
          value={null}
          column={numberColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveValue(null);
    });
  });

  describe('Boolean/Select Editor', () => {
    const booleanColumn: ColumnDefinition = {
      id: 'active',
      key: 'active',
      name: 'Active',
      type: 'boolean',
      width: 100,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('renders boolean select with correct options', () => {
      render(
        <CellEditor
          value={true}
          column={booleanColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('true');
      
      expect(screen.getByText('Select...')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('handles boolean value changes', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value={null}
          column={booleanColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'true');

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Select/Options Editor', () => {
    const selectColumn: ColumnDefinition = {
      id: 'status',
      key: 'status',
      name: 'Status',
      type: 'select',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true,
      selectOptions: [
        { value: 'new', label: 'New' },
        { value: 'contacted', label: 'Contacted' },
        { value: 'qualified', label: 'Qualified' }
      ]
    };

    it('renders select with custom options', () => {
      render(
        <CellEditor
          value="new"
          column={selectColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('new');
      
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Contacted')).toBeInTheDocument();
      expect(screen.getByText('Qualified')).toBeInTheDocument();
    });

    it('handles option selection', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value=""
          column={selectColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'qualified');

      expect(mockOnChange).toHaveBeenCalledWith('qualified');
    });
  });

  describe('Date Editor', () => {
    const dateColumn: ColumnDefinition = {
      id: 'dateJoined',
      key: 'dateJoined',
      name: 'Date Joined',
      type: 'date',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('renders date input with correct format', () => {
      const testDate = new Date('2023-12-25T00:00:00Z');
      render(
        <CellEditor
          value={testDate.toISOString()}
          column={dateColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByDisplayValue('2023-12-25');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('handles date value changes', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value=""
          column={dateColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '2023-12-25');

      expect(mockOnChange).toHaveBeenCalledWith('2023-12-25T00:00:00.000Z');
    });
  });

  describe('Tags Editor', () => {
    const tagsColumn: ColumnDefinition = {
      id: 'tags',
      key: 'tags',
      name: 'Tags',
      type: 'tags',
      width: 200,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('renders tags input with array value', () => {
      render(
        <CellEditor
          value={['tag1', 'tag2', 'tag3']}
          column={tagsColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('tag1, tag2, tag3');
      expect(input).toHaveAttribute('placeholder', 'tag1, tag2, tag3');
    });

    it('handles string value conversion to tags', () => {
      render(
        <CellEditor
          value="tag1,tag2,tag3"
          column={tagsColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('tag1, tag2, tag3');
    });

    it('handles tag value changes', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value={[]}
          column={tagsColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'new-tag, another-tag');

      expect(mockOnChange).toHaveBeenCalledWith(['new-tag', 'another-tag']);
    });
  });

  describe('Formula Editor', () => {
    const formulaColumn: ColumnDefinition = {
      id: 'fullName',
      key: 'fullName',
      name: 'Full Name',
      type: 'formula',
      width: 200,
      resizable: true,
      sortable: false,
      filterable: false
    };

    it('renders formula input with help text', () => {
      render(
        <CellEditor
          value="=CONCAT([First Name], ' ', [Last Name])"
          column={formulaColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue("=CONCAT([First Name], ' ', [Last Name])");
      expect(input).toHaveAttribute('placeholder', '=FORMULA()');
      
      // Check formula help text
      expect(screen.getByText('Formula Help:')).toBeInTheDocument();
      expect(screen.getByText('• Use column names in brackets: [First Name]')).toBeInTheDocument();
      expect(screen.getByText('• Functions: CONCAT(), UPPER(), LOWER(), LENGTH()')).toBeInTheDocument();
    });

    it('shows action buttons for formula editor', () => {
      render(
        <CellEditor
          value="=FORMULA()"
          column={formulaColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Apply')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('handles apply button click', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="=FORMULA()"
          column={formulaColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('handles cancel button click', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="=FORMULA()"
          column={formulaColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Enrichment Editor', () => {
    const enrichmentColumn: ColumnDefinition = {
      id: 'companySize',
      key: 'companySize',
      name: 'Company Size',
      type: 'enrichment',
      width: 150,
      resizable: true,
      sortable: false,
      filterable: false
    };

    it('renders enrichment editor with enrich button', () => {
      mockFormatCellValue.mockReturnValue('100-500 employees');
      
      render(
        <CellEditor
          value="100-500 employees"
          column={enrichmentColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('100-500 employees')).toBeInTheDocument();
      expect(screen.getByText('Enrich')).toBeInTheDocument();
    });

    it('shows default text when no value', () => {
      render(
        <CellEditor
          value=""
          column={enrichmentColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Click to enrich')).toBeInTheDocument();
    });

    it('handles enrich button click', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(
        <CellEditor
          value=""
          column={enrichmentColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const enrichButton = screen.getByText('Enrich');
      await user.click(enrichButton);

      expect(consoleSpy).toHaveBeenCalledWith('Triggering enrichment for', 'lead-1', 'companySize');
      consoleSpy.mockRestore();
    });
  });

  describe('Validation and Error Handling', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('displays validation error tooltip', () => {
      const validationError: ValidationError = {
        field: 'firstName',
        message: 'First name is required',
        code: 'REQUIRED'
      };
      mockValidateCellValue.mockReturnValue(validationError);

      render(
        <CellEditor
          value=""
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    it('uses external validation error over internal validation', () => {
      const internalError: ValidationError = {
        field: 'firstName',
        message: 'Internal error',
        code: 'INTERNAL'
      };
      const externalError: ValidationError = {
        field: 'firstName',
        message: 'External error',
        code: 'EXTERNAL'
      };
      
      mockValidateCellValue.mockReturnValue(internalError);

      render(
        <CellEditor
          value=""
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
          validationError={externalError}
        />
      );

      expect(screen.getByText('External error')).toBeInTheDocument();
      expect(screen.queryByText('Internal error')).not.toBeInTheDocument();
    });

    it('prevents completion when validation fails', async () => {
      const validationError: ValidationError = {
        field: 'firstName',
        message: 'Invalid value',
        code: 'INVALID'
      };
      mockValidateCellValue.mockReturnValue(validationError);

      const user = userEvent.setup();
      render(
        <CellEditor
          value="invalid"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{Enter}');

      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('Click Outside Behavior', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('completes editing when clicking outside', async () => {
      render(
        <div>
          <CellEditor
            value="John"
            column={textColumn}
            lead={mockLead}
            onChange={mockOnChange}
            onComplete={mockOnComplete}
            onCancel={mockOnCancel}
          />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      const outsideElement = screen.getByTestId('outside');
      fireEvent.mouseDown(outsideElement);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      });
    });

    it('does not complete when clicking inside editor', async () => {
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.mouseDown(input);

      // Wait a bit to ensure no completion happens
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('Default/Fallback Editor', () => {
    const unknownColumn: ColumnDefinition = {
      id: 'unknown',
      key: 'unknown',
      name: 'Unknown',
      type: 'unknown' as any, // Unknown type to test fallback
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('falls back to text input for unknown column types', () => {
      render(
        <CellEditor
          value="test"
          column={unknownColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('placeholder', 'Unknown');
      expect(input).toHaveValue('test');
    });
  });

  describe('Accessibility', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('has proper ARIA attributes', () => {
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    it('supports keyboard navigation for boolean select', async () => {
      const booleanColumn: ColumnDefinition = {
        id: 'active',
        key: 'active',
        name: 'Active',
        type: 'boolean',
        width: 100,
        resizable: true,
        sortable: true,
        filterable: true
      };

      const user = userEvent.setup();
      render(
        <CellEditor
          value={null}
          column={booleanColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const select = screen.getByRole('combobox');
      await user.type(select, '{Enter}');

      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('applies custom className', () => {
      render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
          className="custom-class"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('applies validation error styling', () => {
      const validationError: ValidationError = {
        field: 'firstName',
        message: 'Error',
        code: 'ERROR'
      };
      mockValidateCellValue.mockReturnValue(validationError);

      render(
        <CellEditor
          value="invalid"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500', 'bg-red-50');
    });
  });

  describe('Performance Considerations', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Clear call count
      jest.clearAllMocks();

      // Re-render with same props
      rerender(
        <CellEditor
          value="John"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      // Validation should not be called again for same props
      expect(mockValidateCellValue).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    const textColumn: ColumnDefinition = {
      id: 'firstName',
      key: 'firstName',
      name: 'First Name',
      type: 'text',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true
    };

    it('handles undefined initial value', () => {
      render(
        <CellEditor
          value={undefined}
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles null initial value', () => {
      render(
        <CellEditor
          value={null}
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('allows Shift+Enter for multi-line text in text columns', async () => {
      const user = userEvent.setup();
      render(
        <CellEditor
          value="Line 1"
          column={textColumn}
          lead={mockLead}
          onChange={mockOnChange}
          onComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '{Shift>}{Enter}{/Shift}Line 2');

      // Should not complete on Shift+Enter for text type
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });
});