'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '../../../../../../components/auth/ProtectedRoute'
import AppLayout from '../../../../../../components/layout/AppLayout'
import { Button } from '../../../../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../../components/ui/card'
import { Alert, AlertDescription } from '../../../../../../components/ui/alert'
import { ArrowLeft, Loader2, CheckCircle2, Mail, Link as LinkIcon, Unlink, Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEmailAccounts } from '../../../../../../hooks/useEmailAccounts'
import { Checkbox } from '../../../../../../components/ui/checkbox'
import { Input } from '../../../../../../components/ui/input'
import { Label } from '../../../../../../components/ui/label'

interface RelayProvider {
  id: string
  provider_name: string
  provider_type: string
  daily_limit: number
}

interface LinkedAccount {
  id: string
  email: string
  is_active: boolean
}

function LinkAccountsContent() {
  const router = useRouter()
  const params = useParams()
  const providerId = params.id as string

  const [provider, setProvider] = useState<RelayProvider | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New email account form state
  const [newEmail, setNewEmail] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { accounts: availableAccounts, isLoading: accountsLoading } = useEmailAccounts()

  useEffect(() => {
    fetchProviderDetails()
  }, [providerId])

  const fetchProviderDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      // Fetch provider info
      const providerResponse = await fetch(`${apiUrl}/api/relay-providers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const providersData = await providerResponse.json()
      const providers = providersData.providers || []
      const currentProvider = providers.find((p: any) => p.id === providerId)

      if (currentProvider) {
        setProvider({
          id: currentProvider.id,
          provider_name: currentProvider.provider_name,
          provider_type: currentProvider.provider_type,
          daily_limit: currentProvider.daily_limit
        })
      }

      // Fetch linked accounts
      const linkedResponse = await fetch(`${apiUrl}/api/relay-providers/${providerId}/linked-accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const linkedData = await linkedResponse.json()
      if (linkedData.success) {
        setLinkedAccounts(linkedData.accounts)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch provider details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId)
    } else {
      newSelected.add(accountId)
    }
    setSelectedAccounts(newSelected)
  }

  const handleLinkAccounts = async () => {
    if (selectedAccounts.size === 0) {
      setError('Please select at least one email account to link')
      return
    }

    setIsLinking(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const accountsToLink = Array.from(selectedAccounts)
      let successCount = 0
      let failCount = 0

      for (const accountId of accountsToLink) {
        try {
          const account = availableAccounts.find(a => a.id === accountId)
          if (!account) continue

          await fetch(`${apiUrl}/api/relay-providers/${providerId}/link-account`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              email_account_id: accountId,
              from_email: account.email,
              from_name: account.display_name || account.email
            })
          })
          successCount++
        } catch (err) {
          failCount++
          console.error(`Failed to link account ${accountId}:`, err)
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully linked ${successCount} email account(s)`)
        setSelectedAccounts(new Set())
        await fetchProviderDetails()
      }

      if (failCount > 0) {
        setError(`Failed to link ${failCount} account(s)`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link email accounts')
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkAccount = async (accountId: string) => {
    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      await fetch(`${apiUrl}/api/relay-providers/${providerId}/unlink-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email_account_id: accountId
        })
      })
      setSuccess('Email account unlinked successfully')
      await fetchProviderDetails()
    } catch (err: any) {
      setError(err.message || 'Failed to unlink email account')
    }
  }

  const handleCreateAndLinkAccount = async () => {
    if (!newEmail || !newDisplayName) {
      setError('Please provide both email address and display name')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

      // Create the email account with Mailgun provider type and link to relay provider
      const createResponse = await fetch(`${apiUrl}/api/email-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'mailgun',
          email: newEmail,
          display_name: newDisplayName,
          relay_provider_id: providerId
        })
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.message || 'Failed to create email account')
      }

      const createData = await createResponse.json()

      if (!createData.account) {
        throw new Error('Email account creation failed')
      }

      setSuccess(`Email account ${newEmail} created and linked to Mailgun successfully`)
      setNewEmail('')
      setNewDisplayName('')
      await fetchProviderDetails()
    } catch (err: any) {
      setError(err.message || 'Failed to create and link email account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleFinish = () => {
    router.push('/settings/email-accounts')
  }

  if (isLoading || accountsLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const linkedAccountIds = new Set(linkedAccounts.map(a => a.id))
  const unlinkedAccounts = availableAccounts.filter(
    account => !linkedAccountIds.has(account.id)
  )

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Link href="/settings/email-accounts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Email Accounts
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Link Email Accounts - Step 2</CardTitle>
              <CardDescription>
                {provider ? `Link email accounts to ${provider.provider_name}` : 'Link email accounts to your relay provider'}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              Step 2 of 2
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {provider && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Provider Details</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/settings/email-accounts/new?step=mailgun-setup&edit=true')}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span> {provider.provider_name}
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span> {provider.provider_type}
                </div>
                <div>
                  <span className="text-muted-foreground">Daily Limit:</span> {provider.daily_limit} emails
                </div>
              </div>
            </div>
          )}

          {/* Linked Accounts */}
          {linkedAccounts.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Linked Accounts ({linkedAccounts.length})
              </h3>
              <div className="space-y-2">
                {linkedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">{account.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {account.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkAccount(account.id)}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Unlink
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Email Account */}
          <div>
            <h3 className="font-medium mb-3 flex items-center">
              <Plus className="h-4 w-4 mr-2 text-blue-600" />
              Create New Email Account
            </h3>
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email Address *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="noreply@yourdomain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must use your Mailgun domain
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-display-name">Display Name *</Label>
                  <Input
                    id="new-display-name"
                    type="text"
                    placeholder="Your Company"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Name shown to recipients
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateAndLinkAccount}
                  disabled={isCreating || !newEmail || !newDisplayName}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create & Link Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Available Accounts to Link */}
          {unlinkedAccounts.length > 0 ? (
            <div>
              <h3 className="font-medium mb-3">
                Available Email Accounts ({unlinkedAccounts.length})
              </h3>
              <div className="space-y-2">
                {unlinkedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleToggleAccount(account.id)}
                  >
                    <Checkbox
                      checked={selectedAccounts.has(account.id)}
                      onCheckedChange={() => handleToggleAccount(account.id)}
                    />
                    <Mail className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{account.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.provider} • {account.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleFinish}
                >
                  Skip for Now
                </Button>

                <Button
                  onClick={handleLinkAccounts}
                  disabled={isLinking || selectedAccounts.size === 0}
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Link {selectedAccounts.size > 0 ? `${selectedAccounts.size} ` : ''}Account(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-2">No Available Accounts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {linkedAccounts.length > 0
                  ? 'All your email accounts are already linked.'
                  : 'You need to add email accounts before linking them to a relay provider.'}
              </p>
              <Button onClick={handleFinish}>
                Finish Setup
              </Button>
            </div>
          )}

          {linkedAccounts.length > 0 && unlinkedAccounts.length === 0 && (
            <div className="flex justify-end pt-4">
              <Button onClick={handleFinish}>
                Finish Setup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">What happens next?</h3>
        <p className="text-sm text-muted-foreground">
          Linked email accounts will use this relay provider to send emails. You can link or unlink accounts at any time from the settings page.
        </p>
      </div>
    </div>
  )
}

export default function LinkAccountsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <LinkAccountsContent />
      </AppLayout>
    </ProtectedRoute>
  )
}
