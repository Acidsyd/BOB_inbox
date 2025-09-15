'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'

interface UnsubscribeResponse {
  success: boolean
  email?: string
  message?: string
  error?: string
  alreadyUnsubscribed?: boolean
}

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [data, setData] = useState<UnsubscribeResponse | null>(null)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validate token on page load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No unsubscribe token provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`http://localhost:4000/api/unsubscribe?token=${encodeURIComponent(token)}`)
        const result: UnsubscribeResponse = await response.json()
        
        if (result.success) {
          setData(result)
          if (result.alreadyUnsubscribed) {
            setCompleted(true)
          }
        } else {
          setError(result.error || 'Invalid or expired unsubscribe link')
        }
      } catch (err) {
        console.error('Error validating unsubscribe token:', err)
        setError('Failed to validate unsubscribe link')
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [token])

  const handleUnsubscribe = async () => {
    if (!token) return

    setProcessing(true)
    try {
      const response = await fetch('http://localhost:4000/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      const result: UnsubscribeResponse = await response.json()
      
      if (result.success) {
        setData(result)
        setCompleted(true)
      } else {
        setError(result.error || 'Failed to unsubscribe')
      }
    } catch (err) {
      console.error('Error processing unsubscribe:', err)
      setError('Failed to process unsubscribe request')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Validating unsubscribe link...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <CardTitle>Unsubscribe Failed</CardTitle>
            <CardDescription>
              There was a problem with your unsubscribe request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                If you continue to receive emails, please contact support directly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Successfully Unsubscribed</CardTitle>
            <CardDescription>
              {data?.alreadyUnsubscribed 
                ? 'You were already unsubscribed from our emails'
                : 'You have been unsubscribed from our email list'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.email && (
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Email address:</p>
                  <p className="font-medium">{data.email}</p>
                </div>
              )}
              
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {data?.message || 'You will no longer receive emails from us.'}
                </AlertDescription>
              </Alert>

              <div className="text-center text-sm text-gray-600">
                <p>
                  Please allow up to 24 hours for the unsubscribe to take full effect.
                </p>
                <p className="mt-2">
                  If you received this in error, you can always subscribe again later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="w-12 h-12 text-blue-500 mx-auto mb-2" />
          <CardTitle>Confirm Unsubscribe</CardTitle>
          <CardDescription>
            Are you sure you want to unsubscribe from our emails?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.email && (
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-600">Email address:</p>
              <p className="font-medium">{data.email}</p>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>
              If you unsubscribe, you will no longer receive:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Campaign emails</li>
              <li>Follow-up messages</li>
              <li>Marketing communications</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleUnsubscribe}
              disabled={processing}
              className="w-full"
              variant="destructive"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unsubscribing...
                </>
              ) : (
                'Yes, Unsubscribe Me'
              )}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.close()}
              disabled={processing}
            >
              Cancel
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            This action will unsubscribe you from all future emails from this organization.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UnsubscribeContent />
    </Suspense>
  )
}