'use client'

import React, { ErrorInfo, ReactNode, Component } from 'react'
import { AlertCircle, RefreshCw, Home, Bug, Mail } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  isolate?: boolean
  section?: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call optional error reporting callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error tracking service (add your service here)
    this.reportError(error, errorInfo)
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Report to your error tracking service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        section: this.props.section,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }

      console.log('Error reported:', errorReport)
      
      // You can send this to your error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // })
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      })

      // Auto-reset after a delay to prevent infinite retry loops
      this.resetTimeoutId = window.setTimeout(() => {
        this.setState({ retryCount: 0 })
      }, 30000) // Reset retry count after 30 seconds
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    const { hasError, error, retryCount } = this.state
    const { children, fallback, maxRetries = 3, isolate = false, section } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Different error UIs based on context
      if (isolate) {
        return (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center space-x-2 text-red-800 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Something went wrong in this section</span>
              <Button
                size="sm"
                variant="outline"
                onClick={this.handleRetry}
                disabled={retryCount >= maxRetries}
                className="ml-auto"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry ({retryCount}/{maxRetries})
              </Button>
            </div>
          </div>
        )
      }

      // Full error page for major errors
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-gray-900">
                {section ? `${section} Error` : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-3 bg-gray-100 rounded text-xs font-mono text-gray-600 max-h-32 overflow-auto">
                  <strong>Error:</strong> {error.message}<br />
                  <strong>Stack:</strong><br />
                  {error.stack?.split('\n').slice(0, 3).join('\n')}
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={this.handleRetry} 
                  disabled={retryCount >= maxRetries}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({retryCount}/{maxRetries})
                </Button>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={this.handleReload} 
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const subject = encodeURIComponent(`Error Report: ${error.message}`)
                    const body = encodeURIComponent(`
Error Details:
- Message: ${error.message}
- Section: ${section || 'Unknown'}
- URL: ${window.location.href}
- Time: ${new Date().toISOString()}
- User Agent: ${navigator.userAgent}

Stack Trace:
${error.stack}
                    `)
                    window.open(`mailto:support@mailsender.com?subject=${subject}&body=${body}`)
                  }}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for easy wrapping
function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Section-specific error boundaries
function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      section="Dashboard"
      isolate={true}
      onError={(error, errorInfo) => {
        console.error('Dashboard Error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

function CampaignErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      section="Campaign"
      isolate={true}
      onError={(error, errorInfo) => {
        console.error('Campaign Error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

function EmailAccountsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      section="Email Accounts"
      isolate={true}
      onError={(error, errorInfo) => {
        console.error('Email Accounts Error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

function BillingErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      section="Billing"
      isolate={true}
      onError={(error, errorInfo) => {
        console.error('Billing Error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Hook for manual error reporting
function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error('Manual error report:', error, context)
    
    // You can add your error reporting service here
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Send to your error reporting service
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // })
  }, [])

  return { reportError }
}

export {
  ErrorBoundary,
  withErrorBoundary,
  DashboardErrorBoundary,
  CampaignErrorBoundary,
  EmailAccountsErrorBoundary,
  BillingErrorBoundary,
  useErrorReporting
}