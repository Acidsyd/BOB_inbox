'use client';

/**
 * AI-Powered Column Component
 * Handles AI-based lead scoring, intent analysis, and personalization
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Lead, ColumnDefinition } from '@/types/spreadsheet';
import { cn } from '@/lib/utils';

// Icons
import {
  Brain,
  Target,
  MessageSquare,
  TrendingUp,
  Star,
  Zap,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  BarChart,
  PieChart,
  Activity,
  Gauge,
  Sparkles,
  Wand2,
  Bot,
  Users,
  Clock,
  DollarSign
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

// AI Types
export type AIAnalysisType = 
  | 'lead_scoring'
  | 'intent_analysis'
  | 'personalization'
  | 'sentiment_analysis'
  | 'data_cleanup'
  | 'category_classification'
  | 'priority_ranking'
  | 'churn_prediction';

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  models: AIModel[];
  pricing: {
    inputTokens: number; // per 1k tokens
    outputTokens: number;
    currency: string;
  };
  rateLimitPerMinute: number;
  features: AIAnalysisType[];
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  strengths: string[];
  costMultiplier: number;
}

export interface AIConfig {
  provider: string;
  model: string;
  analysisType: AIAnalysisType;
  prompt: string;
  temperature: number;
  maxTokens: number;
  autoRun: boolean;
  batchSize: number;
  confidenceThreshold: number;
  customInstructions?: string;
  outputFormat: 'text' | 'number' | 'json' | 'boolean';
  trainingData?: AITrainingExample[];
}

export interface AITrainingExample {
  id: string;
  input: Record<string, any>;
  expectedOutput: any;
  explanation: string;
}

export interface AIResult {
  success: boolean;
  result: any;
  confidence: number;
  reasoning?: string;
  tokensUsed: number;
  cost: number;
  processingTime: number;
  model: string;
  timestamp: string;
}

export interface AIJob {
  id: string;
  leadId: string;
  columnId: string;
  config: AIConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: AIResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
}

interface AIColumnProps {
  column: ColumnDefinition;
  leads: Lead[];
  selectedLeadIds: string[];
  onConfigUpdate: (config: AIConfig) => void;
  onAnalysisStart: (leadIds: string[], config: AIConfig) => void;
  onAnalysisStop: (jobIds: string[]) => void;
  aiJobs: AIJob[];
  availableCredits?: number;
  className?: string;
}

// AI Providers Configuration
const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models for advanced AI analysis',
    icon: Brain,
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model for complex reasoning',
        contextLength: 8192,
        strengths: ['Complex reasoning', 'Detailed analysis', 'High accuracy'],
        costMultiplier: 1.0
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and efficient for most tasks',
        contextLength: 4096,
        strengths: ['Speed', 'Cost-effective', 'Good general performance'],
        costMultiplier: 0.1
      }
    ],
    pricing: { inputTokens: 0.03, outputTokens: 0.06, currency: 'USD' },
    rateLimitPerMinute: 3500,
    features: ['lead_scoring', 'intent_analysis', 'personalization', 'sentiment_analysis', 'data_cleanup']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models optimized for safety and accuracy',
    icon: Bot,
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most intelligent model for complex tasks',
        contextLength: 200000,
        strengths: ['Long context', 'Detailed reasoning', 'Creative analysis'],
        costMultiplier: 1.5
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        contextLength: 200000,
        strengths: ['Balanced', 'Reliable', 'Good reasoning'],
        costMultiplier: 0.3
      }
    ],
    pricing: { inputTokens: 0.015, outputTokens: 0.075, currency: 'USD' },
    rateLimitPerMinute: 1000,
    features: ['lead_scoring', 'intent_analysis', 'personalization', 'category_classification']
  }
];

// Analysis Type Configurations
const ANALYSIS_TYPES = {
  lead_scoring: {
    name: 'Lead Scoring',
    description: 'AI-powered lead quality assessment',
    icon: Star,
    outputFormat: 'number' as const,
    defaultPrompt: `Analyze this lead and provide a quality score from 1-100 based on:
- Contact information completeness
- Company size and relevance
- Job title seniority
- Engagement indicators
- Buying signals

Return only a number between 1-100.`,
    examples: [
      { input: { company: 'Google', jobTitle: 'VP Engineering', email: 'john@google.com' }, output: 95 },
      { input: { company: 'Unknown', jobTitle: 'Student', email: 'jane@gmail.com' }, output: 25 }
    ]
  },
  intent_analysis: {
    name: 'Intent Analysis',
    description: 'Analyze buyer intent and readiness',
    icon: Target,
    outputFormat: 'text' as const,
    defaultPrompt: `Analyze this lead's buyer intent based on available data.
Categorize as: High Intent, Medium Intent, Low Intent, or Unknown.
Consider company growth, job changes, technology adoption, and engagement patterns.`,
    examples: [
      { input: { company: 'Fast-growing startup', recentFunding: true }, output: 'High Intent' },
      { input: { company: 'Enterprise', lastContact: '6 months ago' }, output: 'Low Intent' }
    ]
  },
  personalization: {
    name: 'Message Personalization',
    description: 'Generate personalized outreach messages',
    icon: MessageSquare,
    outputFormat: 'text' as const,
    defaultPrompt: `Create a personalized cold email opening line for this lead.
Be specific, relevant, and engaging. Reference their company, role, or recent news if available.
Keep it under 50 words and professional.`,
    examples: [
      { 
        input: { company: 'Stripe', jobTitle: 'Engineering Manager', recentNews: 'Series D funding' },
        output: 'Congratulations on Stripe\'s recent Series D! As an Engineering Manager at such a fast-growing fintech...'
      }
    ]
  },
  sentiment_analysis: {
    name: 'Sentiment Analysis',
    description: 'Analyze sentiment from social profiles or interactions',
    icon: Activity,
    outputFormat: 'text' as const,
    defaultPrompt: `Analyze the sentiment of this lead's recent activity or profile information.
Categorize as: Positive, Neutral, Negative, or Professional.
Focus on business-relevant sentiment and engagement likelihood.`,
    examples: []
  },
  data_cleanup: {
    name: 'Data Cleanup',
    description: 'Clean and standardize lead data',
    icon: Sparkles,
    outputFormat: 'text' as const,
    defaultPrompt: `Clean and standardize this data field.
Fix formatting, remove extra spaces, standardize capitalization, and correct common misspellings.
Return only the cleaned value.`,
    examples: [
      { input: { company: '  google   inc.  ' }, output: 'Google Inc.' },
      { input: { jobTitle: 'sr. software enginEER' }, output: 'Senior Software Engineer' }
    ]
  }
};

const AIColumn: React.FC<AIColumnProps> = ({
  column,
  leads,
  selectedLeadIds,
  onConfigUpdate,
  onAnalysisStart,
  onAnalysisStop,
  aiJobs,
  availableCredits = 0,
  className
}) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    analysisType: 'lead_scoring',
    prompt: ANALYSIS_TYPES.lead_scoring.defaultPrompt,
    temperature: 0.3,
    maxTokens: 150,
    autoRun: false,
    batchSize: 5,
    confidenceThreshold: 0.7,
    outputFormat: 'number'
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<AIResult | null>(null);
  const [isTestingPrompt, setIsTestingPrompt] = useState(false);

  // Get selected provider and model
  const selectedProvider = AI_PROVIDERS.find(p => p.id === config.provider);
  const selectedModel = selectedProvider?.models.find(m => m.id === config.model);

  // Get jobs for this column
  const columnJobs = useMemo(() => {
    return aiJobs.filter(job => job.columnId === column.id);
  }, [aiJobs, column.id]);

  // Calculate job statistics
  const jobStats = useMemo(() => {
    const jobs = columnJobs;
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    
    const totalCost = jobs.reduce((sum, job) => 
      sum + (job.result?.cost || 0), 0
    );
    const avgConfidence = jobs.filter(j => j.result?.confidence).reduce((sum, job, _, arr) => 
      sum + (job.result!.confidence / arr.length), 0
    );

    return {
      total,
      completed,
      failed,
      processing,
      progress: total > 0 ? (completed / total) * 100 : 0,
      totalCost,
      avgConfidence: Math.round(avgConfidence * 100),
      successRate: total > 0 ? ((completed / (completed + failed)) * 100) || 0 : 0
    };
  }, [columnJobs]);

  // Handle configuration changes
  const handleConfigChange = useCallback((updates: Partial<AIConfig>) => {
    const newConfig = { ...config, ...updates };
    
    // Update prompt when analysis type changes
    if (updates.analysisType && updates.analysisType !== config.analysisType) {
      const analysisType = ANALYSIS_TYPES[updates.analysisType];
      newConfig.prompt = analysisType.defaultPrompt;
      newConfig.outputFormat = analysisType.outputFormat;
    }
    
    setConfig(newConfig);
    onConfigUpdate(newConfig);
  }, [config, onConfigUpdate]);

  // Test prompt with sample data
  const handleTestPrompt = useCallback(async () => {
    if (selectedLeadIds.length === 0) return;
    
    setIsTestingPrompt(true);
    
    try {
      // Simulate AI API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sampleLead = leads.find(l => selectedLeadIds.includes(l.id));
      if (!sampleLead) return;
      
      // Mock result based on analysis type
      let mockResult;
      const analysisType = ANALYSIS_TYPES[config.analysisType];
      
      switch (config.analysisType) {
        case 'lead_scoring':
          mockResult = Math.floor(Math.random() * 40) + 60; // 60-100
          break;
        case 'intent_analysis':
          mockResult = ['High Intent', 'Medium Intent', 'Low Intent'][Math.floor(Math.random() * 3)];
          break;
        case 'personalization':
          mockResult = `Hi ${sampleLead.firstName}, I noticed ${sampleLead.company} recently...`;
          break;
        default:
          mockResult = 'Sample AI analysis result';
      }
      
      setTestResult({
        success: true,
        result: mockResult,
        confidence: 0.85 + Math.random() * 0.1,
        reasoning: 'Based on available lead data including company size, job title, and contact information.',
        tokensUsed: 120,
        cost: 0.005,
        processingTime: 1.8,
        model: config.model,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResult({
        success: false,
        result: null,
        confidence: 0,
        tokensUsed: 0,
        cost: 0,
        processingTime: 0,
        model: config.model,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingPrompt(false);
    }
  }, [selectedLeadIds, leads, config]);

  // Start AI analysis
  const handleStartAnalysis = useCallback(() => {
    if (selectedLeadIds.length === 0) return;
    
    setIsRunning(true);
    onAnalysisStart(selectedLeadIds, config);
  }, [selectedLeadIds, config, onAnalysisStart]);

  // Stop analysis
  const handleStopAnalysis = useCallback(() => {
    const runningJobIds = columnJobs
      .filter(job => job.status === 'processing' || job.status === 'pending')
      .map(job => job.id);
    
    if (runningJobIds.length > 0) {
      onAnalysisStop(runningJobIds);
    }
    setIsRunning(false);
  }, [columnJobs, onAnalysisStop]);

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    if (!selectedProvider || !selectedModel) return 0;
    
    const avgTokens = 200; // Estimated average tokens per analysis
    const costPerLead = (avgTokens / 1000) * selectedProvider.pricing.inputTokens * selectedModel.costMultiplier;
    
    return selectedLeadIds.length * costPerLead;
  }, [selectedLeadIds.length, selectedProvider, selectedModel]);

  // Monitor running status
  useEffect(() => {
    const hasRunningJobs = columnJobs.some(job => 
      job.status === 'processing' || job.status === 'pending'
    );
    setIsRunning(hasRunningJobs);
  }, [columnJobs]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Analysis Configuration
          </div>
          {isRunning && (
            <Badge variant="secondary" className="flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Analyzing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            {/* Analysis Type */}
            <div className="space-y-2">
              <Label>Analysis Type</Label>
              <Select 
                value={config.analysisType} 
                onValueChange={(value: AIAnalysisType) => handleConfigChange({ analysisType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ANALYSIS_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center">
                        <type.icon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Provider & Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select 
                  value={config.provider} 
                  onValueChange={(value) => {
                    const provider = AI_PROVIDERS.find(p => p.id === value);
                    const firstModel = provider?.models[0];
                    handleConfigChange({ 
                      provider: value,
                      model: firstModel?.id || config.model
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center">
                          <provider.icon className="h-4 w-4 mr-2" />
                          {provider.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select 
                  value={config.model} 
                  onValueChange={(value) => handleConfigChange({ model: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider?.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-gray-500">{model.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Temperature ({config.temperature})</Label>
                <Slider
                  value={[config.temperature]}
                  onValueChange={(value) => handleConfigChange({ temperature: value[0] })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <div className="text-sm text-gray-600">
                  Lower = more focused, Higher = more creative
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  min={50}
                  max={2000}
                  value={config.maxTokens}
                  onChange={(e) => handleConfigChange({ maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Batch Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={config.batchSize}
                  onChange={(e) => handleConfigChange({ batchSize: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Confidence Threshold ({Math.round(config.confidenceThreshold * 100)}%)</Label>
                <Slider
                  value={[config.confidenceThreshold]}
                  onValueChange={(value) => handleConfigChange({ confidenceThreshold: value[0] })}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>

            {/* Auto-run */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-run for new leads</Label>
                <div className="text-sm text-gray-600">
                  Automatically analyze new leads as they're added
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
                    ${estimatedCost.toFixed(4)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedLeadIds.length} leads × ~${(estimatedCost / selectedLeadIds.length).toFixed(4)}/lead
                </div>
                <div className="text-sm text-gray-600">
                  Model: {selectedModel?.name} | Rate: ${selectedProvider?.pricing.inputTokens}/1k tokens
                </div>
              </div>
            )}
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>AI Prompt</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestPrompt}
                  disabled={isTestingPrompt || selectedLeadIds.length === 0}
                >
                  {isTestingPrompt ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Test Prompt
                </Button>
              </div>
              <Textarea
                value={config.prompt}
                onChange={(e) => handleConfigChange({ prompt: e.target.value })}
                placeholder="Enter your AI analysis prompt..."
                className="h-32 font-mono text-sm"
              />
              <div className="text-sm text-gray-600">
                Use specific instructions to get better results. The AI will have access to all lead data.
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label>Custom Instructions (Optional)</Label>
              <Textarea
                value={config.customInstructions || ''}
                onChange={(e) => handleConfigChange({ customInstructions: e.target.value })}
                placeholder="Additional context or specific requirements..."
                className="h-20 text-sm"
              />
            </div>

            {/* Test Result */}
            {testResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                    )}
                    Test Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded border">
                    <div className="font-mono text-sm">
                      {typeof testResult.result === 'object' 
                        ? JSON.stringify(testResult.result, null, 2)
                        : String(testResult.result)
                      }
                    </div>
                  </div>
                  
                  {testResult.success && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="ml-2 font-medium">
                          {Math.round(testResult.confidence * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tokens:</span>
                        <span className="ml-2 font-medium">{testResult.tokensUsed}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cost:</span>
                        <span className="ml-2 font-medium">${testResult.cost.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Time:</span>
                        <span className="ml-2 font-medium">{testResult.processingTime}s</span>
                      </div>
                    </div>
                  )}

                  {testResult.reasoning && (
                    <div className="text-sm">
                      <span className="text-gray-600">Reasoning:</span>
                      <p className="mt-1">{testResult.reasoning}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            {jobStats.total > 0 ? (
              <div className="space-y-4">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Analysis Progress</Label>
                    <span className="text-sm text-gray-600">
                      {jobStats.completed} / {jobStats.total}
                    </span>
                  </div>
                  <Progress value={jobStats.progress} className="w-full" />
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {jobStats.successRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {jobStats.avgConfidence}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Confidence</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ${jobStats.totalCost.toFixed(3)}
                      </div>
                      <div className="text-sm text-gray-600">Total Cost</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {jobStats.processing}
                      </div>
                      <div className="text-sm text-gray-600">Processing</div>
                    </CardContent>
                  </Card>
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
                            <span className="text-sm">Lead {job.leadId.slice(-6)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.result?.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(job.result.confidence * 100)}%
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
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No AI analysis jobs yet</p>
                <p className="text-sm">Configure settings and start analysis to see progress</p>
              </div>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {jobStats.completed > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {columnJobs
                    .filter(job => job.status === 'completed' && job.result?.success)
                    .map((job) => (
                      <Card key={job.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Lead {job.leadId.slice(-6)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                <Star className="h-3 w-3 mr-1" />
                                {Math.round((job.result?.confidence || 0) * 100)}%
                              </Badge>
                              <Badge variant="secondary">
                                ${job.result?.cost.toFixed(4)}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="p-2 bg-gray-50 rounded font-mono">
                              {typeof job.result?.result === 'object' 
                                ? JSON.stringify(job.result.result, null, 2)
                                : String(job.result?.result)
                              }
                            </div>
                            {job.result?.reasoning && (
                              <div className="mt-2 text-gray-600">
                                <strong>Reasoning:</strong> {job.result.reasoning}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No AI results yet</p>
                <p className="text-sm">Completed analyses will appear here with insights</p>
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
                onClick={handleStopAnalysis}
                className="flex items-center"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Stop Analysis
              </Button>
            ) : (
              <Button
                onClick={handleStartAnalysis}
                disabled={selectedLeadIds.length === 0}
                className="flex items-center"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Start AI Analysis
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIColumn;