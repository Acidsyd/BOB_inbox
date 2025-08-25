'use client';

/**
 * Enrichment Column Component
 * Handles API integrations for lead data enrichment
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Lead, ColumnDefinition } from '@/types/spreadsheet';
import { cn } from '@/lib/utils';

// Icons
import {
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Settings,
  DollarSign,
  TrendingUp,
  Users,
  Building,
  Mail,
  Phone,
  Globe,
  Shield,
  Star,
  Loader2,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

// Enrichment Types
export interface EnrichmentProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  baseUrl: string;
  authType: 'api_key' | 'oauth2' | 'none';
  creditsPerRequest?: number;
  rateLimitPerMinute?: number;
  supportedTypes: EnrichmentType[];
  pricing: {
    free: number;
    paid: number;
    currency: string;
  };
}

export type EnrichmentType = 
  | 'email_finder' 
  | 'email_verification' 
  | 'company_data' 
  | 'person_data' 
  | 'contact_info' 
  | 'social_profiles' 
  | 'technology_stack'
  | 'phone_verification'
  | 'address_validation';

export interface EnrichmentJob {
  id: string;
  leadId: string;
  columnId: string;
  provider: string;
  type: EnrichmentType;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  confidence?: number;
  creditsUsed?: number;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  priority: 'low' | 'normal' | 'high';
}

export interface EnrichmentConfig {
  provider: string;
  type: EnrichmentType;
  mapping: Record<string, string>;
  autoRun: boolean;
  batchSize: number;
  retryAttempts: number;
  costLimitPerMonth?: number;
  qualityThreshold?: number;
  filters?: {
    onlyIfEmpty: boolean;
    requireConfidence: number;
    excludePatterns: string[];
  };
}

export interface EnrichmentResult {
  success: boolean;
  data?: any;
  confidence: number;
  source: string;
  timestamp: string;
  creditsUsed: number;
  error?: string;
}

interface EnrichmentColumnProps {
  column: ColumnDefinition;
  leads: Lead[];
  selectedLeadIds: string[];
  onConfigUpdate: (config: EnrichmentConfig) => void;
  onEnrichmentStart: (leadIds: string[], config: EnrichmentConfig) => void;
  onEnrichmentStop: (jobIds: string[]) => void;
  enrichmentJobs: EnrichmentJob[];
  availableCredits?: number;
  className?: string;
}

// Enrichment Providers
const ENRICHMENT_PROVIDERS: EnrichmentProvider[] = [
  {
    id: 'clearbit',
    name: 'Clearbit',
    description: 'Company and person data enrichment',
    icon: Building,
    baseUrl: 'https://person.clearbit.com',
    authType: 'api_key',
    creditsPerRequest: 1,
    rateLimitPerMinute: 600,
    supportedTypes: ['company_data', 'person_data', 'email_finder'],
    pricing: { free: 50, paid: 0.50, currency: 'USD' }
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Email finder and verification',
    icon: Mail,
    baseUrl: 'https://api.hunter.io',
    authType: 'api_key',
    creditsPerRequest: 1,
    rateLimitPerMinute: 300,
    supportedTypes: ['email_finder', 'email_verification'],
    pricing: { free: 25, paid: 0.10, currency: 'USD' }
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    description: 'Contact and company data',
    icon: Users,
    baseUrl: 'https://api.apollo.io',
    authType: 'api_key',
    creditsPerRequest: 1,
    rateLimitPerMinute: 200,
    supportedTypes: ['email_finder', 'person_data', 'company_data', 'contact_info'],
    pricing: { free: 10, paid: 0.15, currency: 'USD' }
  },
  {
    id: 'snov',
    name: 'Snov.io',
    description: 'Email finder and verifier',
    icon: Shield,
    baseUrl: 'https://api.snov.io',
    authType: 'api_key',
    creditsPerRequest: 1,
    rateLimitPerMinute: 100,
    supportedTypes: ['email_finder', 'email_verification'],
    pricing: { free: 50, paid: 0.08, currency: 'USD' }
  },
  {
    id: 'builtwith',
    name: 'BuiltWith',
    description: 'Technology stack analysis',
    icon: Globe,
    baseUrl: 'https://api.builtwith.com',
    authType: 'api_key',
    creditsPerRequest: 1,
    rateLimitPerMinute: 120,
    supportedTypes: ['technology_stack'],
    pricing: { free: 0, paid: 0.25, currency: 'USD' }
  }
];

const ENRICHMENT_TYPE_ICONS = {
  email_finder: Mail,
  email_verification: CheckCircle,
  company_data: Building,
  person_data: Users,
  contact_info: Phone,
  social_profiles: ExternalLink,
  technology_stack: Globe,
  phone_verification: Phone,
  address_validation: Globe
};

const EnrichmentColumn: React.FC<EnrichmentColumnProps> = ({
  column,
  leads,
  selectedLeadIds,
  onConfigUpdate,
  onEnrichmentStart,
  onEnrichmentStop,
  enrichmentJobs,
  availableCredits = 0,
  className
}) => {
  const [config, setConfig] = useState<EnrichmentConfig>(
    column.enrichment || {
      provider: 'clearbit',
      type: 'company_data',
      mapping: {},
      autoRun: false,
      batchSize: 10,
      retryAttempts: 3,
      qualityThreshold: 0.7
    }
  );
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<EnrichmentProvider | null>(
    ENRICHMENT_PROVIDERS.find(p => p.id === config.provider) || null
  );

  // Get jobs for this column
  const columnJobs = useMemo(() => {
    return enrichmentJobs.filter(job => job.columnId === column.id);
  }, [enrichmentJobs, column.id]);

  // Calculate progress and stats
  const jobStats = useMemo(() => {
    const jobs = columnJobs;
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    const pending = jobs.filter(j => j.status === 'pending').length;
    
    const totalCredits = jobs.reduce((sum, job) => sum + (job.creditsUsed || 0), 0);
    const avgConfidence = jobs.filter(j => j.confidence).reduce((sum, job, _, arr) => 
      sum + (job.confidence! / arr.length), 0
    );

    return {
      total,
      completed,
      failed,
      processing,
      pending,
      progress: total > 0 ? (completed / total) * 100 : 0,
      creditsUsed: totalCredits,
      avgConfidence: Math.round(avgConfidence * 100),
      successRate: total > 0 ? ((completed / (completed + failed)) * 100) || 0 : 0
    };
  }, [columnJobs]);

  // Handle configuration changes
  const handleConfigChange = useCallback((updates: Partial<EnrichmentConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigUpdate(newConfig);
  }, [config, onConfigUpdate]);

  // Start enrichment for selected leads
  const handleStartEnrichment = useCallback(() => {
    if (selectedLeadIds.length === 0) return;
    
    setIsRunning(true);
    onEnrichmentStart(selectedLeadIds, config);
  }, [selectedLeadIds, config, onEnrichmentStart]);

  // Stop enrichment jobs
  const handleStopEnrichment = useCallback(() => {
    const runningJobIds = columnJobs
      .filter(job => job.status === 'processing' || job.status === 'pending')
      .map(job => job.id);
    
    if (runningJobIds.length > 0) {
      onEnrichmentStop(runningJobIds);
    }
    setIsRunning(false);
  }, [columnJobs, onEnrichmentStop]);

  // Check if enrichment is currently running
  useEffect(() => {
    const hasRunningJobs = columnJobs.some(job => 
      job.status === 'processing' || job.status === 'pending'
    );
    setIsRunning(hasRunningJobs);
  }, [columnJobs]);

  // Get estimated cost
  const estimatedCost = useMemo(() => {
    if (!selectedProvider) return 0;
    return selectedLeadIds.length * selectedProvider.pricing.paid;
  }, [selectedLeadIds.length, selectedProvider]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Enrichment Configuration
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Enrichment Provider</Label>
              <Select 
                value={config.provider} 
                onValueChange={(value) => {
                  handleConfigChange({ provider: value });
                  setSelectedProvider(ENRICHMENT_PROVIDERS.find(p => p.id === value) || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENRICHMENT_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center">
                        <provider.icon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-gray-500">{provider.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProvider && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Rate limit: {selectedProvider.rateLimitPerMinute}/min</span>
                  <span>Cost: ${selectedProvider.pricing.paid} per request</span>
                </div>
              )}
            </div>

            {/* Enrichment Type */}
            <div className="space-y-2">
              <Label>Data Type</Label>
              <Select 
                value={config.type} 
                onValueChange={(value: EnrichmentType) => handleConfigChange({ type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider?.supportedTypes.map((type) => {
                    const Icon = ENRICHMENT_TYPE_ICONS[type];
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2" />
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={config.batchSize}
                  onChange={(e) => handleConfigChange({ batchSize: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Retry Attempts</Label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={config.retryAttempts}
                  onChange={(e) => handleConfigChange({ retryAttempts: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Quality Settings */}
            <div className="space-y-2">
              <Label>Quality Threshold ({Math.round((config.qualityThreshold || 0.7) * 100)}%)</Label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={config.qualityThreshold || 0.7}
                onChange={(e) => handleConfigChange({ qualityThreshold: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="text-sm text-gray-600">
                Only accept results with confidence above this threshold
              </div>
            </div>

            {/* Auto-run Setting */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-run for new leads</Label>
                <div className="text-sm text-gray-600">
                  Automatically enrich new leads as they're added
                </div>
              </div>
              <Switch
                checked={config.autoRun}
                onCheckedChange={(checked) => handleConfigChange({ autoRun: checked })}
              />
            </div>

            {/* Cost Estimate */}
            {selectedLeadIds.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="font-medium">Cost Estimate</span>
                  </div>
                  <Badge variant="outline">
                    ${estimatedCost.toFixed(2)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedLeadIds.length} leads × ${selectedProvider?.pricing.paid}/request
                </div>
                <div className="text-sm text-gray-600">
                  Available credits: {availableCredits}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            {jobStats.total > 0 ? (
              <div className="space-y-4">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Overall Progress</Label>
                    <span className="text-sm text-gray-600">
                      {jobStats.completed} / {jobStats.total}
                    </span>
                  </div>
                  <Progress value={jobStats.progress} className="w-full" />
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completed</span>
                      <Badge variant="default">{jobStats.completed}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Failed</span>
                      <Badge variant="destructive">{jobStats.failed}</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Processing</span>
                      <Badge variant="secondary">{jobStats.processing}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending</span>
                      <Badge variant="outline">{jobStats.pending}</Badge>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{jobStats.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{jobStats.avgConfidence}%</div>
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{jobStats.creditsUsed}</div>
                    <div className="text-sm text-gray-600">Credits Used</div>
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className="space-y-2">
                  <Label>Recent Jobs</Label>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {columnJobs.slice(-10).reverse().map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center">
                            {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600 mr-2" />}
                            {job.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-600 mr-2" />}
                            {job.status === 'processing' && <Loader2 className="h-4 w-4 text-blue-600 mr-2 animate-spin" />}
                            {job.status === 'pending' && <Clock className="h-4 w-4 text-gray-400 mr-2" />}
                            <span className="text-sm">Lead {job.leadId.slice(-6)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(job.confidence * 100)}%
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {job.status}
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
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No enrichment jobs yet</p>
                <p className="text-sm">Configure settings and start enrichment to see progress</p>
              </div>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {jobStats.completed > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {columnJobs
                    .filter(job => job.status === 'completed' && job.result)
                    .map((job) => (
                      <Card key={job.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Lead {job.leadId.slice(-6)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                <Star className="h-3 w-3 mr-1" />
                                {Math.round((job.confidence || 0) * 100)}%
                              </Badge>
                              <Badge variant="secondary">
                                {job.creditsUsed} credits
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(job.result, null, 2)}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results yet</p>
                <p className="text-sm">Complete enrichment jobs will appear here</p>
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
                onClick={handleStopEnrichment}
                className="flex items-center"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleStartEnrichment}
                disabled={selectedLeadIds.length === 0 || !selectedProvider}
                className="flex items-center"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Enrichment
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnrichmentColumn;