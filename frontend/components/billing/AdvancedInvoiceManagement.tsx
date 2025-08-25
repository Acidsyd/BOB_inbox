'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Download,
  Search,
  Filter,
  Mail,
  Calendar,
  FileText,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  Send,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/billing'

// Enhanced Invoice Interface
interface EnhancedInvoice {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void' | 'refunded'
  amount_subtotal: number
  amount_tax: number
  amount_total: number
  amount_due: number
  amount_paid: number
  currency: string
  description?: string
  notes?: string
  
  // Dates
  created_date: string
  issued_date: string
  due_date: string
  paid_date?: string
  
  // Customer Information
  customer: {
    id: string
    name: string
    email: string
    address?: {
      line1: string
      line2?: string
      city: string
      state?: string
      postal_code: string
      country: string
    }
    tax_id?: string
    vat_number?: string
  }
  
  // Line Items
  line_items: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    amount: number
    tax_rate?: number
    tax_amount?: number
    period?: {
      start: string
      end: string
    }
  }>
  
  // Tax Details
  tax_details: Array<{
    type: 'vat' | 'gst' | 'sales_tax'
    jurisdiction: string
    rate: number
    amount: number
  }>
  
  // Files and URLs
  pdf_url?: string
  receipt_url?: string
  hosted_invoice_url?: string
  
  // Payment Information
  payment_method?: {
    type: string
    last4?: string
    brand?: string
  }
  
  // Email History
  email_history: Array<{
    id: string
    sent_date: string
    recipient: string
    type: 'invoice' | 'reminder' | 'receipt'
    status: 'sent' | 'delivered' | 'opened' | 'failed'
  }>
  
  // Metadata
  metadata: Record<string, any>
  tags: string[]
}

interface InvoiceFilters {
  status: string[]
  dateRange: { start?: string; end?: string }
  amountRange: { min?: number; max?: number }
  customer: string
  tags: string[]
  searchQuery: string
}

interface AdvancedInvoiceManagementProps {
  isLoading?: boolean
  onRefresh?: () => Promise<void>
}

// Mock Data
const mockInvoices: EnhancedInvoice[] = [
  {
    id: 'inv_001',
    number: 'INV-2024-001',
    status: 'paid',
    amount_subtotal: 29.00,
    amount_tax: 6.09,
    amount_total: 35.09,
    amount_due: 0,
    amount_paid: 35.09,
    currency: 'EUR',
    description: 'Monthly subscription - Full Plan',
    created_date: '2024-08-01T00:00:00Z',
    issued_date: '2024-08-01T00:00:00Z',
    due_date: '2024-08-15T00:00:00Z',
    paid_date: '2024-08-03T10:30:00Z',
    customer: {
      id: 'cust_001',
      name: 'Acme Corporation',
      email: 'billing@acme.com',
      address: {
        line1: '123 Business Ave',
        city: 'Amsterdam',
        postal_code: '1000 AA',
        country: 'NL'
      },
      vat_number: 'NL123456789B01'
    },
    line_items: [
      {
        id: 'li_001',
        description: 'Full Plan - Monthly Subscription',
        quantity: 1,
        unit_price: 29.00,
        amount: 29.00,
        tax_rate: 21,
        tax_amount: 6.09,
        period: {
          start: '2024-08-01T00:00:00Z',
          end: '2024-08-31T23:59:59Z'
        }
      }
    ],
    tax_details: [
      {
        type: 'vat',
        jurisdiction: 'Netherlands',
        rate: 21,
        amount: 6.09
      }
    ],
    pdf_url: 'https://invoices.stripe.com/invoice_123.pdf',
    hosted_invoice_url: 'https://invoice.stripe.com/i/inv_001',
    payment_method: {
      type: 'card',
      last4: '4242',
      brand: 'visa'
    },
    email_history: [
      {
        id: 'email_001',
        sent_date: '2024-08-01T09:00:00Z',
        recipient: 'billing@acme.com',
        type: 'invoice',
        status: 'opened'
      },
      {
        id: 'email_002',
        sent_date: '2024-08-03T11:00:00Z',
        recipient: 'billing@acme.com',
        type: 'receipt',
        status: 'delivered'
      }
    ],
    metadata: {},
    tags: ['monthly', 'subscription']
  },
  {
    id: 'inv_002',
    number: 'INV-2024-002',
    status: 'overdue',
    amount_subtotal: 29.00,
    amount_tax: 6.09,
    amount_total: 35.09,
    amount_due: 35.09,
    amount_paid: 0,
    currency: 'EUR',
    description: 'Monthly subscription - Full Plan',
    created_date: '2024-07-01T00:00:00Z',
    issued_date: '2024-07-01T00:00:00Z',
    due_date: '2024-07-15T00:00:00Z',
    customer: {
      id: 'cust_002',
      name: 'StartupXYZ Ltd',
      email: 'finance@startupxyz.com',
      address: {
        line1: '456 Innovation St',
        city: 'Berlin',
        postal_code: '10115',
        country: 'DE'
      },
      vat_number: 'DE987654321'
    },
    line_items: [
      {
        id: 'li_002',
        description: 'Full Plan - Monthly Subscription',
        quantity: 1,
        unit_price: 29.00,
        amount: 29.00,
        tax_rate: 19,
        tax_amount: 5.51,
        period: {
          start: '2024-07-01T00:00:00Z',
          end: '2024-07-31T23:59:59Z'
        }
      }
    ],
    tax_details: [
      {
        type: 'vat',
        jurisdiction: 'Germany',
        rate: 19,
        amount: 5.51
      }
    ],
    pdf_url: 'https://invoices.stripe.com/invoice_124.pdf',
    email_history: [
      {
        id: 'email_003',
        sent_date: '2024-07-01T09:00:00Z',
        recipient: 'finance@startupxyz.com',
        type: 'invoice',
        status: 'delivered'
      },
      {
        id: 'email_004',
        sent_date: '2024-07-16T09:00:00Z',
        recipient: 'finance@startupxyz.com',
        type: 'reminder',
        status: 'opened'
      }
    ],
    metadata: {},
    tags: ['monthly', 'overdue']
  }
]

