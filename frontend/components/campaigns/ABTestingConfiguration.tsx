'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TestTube, 
  TrendingUp, 
  Users, 
  Clock, 
  BarChart3, 
  Zap,
  AlertCircle,
  Info
} from 'lucide-react'

interface ABTestConfig {
  testType: 'subject_line' | 'content' | 'send_time' | 'sender_name'
  trafficSplit: number
  minimumSampleSize: number
  confidenceLevel: number
  testDurationHours: number
  variants: {
    control: any
    test: any
  }
}

interface CampaignData {
  abTestEnabled: boolean
  abTestConfig?: ABTestConfig
  emailSubject: string
  emailContent: string
  csvData: any[]
}

interface ABTestingConfigurationProps {
  campaignData: CampaignData
  updateCampaignData: (data: Partial<CampaignData>) => void
}

const TEST_TYPES = [
  {
    id: 'subject_line',
    name: 'Subject Line',
    description: 'Test different subject lines to optimize open rates',
    icon: Mail,
    impact: 'High',
    difficulty: 'Easy',
    expectedImprovement: '15-25%'
  },
  {
    id: 'content',
    name: 'Email Content',
    description: 'Test different email body content and messaging',
    icon: Zap,
    impact: 'High',
    difficulty: 'Medium',
    expectedImprovement: '20-35%'
  },
  {
    id: 'send_time',
    name: 'Send Time',
    description: 'Test different sending times for optimal engagement',
    icon: Clock,
    impact: 'Medium',
    difficulty: 'Easy',
    expectedImprovement: '8-15%'
  },
  {
    id: 'sender_name',
    name: 'Sender Name',
    description: 'Test different sender names and signatures',
    icon: Users,
    impact: 'Medium',
    difficulty: 'Easy',
    expectedImprovement: '5-12%'
  }
]

const IMPACT_COLORS = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800'
}

const DIFFICULTY_COLORS = {
  Easy: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Hard: 'bg-red-100 text-red-800'
}

