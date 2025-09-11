'use client';

/**
 * Visual Formula Builder Component
 * Provides drag-and-drop interface for building formulas with live preview
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  formulaEngine, 
  FunctionRegistry, 
  FunctionDefinition, 
  FormulaError,
  FormulaContext 
} from '../lib/FormulaEngine';
import { Lead, ColumnDefinition } from '../types/spreadsheet';
import { cn } from '../lib/utils';

// Icons
import {
  Search,
  Plus,
  X,
  Play,
  AlertCircle,
  CheckCircle,
  Calculator,
  Database,
  Type,
  Hash,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Lightbulb,
  Code,
  Braces,
  Variable
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';

interface FormulaBuilderProps {
  columns: ColumnDefinition[];
  initialExpression?: string;
  sampleLead?: Lead;
  onExpressionChange: (expression: string) => void;
  onValidationChange?: (isValid: boolean, errors: FormulaError[]) => void;
  onPreviewResult?: (result: any) => void;
  enableLivePreview?: boolean;
  className?: string;
}

interface FunctionGroup {
  category: string;
  icon: React.ComponentType;
  functions: FunctionDefinition[];
}

interface FormulaToken {
  id: string;
  type: 'function' | 'column' | 'operator' | 'literal' | 'parenthesis';
  value: string;
  displayValue: string;
  description?: string;
  category?: string;
}

const OPERATORS = [
  { symbol: '+', name: 'Add', description: 'Addition operator' },
  { symbol: '-', name: 'Subtract', description: 'Subtraction operator' },
  { symbol: '*', name: 'Multiply', description: 'Multiplication operator' },
  { symbol: '/', name: 'Divide', description: 'Division operator' },
  { symbol: '=', name: 'Equals', description: 'Equality comparison' },
  { symbol: '!=', name: 'Not Equals', description: 'Inequality comparison' },
  { symbol: '<', name: 'Less Than', description: 'Less than comparison' },
  { symbol: '>', name: 'Greater Than', description: 'Greater than comparison' },
  { symbol: '<=', name: 'Less or Equal', description: 'Less than or equal comparison' },
  { symbol: '>=', name: 'Greater or Equal', description: 'Greater than or equal comparison' },
  { symbol: 'AND', name: 'And', description: 'Logical AND operator' },
  { symbol: 'OR', name: 'Or', description: 'Logical OR operator' },
  { symbol: 'NOT', name: 'Not', description: 'Logical NOT operator' }
];

const CATEGORY_ICONS = {
  text: Type,
  math: Hash,
  logic: Calculator,
  date: Calendar,
  lookup: Database,
  validation: CheckCircle,
  custom: Lightbulb
};

const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  columns,
  initialExpression = '',
  sampleLead,
  onExpressionChange,
  onValidationChange,
  onPreviewResult,
  enableLivePreview = true,
  className
}) => {
  const [expression, setExpression] = useState(initialExpression);
  const [tokens, setTokens] = useState<FormulaToken[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [validationErrors, setValidationErrors] = useState<FormulaError[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [showRawExpression, setShowRawExpression] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);

  // Get function groups
  const functionGroups: FunctionGroup[] = useMemo(() => {
    const allFunctions = FunctionRegistry.getAll();
    const groupedFunctions = allFunctions.reduce((groups, func) => {
      const category = func.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(func);
      return groups;
    }, {} as Record<string, FunctionDefinition[]>);

    return Object.entries(groupedFunctions).map(([category, functions]) => ({
      category,
      icon: CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Calculator,
      functions: functions.sort((a, b) => a.name.localeCompare(b.name))
    }));
  }, []);

  // Filter functions based on search and category
  const filteredFunctions = useMemo(() => {
    let functions = FunctionRegistry.getAll();
    
    if (selectedCategory !== 'all') {
      functions = functions.filter(f => f.category === selectedCategory);
    }
    
    if (searchTerm) {
      functions = functions.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return functions;
  }, [searchTerm, selectedCategory]);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return columns;
    
    return columns.filter(col => 
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [columns, searchTerm]);

  // Validate expression
  const validateExpression = useCallback((expr: string) => {
    if (!expr.trim()) {
      setIsValid(true);
      setValidationErrors([]);
      return true;
    }

    try {
      // Check for circular dependencies
      const dependencies = formulaEngine.getDependencies(expr);
      const hasCircular = formulaEngine.hasCircularDependency('temp', expr, columns);
      
      if (hasCircular) {
        const error: FormulaError = {
          type: 'circular',
          message: 'Circular dependency detected in formula'
        };
        setValidationErrors([error]);
        setIsValid(false);
        return false;
      }

      // Try parsing the expression
      formulaEngine.evaluate(expr, {
        lead: sampleLead || createSampleLead(),
        columns,
        allLeads: []
      });

      setValidationErrors([]);
      setIsValid(true);
      return true;
    } catch (error) {
      const formulaError = error as FormulaError;
      setValidationErrors([formulaError]);
      setIsValid(false);
      return false;
    }
  }, [columns, sampleLead]);

  // Preview expression result
  const previewExpression = useCallback((expr: string) => {
    if (!expr.trim() || !enableLivePreview) {
      setPreviewResult(null);
      return;
    }

    try {
      const result = formulaEngine.evaluate(expr, {
        lead: sampleLead || createSampleLead(),
        columns,
        allLeads: []
      });
      
      setPreviewResult(result);
      onPreviewResult?.(result);
    } catch (error) {
      setPreviewResult('Error: ' + (error as Error).message);
    }
  }, [enableLivePreview, sampleLead, columns, onPreviewResult]);

  // Handle expression change
  const handleExpressionChange = useCallback((newExpression: string) => {
    setExpression(newExpression);
    onExpressionChange(newExpression);
    
    const isValidExpression = validateExpression(newExpression);
    onValidationChange?.(isValidExpression, validationErrors);
    
    if (isValidExpression) {
      previewExpression(newExpression);
    }
  }, [onExpressionChange, validateExpression, onValidationChange, validationErrors, previewExpression]);

  // Add function to expression
  const addFunction = useCallback((func: FunctionDefinition) => {
    const functionCall = `${func.name}()`;
    const newExpression = expression + (expression ? ' ' : '') + functionCall;
    handleExpressionChange(newExpression);
  }, [expression, handleExpressionChange]);

  // Add column to expression
  const addColumn = useCallback((column: ColumnDefinition) => {
    const columnRef = column.key;
    const newExpression = expression + (expression ? ' ' : '') + columnRef;
    handleExpressionChange(newExpression);
  }, [expression, handleExpressionChange]);

  // Add operator to expression
  const addOperator = useCallback((operator: string) => {
    const newExpression = expression + (expression ? ' ' : '') + operator + ' ';
    handleExpressionChange(newExpression);
  }, [expression, handleExpressionChange]);

  // Clear expression
  const clearExpression = useCallback(() => {
    handleExpressionChange('');
  }, [handleExpressionChange]);

  // Create sample lead for preview
  const createSampleLead = (): Lead => ({
    id: 'sample-lead',
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
  });

  // Initialize with initial expression
  useEffect(() => {
    if (initialExpression) {
      validateExpression(initialExpression);
      previewExpression(initialExpression);
    }
  }, [initialExpression, validateExpression, previewExpression]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">Formula Builder</h3>
          <p className="text-sm text-gray-600">
            Build formulas using functions, columns, and operators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRawExpression(!showRawExpression)}
          >
            {showRawExpression ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showRawExpression ? 'Visual' : 'Code'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearExpression}
            disabled={!expression}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Function Library */}
        <div className="w-80 border-r flex flex-col">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search functions and columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
            <TabsList className="grid grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="functions">Functions</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                {/* Functions */}
                <div className="p-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Calculator className="h-4 w-4 mr-2" />
                    Functions
                  </h4>
                  <div className="space-y-2">
                    {filteredFunctions.map((func) => (
                      <Button
                        key={func.name}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-auto p-2"
                        onClick={() => addFunction(func)}
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="flex items-center w-full">
                            <Badge variant="secondary" className="text-xs mr-2">
                              {func.name}
                            </Badge>
                            <span className="text-xs text-gray-500 ml-auto">
                              {func.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 text-left">
                            {func.description}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Columns */}
                <div className="p-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Columns
                  </h4>
                  <div className="space-y-1">
                    {filteredColumns.map((column) => (
                      <Button
                        key={column.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => addColumn(column)}
                      >
                        <div className="flex items-center w-full">
                          <Badge variant="outline" className="text-xs mr-2">
                            {column.type}
                          </Badge>
                          <span className="text-sm">{column.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Operators */}
                <div className="p-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Variable className="h-4 w-4 mr-2" />
                    Operators
                  </h4>
                  <div className="grid grid-cols-3 gap-1">
                    {OPERATORS.map((op) => (
                      <Button
                        key={op.symbol}
                        variant="outline"
                        size="sm"
                        onClick={() => addOperator(op.symbol)}
                        title={op.description}
                      >
                        {op.symbol}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="functions" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {functionGroups.map((group) => (
                    <div key={group.category} className="mb-6">
                      <h4 className="font-medium mb-3 flex items-center">
                        <group.icon className="h-4 w-4 mr-2" />
                        {group.category.charAt(0).toUpperCase() + group.category.slice(1)}
                      </h4>
                      <div className="space-y-2">
                        {group.functions.map((func) => (
                          <Card key={func.name} className="cursor-pointer hover:bg-gray-50" onClick={() => addFunction(func)}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-1">
                                    <Badge className="text-xs mr-2">{func.name}</Badge>
                                    <span className="text-xs text-gray-500">
                                      {func.minArgs === func.maxArgs 
                                        ? `${func.minArgs} args`
                                        : `${func.minArgs}-${func.maxArgs} args`
                                      }
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mb-2">
                                    {func.description}
                                  </p>
                                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                    {func.syntax}
                                  </code>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Expression Builder */}
        <div className="flex-1 flex flex-col">
          {/* Expression Input */}
          <div className="p-4 border-b">
            {showRawExpression ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Formula Expression</label>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(expression)}
                      disabled={!expression}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
                <textarea
                  value={expression}
                  onChange={(e) => handleExpressionChange(e.target.value)}
                  placeholder="Enter your formula expression..."
                  className="w-full h-24 p-3 border rounded-md font-mono text-sm resize-none"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Visual Formula Builder</label>
                <div className="min-h-24 p-3 border rounded-md bg-gray-50 font-mono text-sm">
                  {expression || (
                    <span className="text-gray-400">
                      Click functions, columns, or operators to build your formula
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Validation Status */}
            <div className="mt-3 flex items-center gap-2">
              {validationErrors.length > 0 ? (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {validationErrors[0].message}
                  </span>
                </div>
              ) : expression ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Valid formula</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <Code className="h-4 w-4 mr-1" />
                  <span className="text-sm">Enter a formula to validate</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {enableLivePreview && (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Live Preview</label>
                {sampleLead && (
                  <Badge variant="secondary" className="text-xs">
                    Sample: {sampleLead.firstName} {sampleLead.lastName}
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-white border rounded-md">
                {previewResult !== null ? (
                  <div className="flex items-center">
                    <Play className="h-4 w-4 mr-2 text-green-600" />
                    <span className="font-mono text-sm">
                      {typeof previewResult === 'object' 
                        ? JSON.stringify(previewResult)
                        : String(previewResult)
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-400">
                    <Eye className="h-4 w-4 mr-2" />
                    <span className="text-sm">Preview will appear here</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help and Examples */}
          <div className="flex-1 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Formula Examples
                  </h4>
                  <div className="space-y-2">
                    {[
                      {
                        name: 'Full Name',
                        formula: 'CONCAT(first_name, " ", last_name)',
                        description: 'Combines first and last name with a space'
                      },
                      {
                        name: 'Email Domain',
                        formula: 'RIGHT(email, LEN(email) - FIND("@", email))',
                        description: 'Extracts the domain from an email address'
                      },
                      {
                        name: 'Lead Quality Score',
                        formula: 'IF(ISBLANK(phone), 50, 100) + IF(ISBLANK(company), 0, 25)',
                        description: 'Simple lead scoring based on data completeness'
                      },
                      {
                        name: 'Engagement Status',
                        formula: 'IF(emails_opened > 0, "Engaged", IF(emails_sent > 0, "Contacted", "New"))',
                        description: 'Categorizes leads by engagement level'
                      }
                    ].map((example, index) => (
                      <Card key={index} className="cursor-pointer hover:bg-gray-50" onClick={() => handleExpressionChange(example.formula)}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm mb-1">{example.name}</h5>
                              <p className="text-xs text-gray-600 mb-2">{example.description}</p>
                              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded block">
                                {example.formula}
                              </code>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormulaBuilder;