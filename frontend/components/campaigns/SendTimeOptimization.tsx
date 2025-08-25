'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, BarChart3, Users, Globe, TrendingUp, Settings } from 'lucide-react';

interface OptimalTime {
  send_hour: number;
  send_dow: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  total_sent: number;
  performance_score: number;
}

interface TimezoneData {
  timezone: string;
  lead_count: number;
  avg_lead_score: number;
  engaged_count: number;
  optimal_windows: Array<{
    start: string;
    end: string;
    type: string;
    confidence: string;
  }>;
  recommendation: string;
}

interface ScheduleOption {
  scheduled_for: string;
  lead_segment: string;
  estimated_performance: {
    expected_open_rate: number;
    expected_click_rate: number;
    confidence_level: string;
  };
}

interface SendTimeOptimizationProps {
  campaignId: string;
  onScheduleChange: (schedules: ScheduleOption[]) => void;
}

export default function SendTimeOptimization({ campaignId, onScheduleChange }: SendTimeOptimizationProps) {
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([]);
  const [timezoneAnalysis, setTimezoneAnalysis] = useState<TimezoneData[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'optimized'>('optimized');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [optimizationSettings, setOptimizationSettings] = useState({
    preferBusinessHours: true,
    includeWeekends: false,
    respectTimezones: true,
    batchSize: 100,
    intervalMinutes: 30
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadOptimalTimes();
    loadTimezoneAnalysis();
  }, [campaignId, timezone]);

  const loadOptimalTimes = async () => {
    try {
      const response = await fetch(`/api/scheduling/optimal-times/${campaignId}?timezone=${timezone}`);
      const data = await response.json();
      
      if (data.success) {
        setOptimalTimes(data.data.optimalTimes);
        setRecommendations(data.data.recommendations);
      }
    } catch (error) {
      console.error('Error loading optimal times:', error);
    }
  };

  const loadTimezoneAnalysis = async () => {
    try {
      const response = await fetch(`/api/scheduling/timezone-analysis/${campaignId}`);
      const data = await response.json();
      
      if (data.success) {
        setTimezoneAnalysis(data.data);
      }
    } catch (error) {
      console.error('Error loading timezone analysis:', error);
    }
  };

  const handleScheduleCampaign = async () => {
    if (!campaignId) return;

    setLoading(true);
    try {
      const scheduleData = {
        scheduleType,
        scheduledFor: scheduleType === 'scheduled' ? `${selectedDate}T${selectedTime}:00.000Z` : null,
        timezone,
        optimizationSettings
      };

      const response = await fetch(`/api/scheduling/schedule-campaign/${campaignId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData)
      });

      const data = await response.json();
      
      if (data.success) {
        onScheduleChange(data.data.schedules);
      }
    } catch (error) {
      console.error('Error scheduling campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hour: number) => {
    return new Date(2024, 0, 1, hour, 0).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      hour12: true 
    });
  };

  const getPerformanceColor = (score: number) => {
    if (score > 0.4) return 'text-green-600';
    if (score > 0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Send Time Optimization</h2>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-600">Campaign scheduling and optimization</span>
        </div>
      </div>

      <Tabs defaultValue="optimization" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="timezones">Timezones</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Optimal Send Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Recommendations</h4>
                  <p className="text-blue-800 mb-1">{recommendations.primary}</p>
                  <p className="text-blue-700 text-sm mb-2">{recommendations.secondary}</p>
                  {recommendations.insights && recommendations.insights.length > 0 && (
                    <div className="space-y-1">
                      {recommendations.insights.map((insight: string, index: number) => (
                        <p key={index} className="text-blue-700 text-sm">• {insight}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4">
                {optimalTimes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {optimalTimes.slice(0, 6).map((time, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">
                            {dayNames[time.send_dow]} at {formatTime(time.send_hour)}
                          </div>
                          <Badge variant="outline" className={getPerformanceColor(time.performance_score)}>
                            {(time.performance_score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>Opens: {(time.open_rate * 100).toFixed(1)}%</div>
                          <div>Clicks: {(time.click_rate * 100).toFixed(1)}%</div>
                          <div>Replies: {(time.reply_rate * 100).toFixed(1)}%</div>
                          <div className="text-xs">Based on {time.total_sent} sends</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No historical data available for send time optimization.</p>
                    <p className="text-sm mt-1">Send some campaigns to build optimization data.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Optimization Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Prefer Business Hours</label>
                    <input
                      type="checkbox"
                      checked={optimizationSettings.preferBusinessHours}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        preferBusinessHours: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Include Weekends</label>
                    <input
                      type="checkbox"
                      checked={optimizationSettings.includeWeekends}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        includeWeekends: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Respect Recipient Timezones</label>
                    <input
                      type="checkbox"
                      checked={optimizationSettings.respectTimezones}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        respectTimezones: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Batch Size</label>
                    <input
                      type="number"
                      value={optimizationSettings.batchSize}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        batchSize: parseInt(e.target.value)
                      }))}
                      className="w-full p-2 border border-gray-300 rounded"
                      min="10"
                      max="1000"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Interval (minutes)</label>
                    <input
                      type="number"
                      value={optimizationSettings.intervalMinutes}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        intervalMinutes: parseInt(e.target.value)
                      }))}
                      className="w-full p-2 border border-gray-300 rounded"
                      min="5"
                      max="180"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {optimalTimes.length > 0 ? (
                <div className="space-y-6">
                  {/* Performance Chart Placeholder */}
                  <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600">Send Time Performance Chart</p>
                      <p className="text-sm text-gray-500">Interactive chart coming soon</p>
                    </div>
                  </div>
                  
                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {(optimalTimes[0]?.open_rate * 100 || 0).toFixed(1)}%
                      </div>
                      <div className="text-sm text-green-700">Best Open Rate</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {(optimalTimes[0]?.click_rate * 100 || 0).toFixed(1)}%
                      </div>
                      <div className="text-sm text-blue-700">Best Click Rate</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded">
                      <div className="text-2xl font-bold text-purple-600">
                        {optimalTimes.reduce((sum, t) => sum + t.total_sent, 0)}
                      </div>
                      <div className="text-sm text-purple-700">Total Sends</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No analytics data available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timezones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Timezone Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timezoneAnalysis.length > 0 ? (
                <div className="space-y-4">
                  {timezoneAnalysis.map((tz, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{tz.timezone || 'Unknown'}</h4>
                          <p className="text-sm text-gray-600">{tz.lead_count} leads</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Avg Score: {tz.avg_lead_score?.toFixed(1) || 'N/A'}</div>
                          <div className="text-sm text-gray-600">
                            Engaged: {tz.engaged_count} ({((tz.engaged_count / tz.lead_count) * 100).toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-700">{tz.recommendation}</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {tz.optimal_windows.map((window, wIndex) => (
                          <div key={wIndex} className="text-center p-2 bg-gray-50 rounded text-xs">
                            <div className="font-medium capitalize">{window.type}</div>
                            <div>{window.start} - {window.end}</div>
                            <Badge 
                              variant="outline" 
                              className={`mt-1 ${getConfidenceBadgeColor(window.confidence)}`}
                            >
                              {window.confidence}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No timezone data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Schedule Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setScheduleType('immediate')}
                      className={`p-3 border rounded text-center ${
                        scheduleType === 'immediate' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="font-medium">Send Now</div>
                      <div className="text-xs text-gray-600">Immediate delivery</div>
                    </button>
                    
                    <button
                      onClick={() => setScheduleType('scheduled')}
                      className={`p-3 border rounded text-center ${
                        scheduleType === 'scheduled' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="font-medium">Schedule</div>
                      <div className="text-xs text-gray-600">Pick date & time</div>
                    </button>
                    
                    <button
                      onClick={() => setScheduleType('optimized')}
                      className={`p-3 border rounded text-center ${
                        scheduleType === 'optimized' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="font-medium">Optimize</div>
                      <div className="text-xs text-gray-600">AI-powered timing</div>
                    </button>
                  </div>
                </div>

                {scheduleType === 'scheduled' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Time</label>
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                )}

                {scheduleType === 'optimized' && (
                  <div className="p-4 bg-blue-50 rounded">
                    <h4 className="font-medium text-blue-900 mb-2">AI Optimization Active</h4>
                    <p className="text-blue-800 text-sm mb-2">
                      Your campaign will be sent at optimal times based on:
                    </p>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Historical performance data</li>
                      <li>• Recipient timezone preferences</li>
                      <li>• Lead segment characteristics</li>
                      <li>• Industry best practices</li>
                    </ul>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleScheduleCampaign}
                    disabled={loading || (scheduleType === 'scheduled' && (!selectedDate || !selectedTime))}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Scheduling...' : 'Schedule Campaign'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}