function InvoiceStatusBadge({ status }: { status: EnhancedInvoice['status'] }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return { variant: 'success' as const, icon: <CheckCircle className="h-3 w-3" />, label: 'Paid' }
      case 'sent':
        return { variant: 'default' as const, icon: <Mail className="h-3 w-3" />, label: 'Sent' }
      case 'overdue':
        return { variant: 'destructive' as const, icon: <AlertCircle className="h-3 w-3" />, label: 'Overdue' }
      case 'draft':
        return { variant: 'secondary' as const, icon: <FileText className="h-3 w-3" />, label: 'Draft' }
      case 'void':
        return { variant: 'outline' as const, icon: <AlertCircle className="h-3 w-3" />, label: 'Void' }
      case 'refunded':
        return { variant: 'outline' as const, icon: <RefreshCw className="h-3 w-3" />, label: 'Refunded' }
      default:
        return { variant: 'secondary' as const, icon: <Clock className="h-3 w-3" />, label: status }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  )
}

function InvoiceDetailDialog({ invoice, onClose }: { invoice: EnhancedInvoice; onClose: () => void }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const handleDownload = async (format: 'pdf' | 'csv' | 'xlsx') => {
    setIsDownloading(true)
    try {
      // Mock download functionality
      console.log(`Downloading invoice ${invoice.number} in ${format} format`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSendEmail = async () => {
    setIsSendingEmail(true)
    try {
      console.log(`Sending invoice ${invoice.number} to ${invoice.customer.email}`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              Invoice {invoice.number}
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('pdf')}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSendingEmail ? 'Sending...' : 'Email'}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Invoice details and transaction history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Invoice Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Issue Date:</span>
                  <span className="text-sm font-medium">{formatDate(invoice.issued_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Due Date:</span>
                  <span className="text-sm font-medium">{formatDate(invoice.due_date)}</span>
                </div>
                {invoice.paid_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Paid Date:</span>
                    <span className="text-sm font-medium text-green-600">{formatDate(invoice.paid_date)}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatPrice(invoice.amount_total, invoice.currency)}</span>
                  </div>
                  {invoice.amount_due > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Amount Due:</span>
                      <span>{formatPrice(invoice.amount_due, invoice.currency)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium">{invoice.customer.name}</div>
                  <div className="text-sm text-gray-600">{invoice.customer.email}</div>
                </div>
                {invoice.customer.address && (
                  <div className="text-sm text-gray-600">
                    <div>{invoice.customer.address.line1}</div>
                    {invoice.customer.address.line2 && <div>{invoice.customer.address.line2}</div>}
                    <div>
                      {invoice.customer.address.city}, {invoice.customer.address.postal_code}
                    </div>
                    <div>{invoice.customer.address.country}</div>
                  </div>
                )}
                {invoice.customer.vat_number && (
                  <div className="text-sm">
                    <span className="text-gray-600">VAT Number:</span>
                    <span className="ml-2 font-mono">{invoice.customer.vat_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.line_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.description}</div>
                          {item.period && (
                            <div className="text-xs text-gray-500">
                              {formatDate(item.period.start)} - {formatDate(item.period.end)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.unit_price, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tax_amount ? formatPrice(item.tax_amount, invoice.currency) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(item.amount + (item.tax_amount || 0), invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Invoice Totals */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(invoice.amount_subtotal, invoice.currency)}</span>
                    </div>
                    {invoice.tax_details.map((tax, index) => (
                      <div key={index} className="flex justify-between text-sm text-gray-600">
                        <span>
                          {tax.type.toUpperCase()} ({tax.rate}%) - {tax.jurisdiction}:
                        </span>
                        <span>{formatPrice(tax.amount, invoice.currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatPrice(invoice.amount_total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          {invoice.payment_method && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                  <span className="capitalize">{invoice.payment_method.brand}</span>
                  <span>****{invoice.payment_method.last4}</span>
                  {invoice.paid_date && (
                    <Badge variant="success">
                      Paid {formatDate(invoice.paid_date)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoice.email_history.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {email.type} sent to {email.recipient}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(email.sent_date)}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant={email.status === 'opened' ? 'success' : email.status === 'failed' ? 'destructive' : 'default'}
                    >
                      {email.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function AdvancedInvoiceManagement({ isLoading, onRefresh }: AdvancedInvoiceManagementProps) {
  const [invoices] = useState<EnhancedInvoice[]>(mockInvoices)
  const [filteredInvoices, setFilteredInvoices] = useState<EnhancedInvoice[]>(mockInvoices)
  const [selectedInvoice, setSelectedInvoice] = useState<EnhancedInvoice | null>(null)
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: [],
    dateRange: {},
    amountRange: {},
    customer: '',
    tags: [],
    searchQuery: ''
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filter invoices based on current filters
  useEffect(() => {
    let filtered = invoices

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(invoice =>
        invoice.number.toLowerCase().includes(query) ||
        invoice.customer.name.toLowerCase().includes(query) ||
        invoice.customer.email.toLowerCase().includes(query) ||
        invoice.description?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(invoice => filters.status.includes(invoice.status))
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.issued_date)
        const start = filters.dateRange.start ? new Date(filters.dateRange.start) : new Date('1970-01-01')
        const end = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date('2099-12-31')
        return invoiceDate >= start && invoiceDate <= end
      })
    }

    // Amount range filter
    if (filters.amountRange.min !== undefined || filters.amountRange.max !== undefined) {
      filtered = filtered.filter(invoice => {
        const amount = invoice.amount_total
        const min = filters.amountRange.min ?? 0
        const max = filters.amountRange.max ?? Infinity
        return amount >= min && amount <= max
      })
    }

    setFilteredInvoices(filtered)
  }, [invoices, filters])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleBulkAction = (action: 'email' | 'download' | 'void', selectedIds: string[]) => {
    console.log(`Performing ${action} on invoices:`, selectedIds)
  }

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount_total, 0)
  const totalPaid = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount_paid, 0)
  const totalOutstanding = filteredInvoices.filter(inv => inv.amount_due > 0).reduce((sum, inv) => sum + inv.amount_due, 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
                <p className="text-2xl font-bold">{formatPrice(totalAmount)}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatPrice(totalOutstanding)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Management
              <Badge variant="outline">{filteredInvoices.length} invoices</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage invoices, track payments, and handle billing communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search invoices by number, customer, or description..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="border-0 bg-transparent"
              />
            </div>
            
            <Select
              value={filters.status.join(',')}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value ? value.split(',') : [] }))}
            >
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Input
                type="date"
                value={filters.dateRange.start || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, start: e.target.value } 
                }))}
                className="w-40"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={filters.dateRange.end || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: { ...prev.dateRange, end: e.target.value } 
                }))}
                className="w-40"
              />
            </div>
          </div>

          {/* Invoice Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.number}</div>
                        <div className="text-sm text-gray-500">{invoice.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customer.name}</div>
                        <div className="text-sm text-gray-500">{invoice.customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>{formatDate(invoice.issued_date)}</TableCell>
                    <TableCell>
                      <div className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(invoice.due_date)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-right">
                        <div className="font-medium">{formatPrice(invoice.amount_total, invoice.currency)}</div>
                        {invoice.amount_due > 0 && (
                          <div className="text-sm text-red-600">
                            {formatPrice(invoice.amount_due, invoice.currency)} due
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(invoice.pdf_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => console.log(`Send email for ${invoice.number}`)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  )
}