export default function ABTestingConfiguration({ 
  campaignData, 
  updateCampaignData 
}: ABTestingConfigurationProps) {
  const [selectedTestType, setSelectedTestType] = useState<string>('')
  const [trafficSplit, setTrafficSplit] = useState(50)
  const [minimumSampleSize, setMinimumSampleSize] = useState(100)
  const [confidenceLevel, setConfidenceLevel] = useState(95)
  const [testDurationHours, setTestDurationHours] = useState(48)
  
  // Variant data
  const [controlVariant, setControlVariant] = useState<any>({})
  const [testVariant, setTestVariant] = useState<any>({})

  const handleToggleABTest = (enabled: boolean) => {
    if (enabled) {
      // Initialize with default config
      const defaultConfig: ABTestConfig = {
        testType: 'subject_line',
        trafficSplit: 50,
        minimumSampleSize: 100,
        confidenceLevel: 95,
        testDurationHours: 48,
        variants: {
          control: { subject_line: campaignData.emailSubject },
          test: { subject_line: '' }
        }
      }
      updateCampaignData({ 
        abTestEnabled: true,
        abTestConfig: defaultConfig
      })
      setSelectedTestType('subject_line')
      setControlVariant(defaultConfig.variants.control)
      setTestVariant(defaultConfig.variants.test)
    } else {
      updateCampaignData({ 
        abTestEnabled: false,
        abTestConfig: undefined
      })
      setSelectedTestType('')
    }
  }

  const handleTestTypeChange = (testType: string) => {
    setSelectedTestType(testType)
    
    let control: any = {}
    let test: any = {}
    
    switch (testType) {
      case 'subject_line':
        control = { subject_line: campaignData.emailSubject }
        test = { subject_line: '' }
        break
      case 'content':
        control = { content: campaignData.emailContent }
        test = { content: '' }
        break
      case 'send_time':
        control = { send_hour: 9 }
        test = { send_hour: 14 }
        break
      case 'sender_name':
        control = { sender_name: 'Your Name' }
        test = { sender_name: 'Alternative Name' }
        break
    }
    
    setControlVariant(control)
    setTestVariant(test)
    
    updateCampaignData({
      abTestConfig: {
        ...campaignData.abTestConfig!,
        testType: testType as any,
        variants: { control, test }
      }
    })
  }

  const updateVariant = (variantType: 'control' | 'test', field: string, value: any) => {
    const updatedVariant = {
      ...(variantType === 'control' ? controlVariant : testVariant),
      [field]: value
    }
    
    if (variantType === 'control') {
      setControlVariant(updatedVariant)
    } else {
      setTestVariant(updatedVariant)
    }
    
    updateCampaignData({
      abTestConfig: {
        ...campaignData.abTestConfig!,
        variants: {
          control: variantType === 'control' ? updatedVariant : controlVariant,
          test: variantType === 'test' ? updatedVariant : testVariant
        }
      }
    })
  }

  const updateTestSettings = (field: keyof ABTestConfig, value: any) => {
    updateCampaignData({
      abTestConfig: {
        ...campaignData.abTestConfig!,
        [field]: value
      }
    })
  }

  const canRunABTest = () => {
    const leadCount = campaignData.csvData.length
    return leadCount >= minimumSampleSize
  }

  const getEstimatedDuration = () => {
    const leadCount = campaignData.csvData.length
    const dailyVolume = Math.min(leadCount, 100) // Assume max 100 emails per day
    const daysNeeded = Math.ceil(minimumSampleSize / dailyVolume)
    return Math.max(daysNeeded, Math.ceil(testDurationHours / 24))
  }

  return (
    <div className="space-y-6">
      {/* A/B Testing Toggle */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <TestTube className="h-8 w-8 text-purple-600 mr-3" />
          <h3 className="text-xl font-semibold">A/B Testing</h3>
        </div>
        <p className="text-gray-600 mb-6">
          Split test your campaign to optimize performance and maximize results
        </p>
        
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={campaignData.abTestEnabled ? "outline" : "default"}
            onClick={() => handleToggleABTest(false)}
            className="w-32"
          >
            Skip A/B Test
          </Button>
          <Button
            variant={campaignData.abTestEnabled ? "default" : "outline"}
            onClick={() => handleToggleABTest(true)}
            className="w-32"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Enable A/B Test
          </Button>
        </div>
      </div>

      {campaignData.abTestEnabled && (
        <>
          {/* A/B Test Eligibility Check */}
          {!canRunABTest() && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-orange-800">Insufficient Sample Size</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      You need at least {minimumSampleSize} leads for reliable A/B testing. 
                      You currently have {campaignData.csvData.length} leads.
                      Consider reducing the minimum sample size or adding more leads.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose What to Test</CardTitle>
              <CardDescription>
                Select the element you want to test to optimize your campaign performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEST_TYPES.map((testType) => {
                  const Icon = testType.icon
                  const isSelected = selectedTestType === testType.id
                  
                  return (
                    <Card
                      key={testType.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected 
                          ? 'ring-2 ring-purple-500 bg-purple-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleTestTypeChange(testType.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Icon className={`h-6 w-6 mt-1 ${
                            isSelected ? 'text-purple-600' : 'text-gray-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{testType.name}</h4>
                              <div className="flex space-x-2">
                                <Badge className={IMPACT_COLORS[testType.impact]}>
                                  {testType.impact} Impact
                                </Badge>
                                <Badge className={DIFFICULTY_COLORS[testType.difficulty]}>
                                  {testType.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {testType.description}
                            </p>
                            <div className="flex items-center text-sm text-green-600">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Expected: {testType.expectedImprovement} improvement
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Test Configuration */}
          {selectedTestType && (
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
                <CardDescription>
                  Configure your A/B test parameters for optimal results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Test Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="trafficSplit">Traffic Split (%)</Label>
                    <Input
                      id="trafficSplit"
                      type="number"
                      value={trafficSplit}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 50
                        setTrafficSplit(Math.min(90, Math.max(10, value)))
                        updateTestSettings('trafficSplit', value)
                      }}
                      min="10"
                      max="90"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {trafficSplit}% control, {100 - trafficSplit}% test
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="sampleSize">Min Sample Size</Label>
                    <Input
                      id="sampleSize"
                      type="number"
                      value={minimumSampleSize}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 100
                        setMinimumSampleSize(value)
                        updateTestSettings('minimumSampleSize', value)
                      }}
                      min="50"
                      max="1000"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confidence">Confidence Level (%)</Label>
                    <Input
                      id="confidence"
                      type="number"
                      value={confidenceLevel}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 95
                        setConfidenceLevel(Math.min(99, Math.max(80, value)))
                        updateTestSettings('confidenceLevel', value)
                      }}
                      min="80"
                      max="99"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={testDurationHours}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 48
                        setTestDurationHours(value)
                        updateTestSettings('testDurationHours', value)
                      }}
                      min="24"
                      max="168"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Variant Configuration */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Control Variant */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Control (Version A)</CardTitle>
                      <CardDescription>Your current version - the baseline</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedTestType === 'subject_line' && (
                        <div>
                          <Label>Subject Line</Label>
                          <Input
                            value={controlVariant.subject_line || ''}
                            onChange={(e) => updateVariant('control', 'subject_line', e.target.value)}
                            placeholder="Original subject line"
                            className="mt-1"
                          />
                        </div>
                      )}
                      
                      {selectedTestType === 'content' && (
                        <div>
                          <Label>Email Content</Label>
                          <textarea
                            value={controlVariant.content || ''}
                            onChange={(e) => updateVariant('control', 'content', e.target.value)}
                            placeholder="Original email content"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            rows={4}
                          />
                        </div>
                      )}
                      
                      {selectedTestType === 'send_time' && (
                        <div>
                          <Label>Send Hour</Label>
                          <select
                            value={controlVariant.send_hour || 9}
                            onChange={(e) => updateVariant('control', 'send_hour', parseInt(e.target.value))}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          >
                            {Array.from({length: 24}, (_, i) => (
                              <option key={i} value={i}>
                                {String(i).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {selectedTestType === 'sender_name' && (
                        <div>
                          <Label>Sender Name</Label>
                          <Input
                            value={controlVariant.sender_name || ''}
                            onChange={(e) => updateVariant('control', 'sender_name', e.target.value)}
                            placeholder="Original sender name"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Test Variant */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Test (Version B)</CardTitle>
                      <CardDescription>The variation you want to test</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedTestType === 'subject_line' && (
                        <div>
                          <Label>Subject Line</Label>
                          <Input
                            value={testVariant.subject_line || ''}
                            onChange={(e) => updateVariant('test', 'subject_line', e.target.value)}
                            placeholder="Alternative subject line"
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Try different hooks, urgency, or personalization
                          </p>
                        </div>
                      )}
                      
                      {selectedTestType === 'content' && (
                        <div>
                          <Label>Email Content</Label>
                          <textarea
                            value={testVariant.content || ''}
                            onChange={(e) => updateVariant('test', 'content', e.target.value)}
                            placeholder="Alternative email content"
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            rows={4}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Try different messaging, CTA, or structure
                          </p>
                        </div>
                      )}
                      
                      {selectedTestType === 'send_time' && (
                        <div>
                          <Label>Send Hour</Label>
                          <select
                            value={testVariant.send_hour || 14}
                            onChange={(e) => updateVariant('test', 'send_hour', parseInt(e.target.value))}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                          >
                            {Array.from({length: 24}, (_, i) => (
                              <option key={i} value={i}>
                                {String(i).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Test different times based on your audience
                          </p>
                        </div>
                      )}
                      
                      {selectedTestType === 'sender_name' && (
                        <div>
                          <Label>Sender Name</Label>
                          <Input
                            value={testVariant.sender_name || ''}
                            onChange={(e) => updateVariant('test', 'sender_name', e.target.value)}
                            placeholder="Alternative sender name"
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Try different name formats or team members
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Test Summary */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800">Test Summary</h4>
                        <div className="text-sm text-blue-700 mt-1 space-y-1">
                          <div>• {Math.floor(campaignData.csvData.length * trafficSplit / 100)} leads will receive Version A</div>
                          <div>• {Math.floor(campaignData.csvData.length * (100 - trafficSplit) / 100)} leads will receive Version B</div>
                          <div>• Test will run for {testDurationHours} hours (~{getEstimatedDuration()} days)</div>
                          <div>• Results will be analyzed with {confidenceLevel}% confidence level</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}