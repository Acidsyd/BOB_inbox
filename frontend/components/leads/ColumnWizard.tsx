'use client';

/**
 * Column Wizard Component
 * Step-by-step guide for creating and configuring advanced columns
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ColumnDefinition, ColumnType, Lead } from '../types/spreadsheet';
import { cn } from '../lib/utils';
import ColumnTemplatesLibrary, { ColumnTemplate } from '../lib/ColumnTemplates';
import { columnValidator } from '../lib/ColumnValidator';
import FormulaBuilder from './FormulaBuilder';
import EnrichmentColumn from './columns/EnrichmentColumn';
import AIColumn from './columns/AIColumn';
import LookupColumn from './columns/LookupColumn';

// Icons
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Brain,
  Database,
  Calculator,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  Mail,
  Phone,
  Globe,
  Tag,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Lightbulb
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

// Wizard Types
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isSkippable: boolean;
}

export interface ColumnWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: ColumnDefinition) => void;
  existingColumns: ColumnDefinition[];
  sampleLeads: Lead[];
  initialColumn?: ColumnDefinition;
  className?: string;
}

// Column Type Configurations
const COLUMN_TYPE_CONFIG = {
  text: { icon: Type, name: 'Text', description: 'Simple text values' },
  email: { icon: Mail, name: 'Email', description: 'Email addresses with validation' },
  phone: { icon: Phone, name: 'Phone', description: 'Phone numbers with formatting' },
  number: { icon: Hash, name: 'Number', description: 'Numeric values with calculations' },
  date: { icon: Calendar, name: 'Date', description: 'Date and time values' },
  boolean: { icon: ToggleLeft, name: 'Boolean', description: 'True/false values' },
  select: { icon: Tag, name: 'Select', description: 'Dropdown with predefined options' },
  url: { icon: Globe, name: 'URL', description: 'Web addresses with validation' },
  formula: { icon: Calculator, name: 'Formula', description: 'Calculated values using expressions' },
  enrichment: { icon: Zap, name: 'Enrichment', description: 'Data from external APIs' },
  ai: { icon: Brain, name: 'AI Analysis', description: 'AI-powered insights and scoring' },
  lookup: { icon: Database, name: 'Lookup', description: 'Reference data from external sources' }
};

const ColumnWizard: React.FC<ColumnWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  existingColumns,
  sampleLeads,
  initialColumn,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [column, setColumn] = useState<Partial<ColumnDefinition>>(
    initialColumn || {
      key: '',
      name: '',
      type: 'text',
      width: 150,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      editable: true,
      required: false,
      hidden: false
    }
  );
  const [selectedTemplate, setSelectedTemplate] = useState<ColumnTemplate | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewValue, setPreviewValue] = useState<any>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // Wizard steps
  const steps: WizardStep[] = [
    {
      id: 'type',
      title: 'Choose Type',
      description: 'Select the type of column you want to create',
      isComplete: !!column.type,
      isSkippable: false
    },
    {
      id: 'template',
      title: 'Template',
      description: 'Use a pre-built template or start from scratch',
      isComplete: selectedTemplate !== null || currentStep > 1,
      isSkippable: true
    },
    {
      id: 'basic',
      title: 'Basic Settings',
      description: 'Configure column name and basic properties',
      isComplete: !!(column.name && column.key),
      isSkippable: false
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Configure type-specific settings and validation',
      isComplete: true, // Always complete as it's optional
      isSkippable: true
    },
    {
      id: 'preview',
      title: 'Preview',
      description: 'Test your column with sample data',
      isComplete: true,
      isSkippable: true
    }
  ];

  // Calculate progress
  const progress = ((currentStep + 1) / steps.length) * 100;
  const completedSteps = steps.filter(step => step.isComplete).length;

  // Filter templates by selected type
  const availableTemplates = useMemo(() => {
    if (!column.type) return [];
    return ColumnTemplatesLibrary.getAll()
      .filter(template => 
        template.columns.some(col => col.type === column.type)
      )
      .sort((a, b) => b.popularity - a.popularity);
  }, [column.type]);

  // Validate current column configuration
  useEffect(() => {
    const errors: string[] = [];

    if (currentStep >= 2) {
      if (!column.name?.trim()) {
        errors.push('Column name is required');
      }
      if (!column.key?.trim()) {
        errors.push('Column key is required');
      }
      if (column.key && existingColumns.some(col => col.key === column.key && col.id !== initialColumn?.id)) {
        errors.push('Column key must be unique');
      }
    }

    if (column.type === 'select' && (!column.selectOptions || column.selectOptions.length === 0)) {
      errors.push('Select columns must have at least one option');
    }

    if (column.type === 'formula' && !column.formula?.expression?.trim()) {
      errors.push('Formula columns must have an expression');
    }

    setValidationErrors(errors);
  }, [column, existingColumns, currentStep, initialColumn]);

  // Generate preview value
  useEffect(() => {
    if (currentStep === 4 && sampleLeads.length > 0) {
      const lead = sampleLeads[0];
      
      switch (column.type) {
        case 'formula':
          if (column.formula?.expression) {
            try {
              // This would use the FormulaEngine in a real implementation
              setPreviewValue('Sample calculated value');
            } catch (error) {
              setPreviewValue('Error: Invalid formula');
            }
          }
          break;
        case 'enrichment':
          setPreviewValue('Sample enriched data');
          break;
        case 'ai':
          setPreviewValue('AI-generated insight');
          break;
        case 'lookup':
          setPreviewValue('Looked up value');
          break;
        default:
          setPreviewValue(`Sample ${column.type} value`);
      }
    }
  }, [currentStep, column, sampleLeads]);

  // Handle column updates
  const updateColumn = (updates: Partial<ColumnDefinition>) => {
    setColumn(prev => ({ ...prev, ...updates }));
  };

  // Handle template selection
  const applyTemplate = (template: ColumnTemplate) => {
    if (template.columns.length > 0) {
      const templateColumn = template.columns.find(col => col.type === column.type) || template.columns[0];
      updateColumn({
        ...templateColumn,
        id: column.id,
        key: column.key || templateColumn.key,
        name: column.name || templateColumn.name
      });
      setSelectedTemplate(template);
    }
  };

  // Navigation handlers
  const goToStep = (stepIndex: number) => {
    setCurrentStep(Math.max(0, Math.min(stepIndex, steps.length - 1)));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Generate unique key from name
  const generateKeyFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Handle name change
  const handleNameChange = (name: string) => {
    updateColumn({ 
      name,
      key: column.key || generateKeyFromName(name)
    });
  };

  // Save column
  const handleSave = () => {
    if (validationErrors.length === 0 && column.name && column.key && column.type) {
      const finalColumn: ColumnDefinition = {
        id: initialColumn?.id || `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        key: column.key,
        name: column.name,
        type: column.type as ColumnType,
        width: column.width || 150,
        minWidth: column.minWidth || 100,
        maxWidth: column.maxWidth,
        resizable: column.resizable !== false,
        sortable: column.sortable !== false,
        filterable: column.filterable !== false,
        editable: column.editable !== false,
        required: column.required || false,
        hidden: column.hidden || false,
        pinned: column.pinned,
        validation: column.validation,
        formatting: column.formatting,
        selectOptions: column.selectOptions,
        formula: column.formula,
        enrichment: column.enrichment
      };

      onSave(finalColumn);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={cn("bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col", className)}>
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">
                {initialColumn ? 'Edit Column' : 'Create New Column'}
              </h2>
              <p className="text-gray-600">
                {steps[currentStep].description}
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{completedSteps}/{steps.length} completed</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Steps */}
          <div className="flex items-center mt-4 space-x-2 overflow-x-auto">
            {steps.map((step, index) => (
              <Button
                key={step.id}
                variant={currentStep === index ? 'default' : step.isComplete ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => goToStep(index)}
                className="flex items-center space-x-2 whitespace-nowrap"
                disabled={index > currentStep && !step.isSkippable}
              >
                {step.isComplete ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2" />
                )}
                <span>{step.title}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {/* Step 0: Choose Type */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Column Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(COLUMN_TYPE_CONFIG).map(([type, config]) => (
                    <Card
                      key={type}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        column.type === type && "ring-2 ring-blue-500 bg-blue-50"
                      )}
                      onClick={() => updateColumn({ type: type as ColumnType })}
                    >
                      <CardContent className="p-4 text-center">
                        <config.icon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <h4 className="font-medium">{config.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Advanced Types Info */}
              {column.type && ['formula', 'enrichment', 'ai', 'lookup'].includes(column.type) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Advanced Column Type</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {column.type === 'formula' && 'This column will calculate values using custom formulas and functions.'}
                          {column.type === 'enrichment' && 'This column will fetch data from external APIs to enrich your leads.'}
                          {column.type === 'ai' && 'This column will use AI to analyze and score your lead data.'}
                          {column.type === 'lookup' && 'This column will look up values from external data sources.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose a Template</h3>
                <p className="text-gray-600 mb-4">
                  Start with a pre-built template or create a custom column from scratch.
                </p>
              </div>

              <Tabs defaultValue="templates">
                <TabsList>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="scratch">From Scratch</TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-4">
                  {availableTemplates.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-semibold mb-2">No Templates Available</h3>
                        <p className="text-gray-600">
                          No templates available for {COLUMN_TYPE_CONFIG[column.type as keyof typeof COLUMN_TYPE_CONFIG]?.name} columns.
                        </p>
                        <Button className="mt-4" onClick={() => nextStep()}>
                          Create from Scratch
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {availableTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedTemplate?.id === template.id && "ring-2 ring-blue-500 bg-blue-50"
                          )}
                          onClick={() => applyTemplate(template)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className="text-2xl">{template.icon}</div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-semibold">{template.name}</h4>
                                    <Badge variant="outline">{template.category}</Badge>
                                    {template.popularity > 80 && (
                                      <Badge variant="default">
                                        <Star className="h-3 w-3 mr-1" />
                                        Popular
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {template.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500">
                                  {template.columns.length} column{template.columns.length > 1 ? 's' : ''}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {template.popularity}% match
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="scratch">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="font-semibold mb-2">Create Custom Column</h3>
                      <p className="text-gray-600 mb-4">
                        Build a custom {COLUMN_TYPE_CONFIG[column.type as keyof typeof COLUMN_TYPE_CONFIG]?.name} column from scratch.
                      </p>
                      <Button onClick={() => nextStep()}>
                        Continue
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Step 2: Basic Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Configuration</h3>
                <p className="text-gray-600 mb-4">
                  Configure the basic properties of your column.
                </p>
              </div>

              <div className="grid gap-6">
                {/* Name and Key */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Column Name *</Label>
                    <Input
                      id="name"
                      value={column.name || ''}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Enter column name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="key">Column Key *</Label>
                    <Input
                      id="key"
                      value={column.key || ''}
                      onChange={(e) => updateColumn({ key: e.target.value })}
                      placeholder="column_key"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Unique identifier for this column (auto-generated from name)
                    </p>
                  </div>
                </div>

                {/* Width Settings */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="width">Width (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={column.width || 150}
                      onChange={(e) => updateColumn({ width: parseInt(e.target.value) })}
                      min={50}
                      max={500}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minWidth">Min Width (px)</Label>
                    <Input
                      id="minWidth"
                      type="number"
                      value={column.minWidth || 100}
                      onChange={(e) => updateColumn({ minWidth: parseInt(e.target.value) })}
                      min={50}
                      max={300}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxWidth">Max Width (px)</Label>
                    <Input
                      id="maxWidth"
                      type="number"
                      value={column.maxWidth || ''}
                      onChange={(e) => updateColumn({ 
                        maxWidth: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      min={100}
                      max={1000}
                      placeholder="No limit"
                    />
                  </div>
                </div>

                {/* Basic Properties */}
                <div className="space-y-4">
                  <h4 className="font-medium">Column Properties</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Sortable</Label>
                        <p className="text-xs text-gray-500">Allow sorting by this column</p>
                      </div>
                      <Switch
                        checked={column.sortable !== false}
                        onCheckedChange={(checked) => updateColumn({ sortable: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Filterable</Label>
                        <p className="text-xs text-gray-500">Allow filtering by this column</p>
                      </div>
                      <Switch
                        checked={column.filterable !== false}
                        onCheckedChange={(checked) => updateColumn({ filterable: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Editable</Label>
                        <p className="text-xs text-gray-500">Allow editing cell values</p>
                      </div>
                      <Switch
                        checked={column.editable !== false}
                        onCheckedChange={(checked) => updateColumn({ editable: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Resizable</Label>
                        <p className="text-xs text-gray-500">Allow resizing column width</p>
                      </div>
                      <Switch
                        checked={column.resizable !== false}
                        onCheckedChange={(checked) => updateColumn({ resizable: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Required</Label>
                        <p className="text-xs text-gray-500">Field is required</p>
                      </div>
                      <Switch
                        checked={column.required || false}
                        onCheckedChange={(checked) => updateColumn({ required: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Hidden by Default</Label>
                        <p className="text-xs text-gray-500">Start with column hidden</p>
                      </div>
                      <Switch
                        checked={column.hidden || false}
                        onCheckedChange={(checked) => updateColumn({ hidden: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Column Pinning */}
                <div>
                  <Label>Column Pinning</Label>
                  <Select 
                    value={column.pinned || 'none'} 
                    onValueChange={(value) => updateColumn({ 
                      pinned: value === 'none' ? null : value as 'left' | 'right' 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not pinned</SelectItem>
                      <SelectItem value="left">Pin left</SelectItem>
                      <SelectItem value="right">Pin right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Advanced Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Advanced Configuration</h3>
                  <p className="text-gray-600">
                    Configure type-specific settings and validation rules.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                >
                  {isAdvancedMode ? 'Simple Mode' : 'Advanced Mode'}
                </Button>
              </div>

              {/* Type-specific configuration */}
              {column.type === 'formula' && (
                <FormulaBuilder
                  columns={existingColumns}
                  initialExpression={column.formula?.expression || ''}
                  sampleLead={sampleLeads[0]}
                  onExpressionChange={(expression) => 
                    updateColumn({ 
                      formula: { ...column.formula, expression, dependencies: [], resultType: 'text' } 
                    })
                  }
                  enableLivePreview={true}
                />
              )}

              {column.type === 'enrichment' && (
                <EnrichmentColumn
                  column={{ ...column } as ColumnDefinition}
                  leads={sampleLeads}
                  selectedLeadIds={[]}
                  onConfigUpdate={(config) => updateColumn({ enrichment: config })}
                  onEnrichmentStart={() => {}}
                  onEnrichmentStop={() => {}}
                  enrichmentJobs={[]}
                  dataSources={[]}
                  onCreateDataSource={() => {}}
                  onUpdateDataSource={() => {}}
                />
              )}

              {/* Select Options */}
              {column.type === 'select' && (
                <div className="space-y-4">
                  <Label>Select Options</Label>
                  <div className="space-y-2">
                    {(column.selectOptions || []).map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={option.value}
                          onChange={(e) => {
                            const newOptions = [...(column.selectOptions || [])];
                            newOptions[index] = { ...option, value: e.target.value };
                            updateColumn({ selectOptions: newOptions });
                          }}
                          placeholder="Option value"
                        />
                        <Input
                          value={option.label}
                          onChange={(e) => {
                            const newOptions = [...(column.selectOptions || [])];
                            newOptions[index] = { ...option, label: e.target.value };
                            updateColumn({ selectOptions: newOptions });
                          }}
                          placeholder="Option label"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newOptions = (column.selectOptions || []).filter((_, i) => i !== index);
                            updateColumn({ selectOptions: newOptions });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newOptions = [...(column.selectOptions || []), { value: '', label: '', color: '' }];
                        updateColumn({ selectOptions: newOptions });
                      }}
                    >
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              {/* Validation Rules */}
              {isAdvancedMode && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center space-x-2 w-full">
                    <ChevronDown className="h-4 w-4" />
                    <Label>Validation Rules</Label>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4">
                    {/* Add validation rule configuration */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-600">
                        Validation rules will be configured here based on column type.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Preview Column</h3>
                <p className="text-gray-600 mb-4">
                  Test your column configuration with sample data.
                </p>
              </div>

              <div className="grid gap-6">
                {/* Column Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {column.type && (() => {
                        const IconComponent = COLUMN_TYPE_CONFIG[column.type as keyof typeof COLUMN_TYPE_CONFIG]?.icon;
                        return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
                      })()}
                      <span>{column.name}</span>
                      <Badge variant="outline">{column.type}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Key:</span>
                        <span className="ml-2 font-mono">{column.key}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Width:</span>
                        <span className="ml-2">{column.width}px</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sortable:</span>
                        <span className="ml-2">{column.sortable !== false ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Editable:</span>
                        <span className="ml-2">{column.editable !== false ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sample Data Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sampleLeads.length > 0 ? (
                      <div className="space-y-2">
                        {sampleLeads.slice(0, 3).map((lead, index) => (
                          <div key={lead.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="text-sm">
                              <span className="font-medium">{lead.firstName} {lead.lastName}</span>
                              <span className="text-gray-500 ml-2">({lead.company})</span>
                            </div>
                            <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {previewValue || 'Sample value'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No sample data available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Test Column */}
                {column.type === 'formula' && column.formula?.expression && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Formula Test</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600">Expression:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                            {column.formula.expression}
                          </code>
                        </div>
                        <Button size="sm" variant="outline">
                          <TestTube className="h-4 w-4 mr-2" />
                          Test Formula
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Validation Errors</h4>
                    <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={nextStep}
                disabled={!steps[currentStep].isComplete && !steps[currentStep].isSkippable}
              >
                {steps[currentStep].isSkippable && !steps[currentStep].isComplete ? 'Skip' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={validationErrors.length > 0}
              >
                <Check className="h-4 w-4 mr-2" />
                {initialColumn ? 'Update Column' : 'Create Column'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnWizard;