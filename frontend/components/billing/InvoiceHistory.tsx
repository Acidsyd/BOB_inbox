'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import { 
  Receipt, 
  Download, 
  ExternalLink, 
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Eye
} from 'lucide-react'
import { formatPrice, formatDate } from '../../lib/billing'
import { Invoice } from '../../types/billing'

interface InvoiceHistoryProps {
  isLoading?: boolean
}

interface InvoiceItemProps {
  invoice: Invoice
  onDownload?: (invoiceId: string) => void
  onViewOnline?: (invoiceId: string) => void
}

function InvoiceItem({ invoice, onDownload, onViewOnline }: InvoiceItemProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        )
      case 'open':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Outstanding
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )
      case 'void':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Void
          </Badge>
        )
      case 'uncollectible':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            {invoice.status}
          </Badge>
        )
    }
  }

  const getStatusColor = () => {
    switch (invoice.status) {
      case 'paid': return 'text-green-600'
      case 'open': return 'text-yellow-600'
      case 'void': return 'text-red-600'
      case 'uncollectible': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const handleDownload = async () => {
    if (!onDownload) return
    setIsDownloading(true)
    try {
      await onDownload(invoice.id)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleViewOnline = () => {
    if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank')
    } else if (onViewOnline) {
      onViewOnline(invoice.id)
    }
  }

  const getInvoiceDescription = () => {
    if (invoice.description) {
      return invoice.description
    }
    
    // Generate description from line items
    if (invoice.lines.data.length > 0) {
      const mainItem = invoice.lines.data[0]
      if (mainItem.plan?.nickname) {
        return `${mainItem.plan.nickname} subscription`
      }
      if (mainItem.description) {
        return mainItem.description
      }
    }
    
    return 'Subscription payment'
  }

  const getPeriodInfo = () => {
    if (invoice.lines.data.length > 0) {
      const period = invoice.lines.data[0].period
      if (period) {
        const start = formatDate(new Date(period.start * 1000).toISOString())
        const end = formatDate(new Date(period.end * 1000).toISOString())
        return `${start} - ${end}`
      }
    }
    return null
  }

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className={`h-4 w-4 ${getStatusColor()}`} />
            <div>
              <h4 className="font-medium">
                {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
              </h4>
              <p className="text-sm text-gray-600">{getInvoiceDescription()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(new Date(invoice.created * 1000).toISOString())}
            </span>
            {getPeriodInfo() && (
              <span className="text-xs">Period: {getPeriodInfo()}</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">
              {formatPrice(invoice.amount_due / 100, invoice.currency.toUpperCase())}
            </span>
            {getStatusBadge()}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {(invoice.hosted_invoice_url || onViewOnline) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewOnline}
                className="h-8 px-2"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
            
            {(invoice.invoice_pdf || onDownload) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="h-8 px-2"
              >
                {isDownloading ? (
                  <div className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent mr-1" />
                ) : (
                  <Download className="h-3 w-3 mr-1" />
                )}
                PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Details */}
      {invoice.status === 'paid' && (
        <div className="text-xs text-gray-500 bg-green-50 px-3 py-2 rounded border border-green-200">
          <div className="flex items-center justify-between">
            <span>Paid: {formatPrice(invoice.amount_paid / 100, invoice.currency.toUpperCase())}</span>
            <span>Receipt #{invoice.receipt_number || 'N/A'}</span>
          </div>
        </div>
      )}

      {invoice.status === 'open' && invoice.due_date && (
        <div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
          Due: {formatDate(new Date(invoice.due_date * 1000).toISOString())}
        </div>
      )}
    </div>
  )
}

// Mock data for demonstration
const mockInvoices: Invoice[] = [
  {
    id: 'in_1234567890',
    object: 'invoice',
    amount_due: 3000,
    amount_paid: 3000,
    amount_remaining: 0,
    currency: 'eur',
    customer: 'cus_123',
    description: 'Full Plan - Monthly Subscription',
    hosted_invoice_url: 'https://invoice.stripe.com/i/acct_123/live_123',
    invoice_pdf: 'https://pay.stripe.com/invoice/acct_123/live_123/pdf',
    lines: {
      data: [{
        id: 'il_123',
        amount: 3000,
        currency: 'eur',
        description: 'Full Plan - Monthly',
        period: {
          start: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60),
          end: Math.floor(Date.now() / 1000)
        },
        plan: {
          id: 'plan_123',
          nickname: 'Full Plan'
        }
      }]
    },
    number: 'INV-001',
    paid: true,
    receipt_number: 'RCP-001',
    status: 'paid',
    subscription: 'sub_123',
    created: Math.floor(Date.now() / 1000) - (5 * 24 * 60 * 60),
  },
  {
    id: 'in_0987654321',
    object: 'invoice',
    amount_due: 1500,
    amount_paid: 1500,
    amount_remaining: 0,
    currency: 'eur',
    customer: 'cus_123',
    description: 'Basic Plan - Monthly Subscription',
    hosted_invoice_url: 'https://invoice.stripe.com/i/acct_123/live_124',
    invoice_pdf: 'https://pay.stripe.com/invoice/acct_123/live_124/pdf',
    lines: {
      data: [{
        id: 'il_124',
        amount: 1500,
        currency: 'eur',
        description: 'Basic Plan - Monthly',
        period: {
          start: Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60),
          end: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
        },
        plan: {
          id: 'plan_124',
          nickname: 'Basic Plan'
        }
      }]
    },
    number: 'INV-002',
    paid: true,
    receipt_number: 'RCP-002',
    status: 'paid',
    subscription: 'sub_123',
    created: Math.floor(Date.now() / 1000) - (35 * 24 * 60 * 60),
  }
]

export default function InvoiceHistory({ isLoading }: InvoiceHistoryProps) {
  const [invoices] = useState<Invoice[]>(mockInvoices) // Replace with real data
  const [loadingMore, setLoadingMore] = useState(false)

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // Implement PDF download logic
      console.log('Download invoice PDF:', invoiceId)
      
      // For now, redirect to Stripe's PDF URL
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (invoice?.invoice_pdf) {
        window.open(invoice.invoice_pdf, '_blank')
      }
    } catch (error) {
      console.error('Failed to download invoice:', error)
    }
  }

  const handleViewInvoice = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice?.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank')
    }
  }

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      // Implement pagination logic
      console.log('Load more invoices')
    } finally {
      setLoadingMore(false)
    }
  }

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount_paid, 0) / 100

  const pendingAmount = invoices
    .filter(inv => inv.status === 'open')
    .reduce((sum, inv) => sum + inv.amount_due, 0) / 100

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice History
          </div>
          {totalPaid > 0 && (
            <div className="text-right text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <DollarSign className="h-3 w-3" />
                €{totalPaid.toFixed(2)} total paid
              </div>
              {pendingAmount > 0 && (
                <div className="text-xs text-yellow-600">
                  €{pendingAmount.toFixed(2)} pending
                </div>
              )}
            </div>
          )}
        </CardTitle>
        <CardDescription>
          View and download your billing history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Invoices Yet</h3>
            <p className="text-gray-500">
              Your billing history will appear here after your first payment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            {(totalPaid > 0 || pendingAmount > 0) && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    €{totalPaid.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Total Paid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {invoices.length}
                  </div>
                  <div className="text-xs text-gray-500">Total Invoices</div>
                </div>
              </div>
            )}

            {/* Invoice List */}
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <InvoiceItem
                  key={invoice.id}
                  invoice={invoice}
                  onDownload={handleDownloadInvoice}
                  onViewOnline={handleViewInvoice}
                />
              ))}
            </div>

            {/* Load More Button */}
            {invoices.length >= 10 && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More Invoices'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}