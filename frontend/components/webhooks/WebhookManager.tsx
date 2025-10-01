'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import {
  Plus,
  Webhook,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Send
} from 'lucide-react'
import { useToast } from '../ui/toast'
import { api } from '../../lib/api'

interface WebhookConfig {
  id: string
  name: string
  url: string
  secret?: string
  is_active: boolean
  events: string[]
  created_at: string
  updated_at: string
}

interface WebhookDelivery {
  id: string
  event_type: string
  status: 'pending' | 'success' | 'failed'
  response_code?: number
  attempts: number
  delivered_at?: string
  error_message?: string
  created_at: string
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const { addToast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: ['label.assigned', 'label.removed', 'label.created']
  })

  const availableEvents = [
    'label.assigned',
    'label.removed',
    'label.created',
    'email.sent',
    'email.delivered',
    'email.bounced',
    'reply.received'
  ]

  useEffect(() => {
    fetchWebhooks()
    fetchDeliveries()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const response = await api.get('/webhooks')
      setWebhooks(response.data)
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    }
  }

  const fetchDeliveries = async () => {
    try {
      const response = await api.get('/webhooks/deliveries')
      setDeliveries(response.data)
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const webhookData = { ...formData, is_active: true }

      if (selectedWebhook) {
        await api.put(`/webhooks/${selectedWebhook.id}`, webhookData)
      } else {
        await api.post('/webhooks', webhookData)
      }

      addToast({
        title: selectedWebhook ? 'Webhook updated' : 'Webhook created',
        description: 'Your webhook configuration has been saved.',
        type: 'success'
      })
      setIsCreateOpen(false)
      setIsEditOpen(false)
      resetForm()
      fetchWebhooks()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to save webhook configuration.',
        type: 'error'
      })
    }
  }

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      await api.delete(`/webhooks/${webhookId}`)
      addToast({
        title: 'Webhook deleted',
        description: 'The webhook has been removed.',
        type: 'success'
      })
      fetchWebhooks()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete webhook.',
        type: 'error'
      })
    }
  }

  const handleTest = async (webhookId?: string) => {
    try {
      if (webhookId) {
        // Test existing webhook
        await api.post(`/webhooks/${webhookId}/test`)
      } else {
        // Test current form data (for new webhooks)
        const testData = {
          url: formData.url,
          secret: formData.secret,
          events: formData.events
        }
        await api.post('/webhooks/test', testData)
      }

      addToast({
        title: 'Test webhook sent',
        description: 'A test payload has been sent to your webhook endpoint.',
        type: 'success'
      })
      // Refresh deliveries to show the test delivery
      fetchDeliveries()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to send test webhook.',
        type: 'error'
      })
    }
  }


  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      secret: '',
      events: ['label.assigned', 'label.removed', 'label.created']
    })
    setSelectedWebhook(null)
  }

  const openEditDialog = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret || '',
      events: webhook.events
    })
    setIsEditOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast({
      title: 'Copied',
      description: 'Copied to clipboard',
      type: 'success'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const WebhookForm = () => (
    <div className="px-6 py-4">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-900">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Webhook"
              required
              className="h-12 px-4 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="url" className="text-sm font-semibold text-gray-900">Webhook URL</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://your-app.com/webhook"
              required
              className="h-12 px-4 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="secret" className="text-sm font-semibold text-gray-900">Secret (optional)</Label>
            <div className="relative">
              <Input
                id="secret"
                type={showSecret ? 'text' : 'password'}
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="Optional signing secret"
                className="h-12 px-4 pr-14 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-semibold text-gray-900">Events to Subscribe</Label>
          <div className="grid grid-cols-2 gap-4 p-5 border border-gray-200 rounded-xl bg-gray-50/50">
            {availableEvents.map((event) => (
              <label key={event} className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.events.includes(event)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, events: [...formData.events, event] })
                    } else {
                      setFormData({ ...formData, events: formData.events.filter(ev => ev !== event) })
                    }
                  }}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  {event}
                </span>
              </label>
            ))}
          </div>
        </div>


        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div>
            {/* Show test button for existing webhooks */}
            {selectedWebhook && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTest(selectedWebhook.id)}
                className="px-6 py-2.5 h-11 font-medium text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            )}
          </div>
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setIsEditOpen(false)
                resetForm()
              }}
              className="px-8 py-2.5 h-11 font-medium hover:bg-gray-50"
            >
              Cancel
            </Button>

            {/* Test button for new webhooks - shown only when creating */}
            {!selectedWebhook && formData.url && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTest()}
                className="px-6 py-2.5 h-11 font-medium text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Test
              </Button>
            )}

            <Button type="submit" className="px-8 py-2.5 h-11 font-medium bg-blue-600 hover:bg-blue-700">
              {selectedWebhook ? 'Update' : 'Create'} Webhook
            </Button>
          </div>
        </div>
      </form>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Webhook className="h-5 w-5 mr-2" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Configure HTTP callbacks for events in your campaigns
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3 pb-4 border-b">
                  <DialogTitle className="text-xl font-semibold">Create Webhook</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Add a new webhook endpoint to receive event notifications
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <WebhookForm />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
              <p className="text-gray-600 mb-4">
                Create your first webhook to receive real-time notifications
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <h3 className="font-medium">{webhook.name}</h3>
                      <Badge variant="default" className="ml-2">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(webhook)}
                        title="Edit webhook"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
                        title="Delete webhook"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="font-medium w-16">URL:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1 mr-2">
                        {webhook.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(webhook.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center">
                      <span className="font-medium w-16">Events:</span>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>
            Latest webhook delivery attempts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No webhook deliveries yet
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.slice(0, 10).map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(delivery.status)}
                    <div>
                      <div className="font-medium">{delivery.event_type}</div>
                      <div className="text-sm text-gray-600">
                        {delivery.response_code && `HTTP ${delivery.response_code}`}
                        {delivery.attempts > 1 && ` • ${delivery.attempts} attempts`}
                        {delivery.error_message && (
                          <span className="text-red-600"> • {delivery.error_message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(delivery.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Edit Webhook</DialogTitle>
            <DialogDescription className="text-gray-600">
              Update your webhook configuration
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <WebhookForm />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}