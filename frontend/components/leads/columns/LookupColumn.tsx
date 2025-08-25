'use client';

/**
 * Lookup Column Component
 * Handles external reference data connections and VLOOKUP-style operations
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Lead, ColumnDefinition } from '@/types/spreadsheet';
import { cn } from '@/lib/utils';

// Icons
import {
  Search,
  Database,
  Link,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  Settings,
  Plus,
  X,
  FileText,
  Globe,
  Table,
  Key,
  Filter,
  ArrowRight,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Edit3,
  Trash2
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

// Lookup Types
export type LookupSourceType = 
  | 'csv_upload' 
  | 'google_sheets' 
  | 'airtable' 
  | 'database_table' 
  | 'api_endpoint'
  | 'webhook'
  | 'manual_entries';

export interface LookupDataSource {
  id: string;
  name: string;
  type: LookupSourceType;
  description: string;
  icon: React.ComponentType;
  config: Record<string, any>;
  lastUpdated: string;
  status: 'active' | 'inactive' | 'error';
  recordCount: number;
  columns: LookupColumn[];
}

export interface LookupColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  isKey: boolean;
  sampleValues: any[];
}

export interface LookupConfig {
  sourceId: string;
  keyColumn: string; // Column in source data to match against
  matchColumn: string; // Column in lead data to match with
  returnColumn: string; // Column from source to return
  matchType: 'exact' | 'partial' | 'fuzzy' | 'regex';
  cacheResults: boolean;
  fallbackValue?: any;
  refreshInterval?: number; // minutes
  transformations: LookupTransformation[];
}

export interface LookupTransformation {
  id: string;
  type: 'uppercase' | 'lowercase' | 'trim' | 'replace' | 'extract_domain' | 'format_phone';
  parameters: Record<string, any>;
  applyToKey: boolean;
  applyToResult: boolean;
}

export interface LookupMatch {
  leadId: string;
  keyValue: any;
  matchFound: boolean;
  matchedValue?: any;
  confidence: number;
  source: string;
  timestamp: string;
}

export interface LookupJob {
  id: string;
  columnId: string;
  leadIds: string[];
  config: LookupConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  matches: LookupMatch[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface LookupColumnProps {
  column: ColumnDefinition;
  leads: Lead[];
  selectedLeadIds: string[];
  onConfigUpdate: (config: LookupConfig) => void;
  onLookupStart: (leadIds: string[], config: LookupConfig) => void;
  onLookupStop: (jobIds: string[]) => void;
  lookupJobs: LookupJob[];
  dataSources: LookupDataSource[];
  onCreateDataSource: (source: Partial<LookupDataSource>) => void;
  onUpdateDataSource: (id: string, updates: Partial<LookupDataSource>) => void;
  className?: string;
}

// Sample Data Sources
const SAMPLE_DATA_SOURCES: LookupDataSource[] = [
  {
    id: 'company_database',
    name: 'Company Database',
    type: 'database_table',
    description: 'Internal company information database',
    icon: Database,
    config: { table: 'companies', connection: 'primary' },
    lastUpdated: new Date().toISOString(),
    status: 'active',
    recordCount: 15420,
    columns: [
      { id: 'domain', name: 'Domain', type: 'text', isKey: true, sampleValues: ['google.com', 'microsoft.com'] },
      { id: 'company_size', name: 'Company Size', type: 'text', isKey: false, sampleValues: ['Enterprise', 'Mid-market', 'SMB'] },
      { id: 'industry', name: 'Industry', type: 'text', isKey: false, sampleValues: ['Technology', 'Healthcare'] },
      { id: 'revenue', name: 'Revenue', type: 'number', isKey: false, sampleValues: ['1B+', '100M-1B'] }
    ]
  },
  {
    id: 'industry_mapping',
    name: 'Industry Classifications',
    type: 'csv_upload',
    description: 'Standard industry classification mapping',
    icon: FileText,
    config: { filename: 'industry_mapping.csv' },
    lastUpdated: new Date().toISOString(),
    status: 'active',
    recordCount: 2845,
    columns: [
      { id: 'company_name', name: 'Company Name', type: 'text', isKey: true, sampleValues: ['Apple Inc', 'Google LLC'] },
      { id: 'naics_code', name: 'NAICS Code', type: 'text', isKey: false, sampleValues: ['541511', '518210'] },
      { id: 'primary_industry', name: 'Primary Industry', type: 'text', isKey: false, sampleValues: ['Software', 'Search Engines'] }
    ]
  },
  {
    id: 'competitor_list',
    name: 'Competitor Analysis',
    type: 'google_sheets',
    description: 'Competitive landscape data from Google Sheets',
    icon: Globe,
    config: { sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
    lastUpdated: new Date().toISOString(),
    status: 'active',
    recordCount: 1250,
    columns: [
      { id: 'domain', name: 'Domain', type: 'text', isKey: true, sampleValues: ['salesforce.com', 'hubspot.com'] },
      { id: 'competitive_tier', name: 'Competitive Tier', type: 'text', isKey: false, sampleValues: ['Direct', 'Indirect', 'Adjacent'] },
      { id: 'threat_level', name: 'Threat Level', type: 'text', isKey: false, sampleValues: ['High', 'Medium', 'Low'] }
    ]
  }
];

const MATCH_TYPES = {
  exact: { name: 'Exact Match', description: 'Values must match exactly (case-sensitive)' },
  partial: { name: 'Partial Match', description: 'Source value contains the lookup value' },
  fuzzy: { name: 'Fuzzy Match', description: 'Approximate matching with similarity threshold' },
  regex: { name: 'Regular Expression', description: 'Pattern-based matching using regex' }
};

const TRANSFORMATION_TYPES = [
  { id: 'uppercase', name: 'Uppercase', description: 'Convert to uppercase' },
  { id: 'lowercase', name: 'Lowercase', description: 'Convert to lowercase' },
  { id: 'trim', name: 'Trim', description: 'Remove leading/trailing spaces' },
  { id: 'extract_domain', name: 'Extract Domain', description: 'Extract domain from email/URL' },
  { id: 'format_phone', name: 'Format Phone', description: 'Standardize phone number format' },
  { id: 'replace', name: 'Find & Replace', description: 'Replace text patterns' }
];

const LookupColumn: React.FC<LookupColumnProps> = ({
  column,
  leads,
  selectedLeadIds,
  onConfigUpdate,
  onLookupStart,
  onLookupStop,
  lookupJobs,
  dataSources = SAMPLE_DATA_SOURCES,
  onCreateDataSource,
  onUpdateDataSource,
  className
}) => {
  const [config, setConfig] = useState<LookupConfig>({
    sourceId: dataSources[0]?.id || '',
    keyColumn: '',
    matchColumn: '',
    returnColumn: '',
    matchType: 'exact',
    cacheResults: true,
    transformations: []
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [showDataSourceManager, setShowDataSourceManager] = useState(false);
  const [newDataSource, setNewDataSource] = useState<Partial<LookupDataSource>>({
    type: 'csv_upload'
  });
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Get selected data source
  const selectedSource = dataSources.find(s => s.id === config.sourceId);

  // Get jobs for this column
  const columnJobs = useMemo(() => {
    return lookupJobs.filter(job => job.columnId === column.id);
  }, [lookupJobs, column.id]);

  // Calculate job statistics
  const jobStats = useMemo(() => {
    const jobs = columnJobs;
    const total = jobs.reduce((sum, job) => sum + job.leadIds.length, 0);
    const matches = jobs.reduce((sum, job) => 
      sum + job.matches.filter(m => m.matchFound).length, 0
    );
    const processing = jobs.filter(j => j.status === 'processing').length;
    
    return {
      total,
      matches,
      processing,
      matchRate: total > 0 ? (matches / total) * 100 : 0,
      avgConfidence: jobs.reduce((sum, job) => {
        const avgJobConfidence = job.matches.reduce((sum, match) => 
          sum + match.confidence, 0) / (job.matches.length || 1);
        return sum + avgJobConfidence;
      }, 0) / (jobs.length || 1)
    };
  }, [columnJobs]);

  // Handle configuration changes
  const handleConfigChange = useCallback((updates: Partial<LookupConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigUpdate(newConfig);
  }, [config, onConfigUpdate]);

  // Add transformation
  const handleAddTransformation = useCallback((type: string) => {
    const newTransformation: LookupTransformation = {
      id: Date.now().toString(),
      type: type as any,
      parameters: {},
      applyToKey: true,
      applyToResult: false
    };
    
    handleConfigChange({
      transformations: [...config.transformations, newTransformation]
    });
  }, [config.transformations, handleConfigChange]);

  // Remove transformation
  const handleRemoveTransformation = useCallback((id: string) => {
    handleConfigChange({
      transformations: config.transformations.filter(t => t.id !== id)
    });
  }, [config.transformations, handleConfigChange]);

  // Update transformation
  const handleUpdateTransformation = useCallback((id: string, updates: Partial<LookupTransformation>) => {
    handleConfigChange({
      transformations: config.transformations.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
    });
  }, [config.transformations, handleConfigChange]);

  // Preview lookup results
  const handlePreviewLookup = useCallback(() => {
    if (!selectedSource || selectedLeadIds.length === 0) return;
    
    // Simulate lookup results
    const sampleLeads = leads.filter(l => selectedLeadIds.includes(l.id)).slice(0, 5);
    const mockResults = sampleLeads.map(lead => {
      const keyValue = lead[config.matchColumn as keyof Lead];
      const mockMatch = Math.random() > 0.3; // 70% match rate
      
      return {
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        keyValue,
        matchFound: mockMatch,
        matchedValue: mockMatch ? `Sample result for ${keyValue}` : null,
        confidence: mockMatch ? 0.8 + Math.random() * 0.2 : 0
      };
    });
    
    setPreviewData(mockResults);
  }, [selectedSource, selectedLeadIds, leads, config.matchColumn]);

  // Start lookup
  const handleStartLookup = useCallback(() => {
    if (selectedLeadIds.length === 0 || !config.sourceId) return;
    
    setIsRunning(true);
    onLookupStart(selectedLeadIds, config);
  }, [selectedLeadIds, config, onLookupStart]);

  // Stop lookup
  const handleStopLookup = useCallback(() => {
    const runningJobIds = columnJobs
      .filter(job => job.status === 'processing' || job.status === 'pending')
      .map(job => job.id);
    
    if (runningJobIds.length > 0) {
      onLookupStop(runningJobIds);
    }
    setIsRunning(false);
  }, [columnJobs, onLookupStop]);

  // Monitor running status
  useEffect(() => {
    const hasRunningJobs = columnJobs.some(job => 
      job.status === 'processing' || job.status === 'pending'
    );
    setIsRunning(hasRunningJobs);
  }, [columnJobs]);

  // Get available lead columns for matching
  const availableLeadColumns = [
    { key: 'email', name: 'Email' },
    { key: 'company', name: 'Company' },
    { key: 'firstName', name: 'First Name' },
    { key: 'lastName', name: 'Last Name' },
    { key: 'jobTitle', name: 'Job Title' },
    { key: 'phone', name: 'Phone' }
  ];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Lookup Configuration
          </div>
          {isRunning && (
            <Badge variant="secondary" className="flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Running
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="transforms">Transforms</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            {/* Data Source Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data Source</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDataSourceManager(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Sources
                </Button>
              </div>
              <Select 
                value={config.sourceId} 
                onValueChange={(value) => {
                  handleConfigChange({ sourceId: value, keyColumn: '', returnColumn: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <div className="flex items-center">
                        <source.icon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{source.name}</div>
                          <div className="text-sm text-gray-500">
                            {source.recordCount.toLocaleString()} records
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedSource && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedSource.name}</div>
                      <div className="text-sm text-gray-600">{selectedSource.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedSource.status === 'active' ? 'default' : 'destructive'}>
                        {selectedSource.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Last updated: {new Date(selectedSource.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Matching Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Match Lead Column</Label>
                <Select 
                  value={config.matchColumn} 
                  onValueChange={(value) => handleConfigChange({ matchColumn: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lead column" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeadColumns.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>With Source Column</Label>
                <Select 
                  value={config.keyColumn} 
                  onValueChange={(value) => handleConfigChange({ keyColumn: value })}
                  disabled={!selectedSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source column" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSource?.columns
                      .filter(col => col.isKey)
                      .map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          <div className="flex items-center">
                            <Key className="h-4 w-4 mr-2" />
                            {col.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Return Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Return Column</Label>
                <Select 
                  value={config.returnColumn} 
                  onValueChange={(value) => handleConfigChange({ returnColumn: value })}
                  disabled={!selectedSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select return column" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSource?.columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        <div>
                          <div className="font-medium">{col.name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            {col.type} • Sample: {col.sampleValues[0]}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Match Type</Label>
                <Select 
                  value={config.matchType} 
                  onValueChange={(value: any) => handleConfigChange({ matchType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MATCH_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fallback Value (Optional)</Label>
                <Input
                  value={config.fallbackValue || ''}
                  onChange={(e) => handleConfigChange({ fallbackValue: e.target.value })}
                  placeholder="Value to use when no match is found"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cache Results</Label>
                  <div className="text-sm text-gray-600">
                    Store lookup results to improve performance
                  </div>
                </div>
                <Switch
                  checked={config.cacheResults}
                  onCheckedChange={(checked) => handleConfigChange({ cacheResults: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Auto-refresh Interval (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.refreshInterval || ''}
                  onChange={(e) => handleConfigChange({ 
                    refreshInterval: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder="0 = no auto-refresh"
                />
              </div>
            </div>
          </TabsContent>

          {/* Transformations Tab */}
          <TabsContent value="transforms" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Data Transformations</h4>
                <p className="text-sm text-gray-600">
                  Apply transformations to improve matching accuracy
                </p>
              </div>
              <Select onValueChange={handleAddTransformation}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Add transformation" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFORMATION_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {config.transformations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transformations configured</p>
                    <p className="text-sm">Add transformations to improve matching accuracy</p>
                  </div>
                ) : (
                  config.transformations.map((transform, index) => (
                    <Card key={transform.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 text-xs flex items-center justify-center mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">
                                {TRANSFORMATION_TYPES.find(t => t.id === transform.type)?.name}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center gap-2">
                                <Switch
                                  checked={transform.applyToKey}
                                  onCheckedChange={(checked) => 
                                    handleUpdateTransformation(transform.id, { applyToKey: checked })
                                  }
                                  size="sm"
                                />
                                <span>Apply to lookup key</span>
                                <Switch
                                  checked={transform.applyToResult}
                                  onCheckedChange={(checked) => 
                                    handleUpdateTransformation(transform.id, { applyToResult: checked })
                                  }
                                  size="sm"
                                />
                                <span>Apply to result</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveTransformation(transform.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Transformation Parameters */}
                        {transform.type === 'replace' && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <Input
                              placeholder="Find text"
                              value={transform.parameters.find || ''}
                              onChange={(e) => handleUpdateTransformation(transform.id, {
                                parameters: { ...transform.parameters, find: e.target.value }
                              })}
                            />
                            <Input
                              placeholder="Replace with"
                              value={transform.parameters.replace || ''}
                              onChange={(e) => handleUpdateTransformation(transform.id, {
                                parameters: { ...transform.parameters, replace: e.target.value }
                              })}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Lookup Preview</h4>
                <p className="text-sm text-gray-600">
                  Test your configuration with selected leads
                </p>
              </div>
              <Button
                onClick={handlePreviewLookup}
                disabled={selectedLeadIds.length === 0 || !config.sourceId}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Lookup
              </Button>
            </div>

            {previewData.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {previewData.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {result.matchFound ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                            )}
                            <div>
                              <div className="font-medium">{result.leadName}</div>
                              <div className="text-sm text-gray-600">
                                Key: {result.keyValue}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {result.matchFound ? (
                              <div>
                                <div className="text-sm font-medium">
                                  {result.matchedValue}
                                </div>
                                <Badge variant="outline">
                                  {Math.round(result.confidence * 100)}% confidence
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary">No match</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No preview data</p>
                <p className="text-sm">Click "Preview Lookup" to test your configuration</p>
              </div>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {jobStats.total > 0 ? (
              <div className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {jobStats.total}
                      </div>
                      <div className="text-sm text-gray-600">Total Lookups</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {jobStats.matchRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Match Rate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round(jobStats.avgConfidence)}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Confidence</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Results */}
                <div className="space-y-2">
                  <Label>Recent Lookup Results</Label>
                  <ScrollArea className="h-64">
                    <div className="space-y-1">
                      {columnJobs.flatMap(job => job.matches)
                        .slice(-20)
                        .reverse()
                        .map((match, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded border">
                            <div className="flex items-center">
                              {match.matchFound ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                              )}
                              <div>
                                <span className="text-sm">Lead {match.leadId.slice(-6)}</span>
                                <div className="text-xs text-gray-600">
                                  Key: {match.keyValue}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {match.matchFound && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(match.confidence * 100)}%
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {match.matchFound ? 'Match' : 'No match'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No lookup results yet</p>
                <p className="text-sm">Run lookups to see match results and statistics</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Button
                variant="outline"
                onClick={handleStopLookup}
                className="flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                Stop Lookup
              </Button>
            ) : (
              <Button
                onClick={handleStartLookup}
                disabled={selectedLeadIds.length === 0 || !config.sourceId || !config.keyColumn || !config.returnColumn}
                className="flex items-center"
              >
                <Search className="h-4 w-4 mr-2" />
                Start Lookup
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LookupColumn;