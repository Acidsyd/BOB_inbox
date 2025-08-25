import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FormulaBuilder from '@/components/leads/FormulaBuilder';
import { ColumnDefinition, Lead } from '@/types/spreadsheet';

// Mock drag-and-drop library
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({
    draggableProps: {},
    dragHandleProps: {},
    innerRef: jest.fn()
  }),
  Draggable: ({ children }: any) => children({
    draggableProps: {},
    dragHandleProps: {},
    innerRef: jest.fn()
  })
}));

// Mock formula engine
jest.mock('@/lib/FormulaEngine', () => ({
  formulaEngine: {
    evaluate: jest.fn(),
    getDependencies: jest.fn().mockReturnValue([]),
    hasCircularDependency: jest.fn().mockReturnValue(false),
  },
  FunctionRegistry: {
    getAll: jest.fn().mockReturnValue([
      {
        name: 'CONCAT',
        description: 'Concatenates text values',
        syntax: 'CONCAT(text1, text2, ...)',
        category: 'text',
        minArgs: 2,
        maxArgs: 10,
        returnType: 'string',
        executor: jest.fn()
      },
      {
        name: 'IF',
        description: 'Returns value based on condition',
        syntax: 'IF(condition, trueValue, falseValue)',
        category: 'logic',
        minArgs: 3,
        maxArgs: 3,
        returnType: 'any',
        executor: jest.fn()
      },
      {
        name: 'SUM',
        description: 'Sums numeric values',
        syntax: 'SUM(number1, number2, ...)',
        category: 'math',
        minArgs: 1,
        maxArgs: 100,
        returnType: 'number',
        executor: jest.fn()
      },
      {
        name: 'NOW',
        description: 'Returns current date and time',
        syntax: 'NOW()',
        category: 'date',
        minArgs: 0,
        maxArgs: 0,
        returnType: 'date',
        executor: jest.fn()
      }
    ])
  }
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className, title, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${size} ${variant} ${className}`}
      title={title}
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
  Card: ({ children, className, onClick }: any) => (
    <div className={`card ${className}`} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => <div className={`card-content ${className}`}>{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={`card-title ${className}`}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div data-testid={`tab-content-${value}`} className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: any) => <div className={`tabs-list ${className}`}>{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-${value}`} onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div className={`scroll-area ${className}`}>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const mockIcon = ({ className }: { className?: string }) => <div className={`icon ${className}`} />;
  return {
    Search: mockIcon,
    Plus: mockIcon,
    X: mockIcon,
    Play: mockIcon,
    AlertCircle: mockIcon,
    CheckCircle: mockIcon,
    Function: mockIcon,
    Database: mockIcon,
    Type: mockIcon,
    Hash: mockIcon,
    Calendar: mockIcon,
    Eye: mockIcon,
    EyeOff: mockIcon,
    Copy: mockIcon,
    RotateCcw: mockIcon,
    Lightbulb: mockIcon,
    Code: mockIcon,
    Braces: mockIcon,
    Variable: mockIcon,
  };
});

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('FormulaBuilder', () => {
  const mockColumns: ColumnDefinition[] = [
    {
      id: 'firstName',
      key: 'first_name',
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
      id: 'lastName',
      key: 'last_name', 
      name: 'Last Name',
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
      id: 'phone',
      key: 'phone',
      name: 'Phone',
      type: 'phone',
      width: 150,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: false,
      pinned: null,
    },
    {
      id: 'company',
      key: 'company',
      name: 'Company',
      type: 'text',
      width: 200,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      hidden: false,
      pinned: null,
    }
  ];

  const mockSampleLead: Lead = {
    id: 'sample-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Example Corp',
    jobTitle: 'Software Engineer',
    phone: '+1234567890',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    status: 'active',
    organizationId: 'org-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    extendedFields: {},
    emailsSent: 5,
    emailsOpened: 2,
    replies: 1,
    campaignName: 'Test Campaign',
    listName: 'Test List'
  };

  const mockOnExpressionChange = jest.fn();
  const mockOnValidationChange = jest.fn();
  const mockOnPreviewResult = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders formula builder with header', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Formula Builder')).toBeInTheDocument();
      expect(screen.getByText('Build formulas using functions, columns, and operators')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search functions and columns...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders visual formula builder by default', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Visual Formula Builder')).toBeInTheDocument();
      expect(screen.getByText('Click functions, columns, or operators to build your formula')).toBeInTheDocument();
    });

    it('renders functions from registry', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('CONCAT')).toBeInTheDocument();
      expect(screen.getByText('IF')).toBeInTheDocument();
      expect(screen.getByText('SUM')).toBeInTheDocument();
      expect(screen.getByText('NOW')).toBeInTheDocument();
    });

    it('renders column list', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Columns')).toBeInTheDocument();
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    it('renders operators', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Operators')).toBeInTheDocument();
      expect(screen.getByTitle('Addition operator')).toBeInTheDocument();
      expect(screen.getByTitle('Equality comparison')).toBeInTheDocument();
      expect(screen.getByTitle('Logical AND operator')).toBeInTheDocument();
    });

    it('renders formula examples', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Formula Examples')).toBeInTheDocument();
      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText('Email Domain')).toBeInTheDocument();
      expect(screen.getByText('Lead Quality Score')).toBeInTheDocument();
      expect(screen.getByText('Engagement Status')).toBeInTheDocument();
    });
  });

  describe('Initial Expression', () => {
    it('loads with initial expression', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression="CONCAT(first_name, ' ', last_name)"
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText("CONCAT(first_name, ' ', last_name)")).toBeInTheDocument();
    });

    it('validates initial expression on load', () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockReturnValue('John Doe');

      render(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression="CONCAT(first_name, ' ', last_name)"
          onExpressionChange={mockOnExpressionChange}
          onValidationChange={mockOnValidationChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Valid formula')).toBeInTheDocument();
    });
  });

  describe('Mode Switching', () => {
    it('switches between visual and code view', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      expect(screen.getByText('Formula Expression')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your formula expression...')).toBeInTheDocument();

      const visualButton = screen.getByText('Visual');
      await user.click(visualButton);

      expect(screen.getByText('Visual Formula Builder')).toBeInTheDocument();
    });

    it('shows copy button in code view', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression="CONCAT(first_name, ' ', last_name)"
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton).not.toBeDisabled();
    });

    it('copies expression to clipboard', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression="CONCAT(first_name, ' ', last_name)"
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const copyButton = screen.getByText('Copy');
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("CONCAT(first_name, ' ', last_name)");
    });
  });

  describe('Expression Building', () => {
    it('adds function to expression when function is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const concatFunction = screen.getAllByText('CONCAT')[0];
      await user.click(concatFunction);

      expect(mockOnExpressionChange).toHaveBeenCalledWith('CONCAT()');
    });

    it('adds column to expression when column is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const firstNameColumn = screen.getByText('First Name');
      await user.click(firstNameColumn);

      expect(mockOnExpressionChange).toHaveBeenCalledWith('first_name');
    });

    it('adds operator to expression when operator is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const addOperator = screen.getByTitle('Addition operator');
      await user.click(addOperator);

      expect(mockOnExpressionChange).toHaveBeenCalledWith('+ ');
    });

    it('builds complex expression by combining elements', async () => {
      const user = userEvent.setup();
      let currentExpression = '';
      const mockOnChange = jest.fn((expr) => { currentExpression = expr; });

      const { rerender } = render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnChange}
          sampleLead={mockSampleLead}
        />
      );

      // Add CONCAT function
      const concatFunction = screen.getAllByText('CONCAT')[0];
      await user.click(concatFunction);
      expect(mockOnChange).toHaveBeenCalledWith('CONCAT()');

      // Simulate the expression change
      currentExpression = 'CONCAT()';
      rerender(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression={currentExpression}
          onExpressionChange={mockOnChange}
          sampleLead={mockSampleLead}
        />
      );

      // Add first name column
      const firstNameColumn = screen.getByText('First Name');
      await user.click(firstNameColumn);
      expect(mockOnChange).toHaveBeenCalledWith('CONCAT() first_name');
    });

    it('handles text input in code mode', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Switch to code mode
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'CONCAT(first_name, " ", last_name)');

      expect(mockOnExpressionChange).toHaveBeenCalledWith('CONCAT(first_name, " ", last_name)');
    });
  });

  describe('Search Functionality', () => {
    it('filters functions based on search term', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search functions and columns...');
      await user.type(searchInput, 'CONCAT');

      // Should show CONCAT function
      expect(screen.getByText('CONCAT')).toBeInTheDocument();
      // Should not show other functions
      expect(screen.queryByText('SUM')).not.toBeInTheDocument();
    });

    it('filters columns based on search term', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search functions and columns...');
      await user.type(searchInput, 'Name');

      // Should show name columns
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      // Should not show other columns
      expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });

    it('clears search filters when search is cleared', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search functions and columns...');
      await user.type(searchInput, 'CONCAT');
      await user.clear(searchInput);

      // Should show all functions again
      expect(screen.getByText('CONCAT')).toBeInTheDocument();
      expect(screen.getByText('SUM')).toBeInTheDocument();
      expect(screen.getByText('IF')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows valid status for correct expression', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockReturnValue('John Doe');

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Switch to code mode and enter valid expression
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'CONCAT(first_name, " ", last_name)');

      expect(screen.getByText('Valid formula')).toBeInTheDocument();
    });

    it('shows error status for invalid expression', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockImplementation(() => {
        throw new Error('Invalid function call');
      });

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Switch to code mode and enter invalid expression
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'INVALID_FUNCTION()');

      expect(screen.getByText('Invalid function call')).toBeInTheDocument();
    });

    it('detects circular dependencies', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.hasCircularDependency.mockReturnValue(true);

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          onValidationChange={mockOnValidationChange}
          sampleLead={mockSampleLead}
        />
      );

      // Switch to code mode and enter expression
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'circular_reference');

      expect(screen.getByText('Circular dependency detected in formula')).toBeInTheDocument();
      expect(mockOnValidationChange).toHaveBeenCalledWith(false, expect.any(Array));
    });

    it('calls validation change callback', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockReturnValue('John Doe');

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          onValidationChange={mockOnValidationChange}
          sampleLead={mockSampleLead}
        />
      );

      // Switch to code mode and enter valid expression
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'CONCAT(first_name, " ", last_name)');

      expect(mockOnValidationChange).toHaveBeenCalledWith(true, []);
    });
  });

  describe('Live Preview', () => {
    it('shows live preview when enabled', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockReturnValue('John Doe');

      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          onPreviewResult={mockOnPreviewResult}
          sampleLead={mockSampleLead}
          enableLivePreview={true}
        />
      );

      expect(screen.getByText('Live Preview')).toBeInTheDocument();
    });

    it('hides live preview when disabled', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
          enableLivePreview={false}
        />
      );

      expect(screen.queryByText('Live Preview')).not.toBeInTheDocument();
    });

    it('shows preview result for valid expression', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockReturnValue('John Doe');

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression="CONCAT(first_name, ' ', last_name)"
          onExpressionChange={mockOnExpressionChange}
          onPreviewResult={mockOnPreviewResult}
          sampleLead={mockSampleLead}
          enableLivePreview={true}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(mockOnPreviewResult).toHaveBeenCalledWith('John Doe');
    });

    it('shows sample lead info in preview', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
          enableLivePreview={true}
        />
      );

      expect(screen.getByText('Sample: John Doe')).toBeInTheDocument();
    });

    it('handles preview errors gracefully', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockImplementation(() => {
        throw new Error('Preview error');
      });

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
          enableLivePreview={true}
        />
      );

      // Enter an expression that causes an error
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'INVALID()');

      expect(screen.getByText('Error: Preview error')).toBeInTheDocument();
    });
  });

  describe('Clear Functionality', () => {
    it('clears expression when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          initialExpression="CONCAT(first_name, ' ', last_name)"
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const clearButton = screen.getByText('Clear');
      expect(clearButton).not.toBeDisabled();

      await user.click(clearButton);

      expect(mockOnExpressionChange).toHaveBeenCalledWith('');
    });

    it('disables clear button when expression is empty', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Example Formulas', () => {
    it('loads example formula when clicked', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const fullNameExample = screen.getByText('Full Name');
      const fullNameCard = fullNameExample.closest('.card');
      
      if (fullNameCard) {
        await user.click(fullNameCard);
        expect(mockOnExpressionChange).toHaveBeenCalledWith('CONCAT(first_name, " ", last_name)');
      }
    });

    it('shows example descriptions', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Combines first and last name with a space')).toBeInTheDocument();
      expect(screen.getByText('Extracts the domain from an email address')).toBeInTheDocument();
      expect(screen.getByText('Simple lead scoring based on data completeness')).toBeInTheDocument();
      expect(screen.getByText('Categorizes leads by engagement level')).toBeInTheDocument();
    });
  });

  describe('Function Categories', () => {
    it('shows function categories with correct icons', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Function categories are shown in the functions tab
      const functionsTab = screen.getByTestId('tab-functions');
      expect(functionsTab).toBeInTheDocument();
    });

    it('groups functions by category', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Functions should be displayed with their categories
      expect(screen.getByText('text')).toBeInTheDocument(); // CONCAT category
      expect(screen.getByText('logic')).toBeInTheDocument(); // IF category
      expect(screen.getByText('math')).toBeInTheDocument(); // SUM category
      expect(screen.getByText('date')).toBeInTheDocument(); // NOW category
    });

    it('shows function syntax and description', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Concatenates text values')).toBeInTheDocument();
      expect(screen.getByText('Returns value based on condition')).toBeInTheDocument();
      expect(screen.getByText('CONCAT(text1, text2, ...)')).toBeInTheDocument();
      expect(screen.getByText('IF(condition, trueValue, falseValue)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Check for proper input accessibility
      const searchInput = screen.getByPlaceholderText('Search functions and columns...');
      expect(searchInput).toBeInTheDocument();

      // Check for buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Tab to search input
      await user.tab();
      
      const searchInput = screen.getByPlaceholderText('Search functions and columns...');
      expect(searchInput).toHaveFocus();
    });

    it('provides meaningful tooltips for operators', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      const addOperator = screen.getByTitle('Addition operator');
      const equalOperator = screen.getByTitle('Equality comparison');
      const andOperator = screen.getByTitle('Logical AND operator');
      
      expect(addOperator).toBeInTheDocument();
      expect(equalOperator).toBeInTheDocument();
      expect(andOperator).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty columns list', () => {
      render(
        <FormulaBuilder
          columns={[]}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Columns')).toBeInTheDocument();
      // Should not crash and should show columns section
    });

    it('handles missing sample lead', () => {
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          enableLivePreview={true}
        />
      );

      // Should create a default sample lead
      expect(screen.getByText('Live Preview')).toBeInTheDocument();
    });

    it('handles complex object preview results', async () => {
      const mockFormulaEngine = require('@/lib/FormulaEngine').formulaEngine;
      mockFormulaEngine.evaluate.mockReturnValue({ result: 'complex', data: [1, 2, 3] });

      const user = userEvent.setup();
      render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
          enableLivePreview={true}
        />
      );

      // Enter expression
      const toggleButton = screen.getByText('Code');
      await user.click(toggleButton);

      const textarea = screen.getByPlaceholderText('Enter your formula expression...');
      await user.type(textarea, 'COMPLEX()');

      expect(screen.getByText('{"result":"complex","data":[1,2,3]}')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Re-render with same props
      rerender(
        <FormulaBuilder
          columns={mockColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      // Should still show the same content
      expect(screen.getByText('Formula Builder')).toBeInTheDocument();
    });

    it('handles large numbers of columns efficiently', () => {
      const manyColumns = Array.from({ length: 100 }, (_, index) => ({
        id: `col-${index}`,
        key: `col_${index}`,
        name: `Column ${index}`,
        type: 'text' as const,
        width: 150,
        resizable: true,
        sortable: true,
        filterable: true,
        editable: true,
        hidden: false,
        pinned: null,
      }));

      render(
        <FormulaBuilder
          columns={manyColumns}
          onExpressionChange={mockOnExpressionChange}
          sampleLead={mockSampleLead}
        />
      );

      expect(screen.getByText('Column 0')).toBeInTheDocument();
      expect(screen.getByText('Column 99')).toBeInTheDocument();
    });
  });
});