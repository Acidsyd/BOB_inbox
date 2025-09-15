'use client'

import ProtectedRoute from '../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../components/layout/AppLayout'
import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { api } from '../../../../lib/api'
import EmailSequenceBuilder from '../../../../components/campaigns/EmailSequenceBuilder'

interface Campaign {
  id: string
  name: string
  status: string
  config: {
    emailSubject: string
    emailContent: string
    emailSequence: any[]
    leadListId: string
    emailAccounts: string[]
    emailsPerDay: number
    emailsPerHour: number
    sendingInterval: number
    activeDays: string[]
    sendingHours: { start: number; end: number }
    timezone: string
    trackOpens: boolean
    trackClicks: boolean
    stopOnReply: boolean
    enableJitter: boolean
    jitterMinutes: number
  }
}

function EditCampaignPageContent({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Form data matching campaign config structure
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    emailSubject: '',
    emailContent: '',
    followUpEnabled: false,
    emailSequence: [],
    selectedLeads: [],
    emailAccounts: [],
    scheduleType: 'immediate' as 'immediate' | 'scheduled',
    scheduledDate: undefined,
    dailyLimit: 50,
    emailsPerDay: 50,
    emailsPerHour: 10,
    emailsPerMinute: 1,
    sendingInterval: 5,
    activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    sendingHours: { start: 9, end: 17 },
    csvData: [],
    leadListId: '',
    leadListName: '',
    leadListCount: 0,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    trackOpens: true,
    trackClicks: true,
    stopOnReply: true,
    enableJitter: true,
    jitterMinutes: 2
  })

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/campaigns/${id}`)

      if (response.data.success) {
        const fetchedCampaign = response.data.campaign
        setCampaign(fetchedCampaign)

        // Populate form data with campaign config
        setCampaignData({
          name: fetchedCampaign.name || '',
          description: fetchedCampaign.config?.description || '',
          emailSubject: fetchedCampaign.config?.emailSubject || '',
          emailContent: fetchedCampaign.config?.emailContent || '',
          followUpEnabled: fetchedCampaign.config?.followUpEnabled || false,
          emailSequence: fetchedCampaign.config?.emailSequence || [],
          selectedLeads: fetchedCampaign.config?.selectedLeads || [],
          emailAccounts: fetchedCampaign.config?.emailAccounts || [],
          scheduleType: fetchedCampaign.config?.scheduleType || 'immediate',
          scheduledDate: fetchedCampaign.config?.scheduledDate,
          dailyLimit: fetchedCampaign.config?.dailyLimit || 50,
          emailsPerDay: fetchedCampaign.config?.emailsPerDay || 50,
          emailsPerHour: fetchedCampaign.config?.emailsPerHour || 10,
          emailsPerMinute: fetchedCampaign.config?.emailsPerMinute || 1,
          sendingInterval: fetchedCampaign.config?.sendingInterval || 5,
          activeDays: fetchedCampaign.config?.activeDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          sendingHours: fetchedCampaign.config?.sendingHours || { start: 9, end: 17 },
          csvData: fetchedCampaign.config?.csvData || [],
          leadListId: fetchedCampaign.config?.leadListId || '',
          leadListName: fetchedCampaign.config?.leadListName || '',
          leadListCount: fetchedCampaign.config?.leadListCount || 0,
          timezone: fetchedCampaign.config?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          trackOpens: fetchedCampaign.config?.trackOpens ?? true,
          trackClicks: fetchedCampaign.config?.trackClicks ?? true,
          stopOnReply: fetchedCampaign.config?.stopOnReply ?? true,
          enableJitter: fetchedCampaign.config?.enableJitter ?? true,
          jitterMinutes: fetchedCampaign.config?.jitterMinutes || 2
        })
      } else {
        setError('Campaign not found')
      }
    } catch (error: any) {
      console.error('Error fetching campaign:', error)
      setError(error.response?.data?.error || 'Failed to load campaign')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCampaign = async () => {
    try {
      setIsSaving(true)

      const updateData = {
        name: campaignData.name,
        config: {
          description: campaignData.description,
          emailSubject: campaignData.emailSubject,
          emailContent: campaignData.emailContent,
          followUpEnabled: campaignData.followUpEnabled,
          emailSequence: campaignData.emailSequence,
          selectedLeads: campaignData.selectedLeads,
          emailAccounts: campaignData.emailAccounts,
          scheduleType: campaignData.scheduleType,
          scheduledDate: campaignData.scheduledDate,
          dailyLimit: campaignData.dailyLimit,
          emailsPerDay: campaignData.emailsPerDay,
          emailsPerHour: campaignData.emailsPerHour,
          emailsPerMinute: campaignData.emailsPerMinute,
          sendingInterval: campaignData.sendingInterval,
          activeDays: campaignData.activeDays,
          sendingHours: campaignData.sendingHours,
          csvData: campaignData.csvData,
          leadListId: campaignData.leadListId,
          leadListName: campaignData.leadListName,
          leadListCount: campaignData.leadListCount,
          timezone: campaignData.timezone,
          trackOpens: campaignData.trackOpens,
          trackClicks: campaignData.trackClicks,
          stopOnReply: campaignData.stopOnReply,
          enableJitter: campaignData.enableJitter,
          jitterMinutes: campaignData.jitterMinutes
        }
      }

      const response = await api.put(`/campaigns/${id}`, updateData)

      if (response.data.success) {
        router.push(`/campaigns/${id}`)
      } else {
        setError(response.data.error || 'Failed to update campaign')
      }
    } catch (error: any) {
      console.error('Error updating campaign:', error)
      setError(error.response?.data?.error || 'Failed to update campaign')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/campaigns')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Campaign Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The campaign you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/campaigns')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => router.push(`/campaigns/${id}`)}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaign
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
              <p className="text-gray-600 mt-1">{campaign.name}</p>
            </div>
          </div>
        </div>

        {/* Campaign Edit Form */}
        <div className="space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Name</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaignName">Name</Label>
                  <Input
                    id="campaignName"
                    value={campaignData.name}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Sequence */}
          <Card>
            <CardHeader>
              <CardTitle>Email Sequence</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignData.emailSubject !== undefined && (
                <EmailSequenceBuilder
                  campaignData={campaignData}
                  updateCampaignData={(data) => setCampaignData(prev => ({ ...prev, ...data }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={() => router.push(`/campaigns/${id}`)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCampaign}
              disabled={isSaving || !campaignData.name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Campaign...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditCampaignPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <EditCampaignPageContent params={params} />
      </AppLayout>
    </ProtectedRoute>
  )
}