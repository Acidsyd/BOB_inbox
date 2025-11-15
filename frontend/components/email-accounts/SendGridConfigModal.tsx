import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Eye, EyeOff, TestTube, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface SendGridConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SendGridConfigModal({
  open,
  onOpenChange,
  onSuccess
}: SendGridConfigModalProps) {
  const { toast } = useToast()
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [formData, setFormData] = useState({
    provider_name: '',
    api_key: '',
    from_email: '',
    from_name: '',
    daily_limit: 100
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.provider_name.trim()) {
      newErrors.provider_name = 'Provider name is required'
    }

    if (!formData.api_key.trim()) {
      newErrors.api_key = 'API key is required'
    }

    if (!formData.from_email.trim()) {
      newErrors.from_email = 'From email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.from_email)) {
      newErrors.from_email = 'Please enter a valid email address'
    }

    if (formData.daily_limit < 1 || formData.daily_limit > 10000) {
      newErrors.daily_limit = 'Daily limit must be between 1 and 10,000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTestConnection = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before testing',
        variant: 'destructive'
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      // Create a temporary relay provider record to test
      const response = await fetch('/api/relay-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          provider_type: 'sendgrid',
          provider_name: `Test - ${formData.provider_name}`,
          api_key: formData.api_key,
          config: {
            from_email: formData.from_email,
            from_name: formData.from_name || undefined
          },
          daily_limit: formData.daily_limit,
          is_test: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Test the connection
        const testResponse = await fetch(`/api/relay-providers/${data.provider.id}/test`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        const testData = await testResponse.json()

        // Delete the test provider
        await fetch(`/api/relay-providers/${data.provider.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (testResponse.ok) {
          setTestResult({
            success: true,
            message: 'Connection successful! SendGrid API key is valid.'
          })
        } else {
          setTestResult({
            success: false,
            message: testData.message || 'Connection test failed'
          })
        }
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Failed to validate configuration'
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/relay-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          provider_type: 'sendgrid',
          provider_name: formData.provider_name,
          api_key: formData.api_key,
          config: {
            from_email: formData.from_email,
            from_name: formData.from_name || undefined
          },
          daily_limit: formData.daily_limit
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'SendGrid provider created successfully'
        })
        onOpenChange(false)
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create relay provider',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create relay provider',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setFormData({
      provider_name: '',
      api_key: '',
      from_email: '',
      from_name: '',
      daily_limit: 100
    })
    setErrors({})
    setTestResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add SendGrid Configuration</DialogTitle>
          <DialogDescription>
            Configure your SendGrid API key and sender information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Name */}
          <div className="space-y-2">
            <Label htmlFor="provider_name">
              Provider Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="provider_name"
              placeholder="e.g., Marketing SendGrid"
              value={formData.provider_name}
              onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
              className={errors.provider_name ? 'border-red-500' : ''}
            />
            {errors.provider_name && (
              <p className="text-sm text-red-500">{errors.provider_name}</p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key">
              API Key <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? 'text' : 'password'}
                placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className={`pr-10 ${errors.api_key ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.api_key && (
              <p className="text-sm text-red-500">{errors.api_key}</p>
            )}
          </div>

          {/* From Email */}
          <div className="space-y-2">
            <Label htmlFor="from_email">
              From Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="from_email"
              type="email"
              placeholder="noreply@example.com"
              value={formData.from_email}
              onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
              className={errors.from_email ? 'border-red-500' : ''}
            />
            {errors.from_email && (
              <p className="text-sm text-red-500">{errors.from_email}</p>
            )}
            <p className="text-xs text-gray-500">
              Must be a verified sender in your SendGrid account
            </p>
          </div>

          {/* From Name */}
          <div className="space-y-2">
            <Label htmlFor="from_name">From Name (Optional)</Label>
            <Input
              id="from_name"
              placeholder="My Company"
              value={formData.from_name}
              onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
            />
          </div>

          {/* Daily Limit */}
          <div className="space-y-2">
            <Label htmlFor="daily_limit">Daily Send Limit</Label>
            <Input
              id="daily_limit"
              type="number"
              min="1"
              max="10000"
              value={formData.daily_limit}
              onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) || 100 })}
              className={errors.daily_limit ? 'border-red-500' : ''}
            />
            {errors.daily_limit && (
              <p className="text-sm text-red-500">{errors.daily_limit}</p>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${
              testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
