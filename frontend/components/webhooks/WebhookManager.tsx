'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
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
  EyeOff
} from 'lucide-react'
import { useToast } from '../ui/toast'

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
    is_active: true,
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
      const response = await fetch('/api/webhooks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    }
  }

  const fetchDeliveries = async () => {
    try {
      const response = await fetch('/api/webhooks/deliveries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setDeliveries(data)
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = selectedWebhook ? `/api/webhooks/${selectedWebhook.id}` : '/api/webhooks'
      const method = selectedWebhook ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        addToast({
          title: selectedWebhook ? 'Webhook updated' : 'Webhook created',
          description: 'Your webhook configuration has been saved.',
          type: 'success'
        })
        setIsCreateOpen(false)
        setIsEditOpen(false)
        resetForm()
        fetchWebhooks()
      } else {
        throw new Error('Failed to save webhook')
      }
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
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        addToast({
          title: 'Webhook deleted',
          description: 'The webhook has been removed.',
          type: 'success'
        })
        fetchWebhooks()
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete webhook.',
        type: 'error'
      })
    }
  }

  const handleToggleActive = async (webhookId: string, is_active: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active })
      })

      if (response.ok) {
        addToast({
          title: is_active ? 'Webhook enabled' : 'Webhook disabled',
          description: `The webhook is now ${is_active ? 'active' : 'inactive'}.`,
          type: 'success'
        })
        fetchWebhooks()
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update webhook status.',
        type: 'error'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      secret: '',
      is_active: true,
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
      is_active: webhook.is_active,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My Webhook"
          required
        />
      </div>

      <div>
        <Label htmlFor="url">Webhook URL</Label>
        <Input
          id="url"
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="https://your-app.com/webhook"
          required
        />
      </div>

      <div>
        <Label htmlFor="secret">Secret (optional)</Label>
        <div className="relative">
          <Input
            id="secret"
            type={showSecret ? 'text' : 'password'}
            value={formData.secret}
            onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
            placeholder="Optional signing secret"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div>
        <Label>Events</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {availableEvents.map((event) => (
            <label key={event} className="flex items-center space-x-2">
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
              />
              <span className="text-sm">{event}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsCreateOpen(false)
            setIsEditOpen(false)
            resetForm()
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {selectedWebhook ? 'Update' : 'Create'} Webhook
        </Button>
      </div>
    </form>
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Webhook</DialogTitle>
                  <DialogDescription>
                    Add a new webhook endpoint to receive event notifications
                  </DialogDescription>
                </DialogHeader>
                <WebhookForm />
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
                      <Badge
                        variant={webhook.is_active ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) => handleToggleActive(webhook.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(webhook)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update your webhook configuration
            </DialogDescription>
          </DialogHeader>
          <WebhookForm />
        </DialogContent>
      </Dialog>
    </div>
  )
}