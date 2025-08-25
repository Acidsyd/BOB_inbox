'use client';

/**
 * API Configuration Panel
 * Manages API integrations for enrichment and AI services
 */

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Icons
import {
  Settings,
  Key,
  Globe,
  Shield,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  TestTube
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
export interface APIProvider {
  id: string;
  name: string;
  description: string;
  category: 'enrichment' | 'ai' | 'verification' | 'lookup';
  icon: React.ComponentType;
  baseUrl: string;
  authType: 'api_key' | 'oauth2' | 'bearer' | 'basic';
  isConfigured: boolean;
  isActive: boolean;
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  pricing: {
    model: 'pay_per_use' | 'subscription' | 'freemium';
    freeQuota?: number;
    costPer1k?: number;
    currency: string;
  };
  rateLimit: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
  features: string[];
}

export interface APIConfiguration {
  providerId: string;
  credentials: Record<string, string>;
  settings: Record<string, any>;
  isActive: boolean;
  usage: {
    requests: number;
    cost: number;
    quota: number;
    lastReset: string;
  };
  webhooks?: {
    endpoint: string;
    secret: string;
    events: string[];
  };
}

export interface APIUsageMetrics {
  providerId: string;
  period: '24h' | '7d' | '30d';
  requests: number;
  successRate: number;
  avgResponseTime: number;
  cost: number;
  errors: number;
  quota: number;
  quotaUsed: number;
}

interface APIConfigPanelProps {
  configurations: APIConfiguration[];
  usageMetrics: APIUsageMetrics[];
  onUpdateConfig: (providerId: string, config: APIConfiguration) => void;
  onTestConnection: (providerId: string) => Promise<boolean>;
  onDeleteConfig: (providerId: string) => void;
  className?: string;
}

// Sample API Providers
const SAMPLE_PROVIDERS: APIProvider[] = [
  {
    id: 'clearbit',
    name: 'Clearbit',
    description: 'Company and person data enrichment',
    category: 'enrichment',
    icon: Globe,
    baseUrl: 'https://person.clearbit.com',
    authType: 'api_key',
    isConfigured: true,
    isActive: true,
    lastTested: '2024-01-15T10:30:00Z',
    testStatus: 'success',
    pricing: {
      model: 'pay_per_use',
      freeQuota: 50,
      costPer1k: 2.50,
      currency: 'USD'
    },
    rateLimit: {
      requests: 600,
      period: 'minute'
    },
    features: ['Person Enrichment', 'Company Enrichment', 'Logo API']
  },
  {
    id: 'hunter',
    name: 'Hunter.io',
    description: 'Email finder and verification',
    category: 'enrichment',
    icon: Shield,
    baseUrl: 'https://api.hunter.io',
    authType: 'api_key',
    isConfigured: true,
    isActive: true,
    lastTested: '2024-01-15T09:15:00Z',
    testStatus: 'success',
    pricing: {
      model: 'freemium',
      freeQuota: 25,
      costPer1k: 1.00,
      currency: 'USD'
    },
    rateLimit: {
      requests: 300,
      period: 'minute'
    },
    features: ['Email Finder', 'Email Verifier', 'Domain Search']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models for AI analysis',
    category: 'ai',
    icon: Zap,
    baseUrl: 'https://api.openai.com',
    authType: 'bearer',
    isConfigured: false,
    isActive: false,
    pricing: {
      model: 'pay_per_use',
      costPer1k: 0.03,
      currency: 'USD'
    },
    rateLimit: {
      requests: 3500,
      period: 'minute'
    },
    features: ['GPT-4', 'GPT-3.5', 'Embeddings', 'Fine-tuning']
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    description: 'Contact and company data',
    category: 'enrichment',
    icon: Activity,
    baseUrl: 'https://api.apollo.io',
    authType: 'api_key',
    isConfigured: false,
    isActive: false,
    pricing: {
      model: 'subscription',
      freeQuota: 10,
      costPer1k: 1.50,
      currency: 'USD'
    },
    rateLimit: {
      requests: 200,
      period: 'minute'
    },
    features: ['Contact Search', 'Company Search', 'Enrichment']
  }
];

const APIConfigPanel: React.FC<APIConfigPanelProps> = ({
  configurations,
  usageMetrics,
  onUpdateConfig,
  onTestConnection,
  onDeleteConfig,
  className
}) => {
  const [selectedProvider, setSelectedProvider] = useState<APIProvider | null>(null);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [isTestingConnection, setIsTestingConnection] = useState<Record<string, boolean>>({});
  const [configForm, setConfigForm] = useState<Partial<APIConfiguration>>({});
  const [activeTab, setActiveTab] = useState('overview');

  // Merge sample providers with actual configurations
  const providers = useMemo(() => {
    return SAMPLE_PROVIDERS.map(provider => {
      const config = configurations.find(c => c.providerId === provider.id);
      return {
        ...provider,
        isConfigured: !!config,
        isActive: config?.isActive || false
      };
    });
  }, [configurations]);

  // Get configured providers
  const configuredProviders = providers.filter(p => p.isConfigured);
  const unconfiguredProviders = providers.filter(p => !p.isConfigured);

  // Calculate total usage metrics
  const totalMetrics = useMemo(() => {
    return usageMetrics.reduce((total, metric) => ({
      requests: total.requests + metric.requests,
      cost: total.cost + metric.cost,
      errors: total.errors + metric.errors
    }), { requests: 0, cost: 0, errors: 0 });
  }, [usageMetrics]);

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    setConfigForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle credential changes
  const handleCredentialChange = (key: string, value: string) => {
    setConfigForm(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [key]: value
      }
    }));
  };

  // Test connection
  const handleTestConnection = async (providerId: string) => {
    setIsTestingConnection(prev => ({ ...prev, [providerId]: true }));
    try {
      const success = await onTestConnection(providerId);
      // Update provider test status would be handled by parent component
    } finally {
      setIsTestingConnection(prev => ({ ...prev, [providerId]: false }));
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!selectedProvider || !configForm.credentials) return;
    
    const config: APIConfiguration = {
      providerId: selectedProvider.id,
      credentials: configForm.credentials,
      settings: configForm.settings || {},
      isActive: configForm.isActive ?? true,
      usage: {
        requests: 0,
        cost: 0,
        quota: selectedProvider.pricing.freeQuota || 0,
        lastReset: new Date().toISOString()
      },
      webhooks: configForm.webhooks
    };
    
    onUpdateConfig(selectedProvider.id, config);
    setSelectedProvider(null);
    setConfigForm({});
  };

  // Toggle credential visibility
  const toggleCredentialVisibility = (providerId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  // Get credential fields for provider
  const getCredentialFields = (provider: APIProvider) => {
    switch (provider.authType) {
      case 'api_key':
        return [{ key: 'api_key', label: 'API Key', type: 'password' }];
      case 'bearer':
        return [{ key: 'token', label: 'Bearer Token', type: 'password' }];
      case 'basic':
        return [
          { key: 'username', label: 'Username', type: 'text' },
          { key: 'password', label: 'Password', type: 'password' }
        ];
      case 'oauth2':
        return [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Integrations</h2>
          <p className="text-gray-600">
            Configure and manage your external API connections
          </p>
        </div>
        <Button onClick={() => setActiveTab('add-new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">{totalMetrics.requests.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${totalMetrics.cost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold">{configuredProviders.filter(p => p.isActive).length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configured">Configured</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="add-new">Add New</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {providers.map((provider) => {
              const config = configurations.find(c => c.providerId === provider.id);
              const metrics = usageMetrics.find(m => m.providerId === provider.id);

              return (
                <Card key={provider.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <provider.icon className="h-8 w-8 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{provider.name}</h3>
                            <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                              {provider.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">{provider.category}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Rate: {provider.rateLimit.requests}/{provider.rateLimit.period}</span>
                            <span>Cost: ${provider.pricing.costPer1k}/1k calls</span>
                            {provider.pricing.freeQuota && (
                              <span>Free: {provider.pricing.freeQuota} calls</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {provider.isConfigured && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestConnection(provider.id)}
                              disabled={isTestingConnection[provider.id]}
                            >
                              {isTestingConnection[provider.id] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube className="h-4 w-4" />
                              )}
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedProvider(provider)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          </>
                        )}
                        {!provider.isConfigured && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProvider(provider);
                              setActiveTab('add-new');
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Usage metrics for configured providers */}
                    {provider.isConfigured && metrics && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Requests (30d)</p>
                            <p className="font-semibold">{metrics.requests.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Success Rate</p>
                            <p className="font-semibold">{metrics.successRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Avg Response</p>
                            <p className="font-semibold">{metrics.avgResponseTime}ms</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Cost</p>
                            <p className="font-semibold">${metrics.cost.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Configured Tab */}
        <TabsContent value="configured" className="space-y-4">
          {configuredProviders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No APIs Configured</h3>
                <p className="text-gray-600 mb-4">
                  Configure your first API integration to start enriching your data
                </p>
                <Button onClick={() => setActiveTab('add-new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {configuredProviders.map((provider) => {
                const config = configurations.find(c => c.providerId === provider.id);
                if (!config) return null;

                return (
                  <Card key={provider.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <provider.icon className="h-5 w-5" />
                          <span>{provider.name}</span>
                          <Badge variant={config.isActive ? 'default' : 'secondary'}>
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={config.isActive}
                            onCheckedChange={(checked) => 
                              onUpdateConfig(provider.id, { ...config, isActive: checked })
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDeleteConfig(provider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Credentials */}
                      <div>
                        <Label className="text-sm font-medium">Credentials</Label>
                        <div className="mt-2 space-y-2">
                          {getCredentialFields(provider).map((field) => (
                            <div key={field.key} className="flex items-center space-x-2">
                              <Label className="w-24 text-xs">{field.label}</Label>
                              <Input
                                type={showCredentials[provider.id] ? 'text' : 'password'}
                                value={config.credentials[field.key] || ''}
                                readOnly
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleCredentialVisibility(provider.id)}
                              >
                                {showCredentials[provider.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Usage */}
                      <div>
                        <Label className="text-sm font-medium">Usage</Label>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Quota Used</span>
                            <span>{config.usage.requests} / {config.usage.quota}</span>
                          </div>
                          <Progress 
                            value={(config.usage.requests / config.usage.quota) * 100} 
                            className="w-full" 
                          />
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Cost</p>
                              <p className="font-semibold">${config.usage.cost.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Requests</p>
                              <p className="font-semibold">{config.usage.requests}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Reset</p>
                              <p className="font-semibold">
                                {new Date(config.usage.lastReset).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Connection Test */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center space-x-2">
                          {provider.testStatus === 'success' && (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">Connected</span>
                            </>
                          )}
                          {provider.testStatus === 'failed' && (
                            <>
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600">Connection Failed</span>
                            </>
                          )}
                          {provider.lastTested && (
                            <span className="text-xs text-gray-500">
                              Last tested: {new Date(provider.lastTested).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConnection(provider.id)}
                          disabled={isTestingConnection[provider.id]}
                        >
                          {isTestingConnection[provider.id] ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <TestTube className="h-4 w-4 mr-2" />
                          )}
                          Test Connection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4">
            {usageMetrics.map((metric) => {
              const provider = providers.find(p => p.id === metric.providerId);
              if (!provider) return null;

              return (
                <Card key={metric.providerId}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <provider.icon className="h-5 w-5" />
                      <span>{provider.name}</span>
                      <Badge variant="outline">{metric.period}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">Requests</p>
                        <p className="text-2xl font-bold">{metric.requests.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600">{metric.successRate.toFixed(1)}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">Avg Response</p>
                        <p className="text-2xl font-bold">{metric.avgResponseTime}ms</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">Cost</p>
                        <p className="text-2xl font-bold">${metric.cost.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quota Usage</span>
                        <span>{metric.quotaUsed} / {metric.quota}</span>
                      </div>
                      <Progress value={(metric.quotaUsed / metric.quota) * 100} />
                    </div>

                    {metric.errors > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">{metric.errors} errors in the last {metric.period}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Add New Tab */}
        <TabsContent value="add-new" className="space-y-4">
          {selectedProvider ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <selectedProvider.icon className="h-5 w-5" />
                  <span>Configure {selectedProvider.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Authentication</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedProvider.description}</p>
                </div>

                {/* Credential Fields */}
                <div className="space-y-3">
                  {getCredentialFields(selectedProvider).map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        value={configForm.credentials?.[field.key] || ''}
                        onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                        placeholder={`Enter your ${field.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Settings */}
                <div className="space-y-3">
                  <Label>Settings</Label>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Integration</Label>
                      <p className="text-sm text-gray-600">Activate this API for use in enrichment</p>
                    </div>
                    <Switch
                      checked={configForm.isActive ?? true}
                      onCheckedChange={(checked) => handleFormChange('isActive', checked)}
                    />
                  </div>
                </div>

                {/* Webhook Configuration */}
                <div className="space-y-3">
                  <Label>Webhooks (Optional)</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Webhook endpoint URL"
                      value={configForm.webhooks?.endpoint || ''}
                      onChange={(e) => handleFormChange('webhooks', {
                        ...configForm.webhooks,
                        endpoint: e.target.value
                      })}
                    />
                    <Input
                      placeholder="Webhook secret"
                      type="password"
                      value={configForm.webhooks?.secret || ''}
                      onChange={(e) => handleFormChange('webhooks', {
                        ...configForm.webhooks,
                        secret: e.target.value
                      })}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedProvider(null);
                      setConfigForm({});
                    }}
                  >
                    Cancel
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleTestConnection(selectedProvider.id)}
                      disabled={!configForm.credentials || Object.keys(configForm.credentials).length === 0}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                    <Button
                      onClick={handleSaveConfig}
                      disabled={!configForm.credentials || Object.keys(configForm.credentials).length === 0}
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <h3 className="text-lg font-semibold">Available Integrations</h3>
              {unconfiguredProviders.map((provider) => (
                <Card key={provider.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4" onClick={() => setSelectedProvider(provider)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <provider.icon className="h-8 w-8 text-gray-600 mt-1" />
                        <div>
                          <h4 className="font-semibold">{provider.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline">{provider.category}</Badge>
                            <span className="text-xs text-gray-500">
                              {provider.pricing.model === 'freemium' && `${provider.pricing.freeQuota} free calls`}
                              {provider.pricing.costPer1k && ` • $${provider.pricing.costPer1k}/1k calls`}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {provider.features.map((feature) => (
                              <Badge key={feature} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIConfigPanel;