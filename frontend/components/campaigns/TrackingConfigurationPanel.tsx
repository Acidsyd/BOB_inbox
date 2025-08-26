'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye,
  MousePointer,
  Reply,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle,
  Globe,
  Smartphone,
  Clock,
  Database,
  Zap,
  Info,
  HelpCircle
} from 'lucide-react'
import { useTrackingConfiguration } from '@/hooks/useTrackingConfiguration'
import type { TrackingConfiguration } from '@/hooks/useTrackingConfiguration'

interface TrackingConfigurationPanelProps {
  campaignData?: any
  onTrackingChange?: (trackingConfig: Partial<TrackingConfiguration>) => void
  showAdvancedOptions?: boolean
  className?: string
}

function TrackingToggle({ 
  icon: Icon, 
  title, 
  description, 
  checked, 
  onChange, 
  disabled = false 
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center space-x-3 p-4 rounded-lg border ${
      disabled ? 'bg-gray-50 opacity-60' : 'bg-white hover:bg-gray-50'
    } transition-colors`}>
      <Icon className={`h-5 w-5 ${
        checked ? 'text-purple-600' : 'text-gray-400'
      }`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <Label className="font-medium text-gray-900">
            {title}
          </Label>
          <Switch
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  )
}

function ConfigurationSection({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <div className="relative group">
      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

export default function TrackingConfigurationPanel({
  campaignData,
  onTrackingChange,
  showAdvancedOptions = false,
  className
}: TrackingConfigurationPanelProps) {
  const {
    configuration,
    updateConfiguration,
    saveConfiguration,
    resetToDefaults,
    isSaving,
    error
  } = useTrackingConfiguration()

  const [localConfig, setLocalConfig] = useState<TrackingConfiguration>(configuration)
  const [showAdvanced, setShowAdvanced] = useState(showAdvancedOptions)

  // Update local config when global config changes
  React.useEffect(() => {
    setLocalConfig(configuration)
  }, [configuration])

  // Handle configuration changes
  const handleConfigChange = (updates: Partial<TrackingConfiguration>) => {
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    updateConfiguration(updates)
    onTrackingChange?.(updates)
  }

  // Save configuration
  const handleSave = async () => {
    try {
      await saveConfiguration()
    } catch (error) {
      console.error('Failed to save tracking configuration:', error)
    }
  }

  // Reset to defaults
  const handleReset = () => {
    resetToDefaults()
    setLocalConfig(configuration)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Configuration Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Basic Tracking Options */}
      <ConfigurationSection
        title="Email Tracking"
        description="Configure what activities to track in your email campaigns"
      >
        <div className="space-y-3">
          <TrackingToggle
            icon={Eye}
            title="Email Open Tracking"
            description="Track when recipients open your emails using invisible pixels"
            checked={localConfig.enableOpenTracking}
            onChange={(checked) => handleConfigChange({ enableOpenTracking: checked })}
          />
          
          <TrackingToggle
            icon={MousePointer}
            title="Link Click Tracking"
            description="Monitor which links recipients click in your emails"
            checked={localConfig.enableClickTracking}
            onChange={(checked) => handleConfigChange({ enableClickTracking: checked })}
          />
          
          <TrackingToggle
            icon={Reply}
            title="Reply Tracking"
            description="Automatically track and categorize email replies"
            checked={localConfig.enableReplyTracking}
            onChange={(checked) => handleConfigChange({ enableReplyTracking: checked })}
          />
          
          <TrackingToggle
            icon={Shield}
            title="Deliverability Tracking"
            description="Monitor email delivery status and bounce rates"
            checked={localConfig.enableDeliverabilityTracking}
            onChange={(checked) => handleConfigChange({ enableDeliverabilityTracking: checked })}
          />
        </div>
      </ConfigurationSection>

      {/* Advanced Options Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">Advanced Configuration</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </Button>
      </div>

      {/* Advanced Configuration */}
      {showAdvanced && (
        <>
          {/* Tracking Behavior */}
          <ConfigurationSection
            title="Tracking Behavior"
            description="Fine-tune how tracking pixels and links behave"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="pixelPosition" className="font-medium">
                    Pixel Position
                  </Label>
                  <InfoTooltip content="Where to place the tracking pixel in your email" />
                </div>
                <select
                  id="pixelPosition"
                  value={localConfig.pixelPosition}
                  onChange={(e) => handleConfigChange({ 
                    pixelPosition: e.target.value as 'top' | 'middle' | 'bottom' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="top">Top of email</option>
                  <option value="middle">Middle of email</option>
                  <option value="bottom">Bottom of email</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="botFiltering" className="font-medium">
                    Bot Filtering
                  </Label>
                  <InfoTooltip content="How aggressively to filter out bot-generated opens and clicks" />
                </div>
                <select
                  id="botFiltering"
                  value={localConfig.botFilteringSensitivity}
                  onChange={(e) => handleConfigChange({ 
                    botFilteringSensitivity: e.target.value as 'low' | 'medium' | 'high' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="low">Low (more inclusive)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="high">High (strict filtering)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="trackingDomain" className="font-medium">
                  Custom Tracking Domain
                </Label>
                <InfoTooltip content="Use your own domain for tracking links (optional)" />
              </div>
              <Input
                id="trackingDomain"
                type="url"
                placeholder="https://track.yourdomain.com"
                value={localConfig.trackingDomain || ''}
                onChange={(e) => handleConfigChange({ trackingDomain: e.target.value })}
                className="max-w-md"
              />
            </div>

            <div className="space-y-3">
              <TrackingToggle
                icon={Globe}
                title="Geographic Tracking"
                description="Track the geographic location of email opens and clicks"
                checked={localConfig.enableGeoTracking}
                onChange={(checked) => handleConfigChange({ enableGeoTracking: checked })}
              />
              
              <TrackingToggle
                icon={Smartphone}
                title="Device & Client Tracking"
                description="Track device types and email clients used by recipients"
                checked={localConfig.enableDeviceTracking}
                onChange={(checked) => handleConfigChange({ enableDeviceTracking: checked })}
              />
            </div>
          </ConfigurationSection>

          {/* Privacy & Compliance */}
          <ConfigurationSection
            title="Privacy & Compliance"
            description="Configure privacy settings and compliance options"
          >
            <div className="space-y-3">
              <TrackingToggle
                icon={Shield}
                title="Respect Do Not Track"
                description="Honor browser 'Do Not Track' settings when possible"
                checked={localConfig.respectDoNotTrack}
                onChange={(checked) => handleConfigChange({ respectDoNotTrack: checked })}
              />
              
              <TrackingToggle
                icon={Shield}
                title="Anonymize IP Addresses"
                description="Remove last octet of IP addresses for privacy"
                checked={localConfig.anonymizeIpAddresses}
                onChange={(checked) => handleConfigChange({ anonymizeIpAddresses: checked })}
              />
              
              <TrackingToggle
                icon={Shield}
                title="Tracking Consent Required"
                description="Only track recipients who have explicitly consented"
                checked={localConfig.trackingConsentRequired}
                onChange={(checked) => handleConfigChange({ trackingConsentRequired: checked })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="dataRetention" className="font-medium">
                  Data Retention Period
                </Label>
                <InfoTooltip content="How long to keep tracking data before automatic deletion" />
              </div>
              <div className="flex items-center space-x-2 max-w-xs">
                <Input
                  id="dataRetention"
                  type="number"
                  min="1"
                  max="2555" // 7 years
                  value={localConfig.dataRetentionDays}
                  onChange={(e) => handleConfigChange({ 
                    dataRetentionDays: parseInt(e.target.value) || 365 
                  })}
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
            </div>
          </ConfigurationSection>

          {/* Performance Settings */}
          <ConfigurationSection
            title="Performance & Processing"
            description="Configure how tracking data is processed and delivered"
          >
            <div className="space-y-3">
              <TrackingToggle
                icon={Zap}
                title="Real-time Updates"
                description="Push tracking events to dashboard immediately"
                checked={localConfig.realTimeUpdates}
                onChange={(checked) => handleConfigChange({ realTimeUpdates: checked })}
              />
              
              <TrackingToggle
                icon={Database}
                title="Batch Processing"
                description="Process tracking events in batches for better performance"
                checked={localConfig.batchProcessing}
                onChange={(checked) => handleConfigChange({ batchProcessing: checked })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="maxEvents" className="font-medium">
                  Max Events Per Second
                </Label>
                <InfoTooltip content="Rate limit for processing tracking events to prevent overload" />
              </div>
              <div className="flex items-center space-x-2 max-w-xs">
                <Input
                  id="maxEvents"
                  type="number"
                  min="1"
                  max="1000"
                  value={localConfig.maxEventsPerSecond}
                  onChange={(e) => handleConfigChange({ 
                    maxEventsPerSecond: parseInt(e.target.value) || 100 
                  })}
                />
                <span className="text-sm text-gray-600">events/sec</span>
              </div>
            </div>
          </ConfigurationSection>
        </>
      )}

      {/* Configuration Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900">Configuration Status</span>
              {isSaving && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Saving...
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset to Defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Status Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Tracking Configuration Summary</h4>
              <div className="mt-2 space-y-1 text-sm text-blue-800">
                <div>
                  • {localConfig.enableOpenTracking ? '✓' : '✗'} Email opens will {localConfig.enableOpenTracking ? '' : 'not '}be tracked
                </div>
                <div>
                  • {localConfig.enableClickTracking ? '✓' : '✗'} Link clicks will {localConfig.enableClickTracking ? '' : 'not '}be tracked
                </div>
                <div>
                  • {localConfig.enableReplyTracking ? '✓' : '✗'} Replies will {localConfig.enableReplyTracking ? '' : 'not '}be tracked
                </div>
                <div>
                  • {localConfig.enableDeliverabilityTracking ? '✓' : '✗'} Delivery status will {localConfig.enableDeliverabilityTracking ? '' : 'not '}be tracked
                </div>
                {showAdvanced && (
                  <>
                    <div>
                      • Tracking pixel position: {localConfig.pixelPosition}
                    </div>
                    <div>
                      • Bot filtering: {localConfig.botFilteringSensitivity} sensitivity
                    </div>
                    <div>
                      • Data retention: {localConfig.dataRetentionDays} days
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}