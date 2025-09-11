'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Timer
} from 'lucide-react';

interface Schedule {
  id: string;
  campaign_id: string;
  campaign_name: string;
  scheduled_for: string;
  lead_segment: string;
  timezone: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'paused';
  optimization_settings: any;
  estimated_performance: {
    expected_open_rate: number;
    expected_click_rate: number;
    confidence_level: string;
  };
  created_at: string;
}

interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  rules: any;
  priority: number;
  is_active: boolean;
  campaign_types: string[];
  created_at: string;
}

export default function SchedulingDashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [optimizationRules, setOptimizationRules] = useState<OptimizationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rules: {
      prefer_business_hours: true,
      avoid_weekends: true,
      respect_timezones: true,
      minimum_interval_minutes: 30,
      maximum_daily_sends: 500
    },
    priority: 50,
    campaign_types: ['all']
  });

  useEffect(() => {
    loadSchedules();
    loadOptimizationRules();
  }, []);

  const loadSchedules = async () => {
    try {
      // For now, we'll simulate loading schedules
      // In practice, this would fetch from /api/scheduling/schedules
      const mockSchedules: Schedule[] = [
        {
          id: '1',
          campaign_id: 'camp-1',
          campaign_name: 'Product Launch Campaign',
          scheduled_for: '2024-01-15T10:00:00Z',
          lead_segment: 'High Value Prospects',
          timezone: 'America/New_York',
          status: 'scheduled',
          optimization_settings: { preferBusinessHours: true },
          estimated_performance: {
            expected_open_rate: 0.25,
            expected_click_rate: 0.05,
            confidence_level: 'high'
          },
          created_at: '2024-01-10T12:00:00Z'
        },
        {
          id: '2',
          campaign_id: 'camp-2',
          campaign_name: 'Follow-up Sequence',
          scheduled_for: '2024-01-16T14:30:00Z',
          lead_segment: 'Warm Leads',
          timezone: 'UTC',
          status: 'running',
          optimization_settings: { respectTimezones: true },
          estimated_performance: {
            expected_open_rate: 0.22,
            expected_click_rate: 0.04,
            confidence_level: 'medium'
          },
          created_at: '2024-01-12T09:00:00Z'
        }
      ];
      setSchedules(mockSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadOptimizationRules = async () => {
    try {
      const response = await fetch('/api/scheduling/optimization-rules');
      const data = await response.json();
      
      if (data.success) {
        setOptimizationRules(data.data);
      }
    } catch (error) {
      console.error('Error loading optimization rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOptimizationRule = async () => {
    try {
      const response = await fetch('/api/scheduling/optimization-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRule)
      });

      const data = await response.json();
      
      if (data.success) {
        setOptimizationRules(prev => [data.data, ...prev]);
        setShowNewRuleForm(false);
        setNewRule({
          name: '',
          description: '',
          rules: {
            prefer_business_hours: true,
            avoid_weekends: true,
            respect_timezones: true,
            minimum_interval_minutes: 30,
            maximum_daily_sends: 500
          },
          priority: 50,
          campaign_types: ['all']
        });
      }
    } catch (error) {
      console.error('Error creating optimization rule:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'running':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredSchedules = schedules.filter(schedule => {
    switch (activeTab) {
      case 'scheduled':
        return schedule.status === 'scheduled';
      case 'running':
        return schedule.status === 'running';
      case 'completed':
        return schedule.status === 'completed';
      case 'all':
        return true;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Scheduling Dashboard</h1>
        <Button onClick={() => setShowNewRuleForm(true)} className="bg-blue-600 hover:bg-blue-700">
          Create Optimization Rule
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {schedules.filter(s => s.status === 'scheduled').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Running</p>
                <p className="text-2xl font-bold text-green-600">
                  {schedules.filter(s => s.status === 'running').length}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {schedules.filter(s => s.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Optimization Rules</p>
                <p className="text-2xl font-bold text-purple-600">
                  {optimizationRules.filter(r => r.is_active).length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">Campaign Schedules</TabsTrigger>
          <TabsTrigger value="rules">Optimization Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({schedules.length})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'scheduled' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Scheduled ({schedules.filter(s => s.status === 'scheduled').length})
            </button>
            <button
              onClick={() => setActiveTab('running')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'running' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Running ({schedules.filter(s => s.status === 'running').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Completed ({schedules.filter(s => s.status === 'completed').length})
            </button>
          </div>

          <div className="grid gap-4">
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(schedule.status)}
                          <h3 className="text-lg font-semibold">{schedule.campaign_name}</h3>
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">Scheduled</span>
                            </div>
                            <div>{formatDateTime(schedule.scheduled_for)}</div>
                            <div className="text-xs">{schedule.timezone}</div>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">Segment</span>
                            </div>
                            <div>{schedule.lead_segment}</div>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="w-4 h-4" />
                              <span className="font-medium">Expected Performance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Open: {(schedule.estimated_performance.expected_open_rate * 100).toFixed(1)}%</span>
                              <span>Click: {(schedule.estimated_performance.expected_click_rate * 100).toFixed(1)}%</span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={getConfidenceBadgeColor(schedule.estimated_performance.confidence_level)}
                            >
                              {schedule.estimated_performance.confidence_level} confidence
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {schedule.status === 'running' && (
                          <Button variant="outline" size="sm">
                            <Pause className="w-4 h-4" />
                          </Button>
                        )}
                        {schedule.status === 'scheduled' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Timer className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
                <p className="text-gray-600">
                  {activeTab === 'all' 
                    ? 'Create your first campaign schedule to get started.'
                    : `No ${activeTab} schedules at the moment.`
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {showNewRuleForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Optimization Rule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Rule Name</label>
                      <input
                        type="text"
                        value={newRule.name}
                        onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Business Hours Priority"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Priority (1-100)</label>
                      <input
                        type="number"
                        value={newRule.priority}
                        onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        className="w-full p-2 border border-gray-300 rounded"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={newRule.description}
                      onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded"
                      rows={2}
                      placeholder="Optimize send times for business hours and avoid weekends..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Timing Rules</h4>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Prefer Business Hours</label>
                        <input
                          type="checkbox"
                          checked={newRule.rules.prefer_business_hours}
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            rules: { ...prev.rules, prefer_business_hours: e.target.checked }
                          }))}
                          className="rounded border-gray-300"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Avoid Weekends</label>
                        <input
                          type="checkbox"
                          checked={newRule.rules.avoid_weekends}
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            rules: { ...prev.rules, avoid_weekends: e.target.checked }
                          }))}
                          className="rounded border-gray-300"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Respect Timezones</label>
                        <input
                          type="checkbox"
                          checked={newRule.rules.respect_timezones}
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            rules: { ...prev.rules, respect_timezones: e.target.checked }
                          }))}
                          className="rounded border-gray-300"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium">Sending Limits</h4>
                      
                      <div>
                        <label className="text-sm block mb-1">Minimum Interval (minutes)</label>
                        <input
                          type="number"
                          value={newRule.rules.minimum_interval_minutes}
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            rules: { ...prev.rules, minimum_interval_minutes: parseInt(e.target.value) }
                          }))}
                          className="w-full p-2 border border-gray-300 rounded"
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm block mb-1">Max Daily Sends</label>
                        <input
                          type="number"
                          value={newRule.rules.maximum_daily_sends}
                          onChange={(e) => setNewRule(prev => ({
                            ...prev,
                            rules: { ...prev.rules, maximum_daily_sends: parseInt(e.target.value) }
                          }))}
                          className="w-full p-2 border border-gray-300 rounded"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewRuleForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={createOptimizationRule}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create Rule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {optimizationRules.length > 0 ? (
              optimizationRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{rule.description}</p>
                        
                        <div className="text-sm text-gray-500">
                          Created {formatDateTime(rule.created_at)} • 
                          Applies to: {rule.campaign_types.join(', ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No optimization rules</h3>
                <p className="text-gray-600">Create rules to automate your send time optimization.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}