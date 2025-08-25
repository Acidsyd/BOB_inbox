'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'
import { 
  Calculator,
  MapPin,
  FileText,
  CheckCircle,
  AlertTriangle,
  Globe,
  Building,
  User,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Info,
  TrendingUp
} from 'lucide-react'
import { formatPrice } from '@/lib/billing'

// Tax Configuration Types
interface TaxRate {
  id: string
  country: string
  countryCode: string
  state?: string
  stateCode?: string
  city?: string
  postalCode?: string
  taxType: 'vat' | 'gst' | 'sales_tax' | 'hst' | 'pst'
  rate: number
  effectiveDate: string
  description: string
  applicableToDigitalServices: boolean
  businessThreshold?: number // Minimum revenue for tax liability
  registrationRequired: boolean
}

interface TaxCalculation {
  id: string
  amount: number
  taxableAmount: number
  appliedRates: Array<{
    rate: TaxRate
    amount: number
    description: string
  }>
  totalTaxAmount: number
  grandTotal: number
  jurisdiction: string
  calculationDate: string
  exemptionReason?: string
  vatNumber?: string
  reverseCharge?: boolean
}

interface TaxExemption {
  id: string
  organizationId: string
  exemptionType: 'vat_exempt' | 'charity' | 'government' | 'diplomatic' | 'reverse_charge'
  country: string
  certificateNumber?: string
  validFrom: string
  validUntil?: string
  uploadedDocument?: string
  verificationStatus: 'pending' | 'verified' | 'rejected'
  notes?: string
}

interface VATValidation {
  vatNumber: string
  country: string
  valid: boolean
  companyName?: string
  companyAddress?: string
  requestDate: string
  consultationNumber?: string
  error?: string
}

interface TaxReportEntry {
  period: string
  country: string
  taxType: string
  grossRevenue: number
  taxableRevenue: number
  taxAmount: number
  transactionCount: number
  exemptRevenue: number
  refundedAmount: number
}

// Mock Data
const mockTaxRates: TaxRate[] = [
  {
    id: 'nl-vat',
    country: 'Netherlands',
    countryCode: 'NL',
    taxType: 'vat',
    rate: 21,
    effectiveDate: '2019-01-01',
    description: 'Standard VAT rate for Netherlands',
    applicableToDigitalServices: true,
    businessThreshold: 0,
    registrationRequired: true
  },
  {
    id: 'de-vat',
    country: 'Germany', 
    countryCode: 'DE',
    taxType: 'vat',
    rate: 19,
    effectiveDate: '2007-01-01',
    description: 'Standard VAT rate for Germany',
    applicableToDigitalServices: true,
    businessThreshold: 22000,
    registrationRequired: true
  },
  {
    id: 'uk-vat',
    country: 'United Kingdom',
    countryCode: 'GB',
    taxType: 'vat',
    rate: 20,
    effectiveDate: '2011-01-01',
    description: 'Standard VAT rate for United Kingdom',
    applicableToDigitalServices: true,
    businessThreshold: 85000,
    registrationRequired: true
  },
  {
    id: 'us-ca-sales',
    country: 'United States',
    countryCode: 'US',
    state: 'California',
    stateCode: 'CA',
    taxType: 'sales_tax',
    rate: 8.25,
    effectiveDate: '2017-01-01',
    description: 'California state sales tax',
    applicableToDigitalServices: true,
    businessThreshold: 500000,
    registrationRequired: true
  },
  {
    id: 'ca-gst',
    country: 'Canada',
    countryCode: 'CA',
    taxType: 'gst',
    rate: 5,
    effectiveDate: '2008-01-01',
    description: 'Canadian Goods and Services Tax',
    applicableToDigitalServices: true,
    businessThreshold: 30000,
    registrationRequired: true
  }
]

const mockTaxExemptions: TaxExemption[] = [
  {
    id: 'exemption_001',
    organizationId: 'org_123',
    exemptionType: 'vat_exempt',
    country: 'Netherlands',
    certificateNumber: 'VAT-EXEMPT-NL-001',
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    verificationStatus: 'verified',
    notes: 'Educational institution exemption'
  }
]

interface TaxCalculatorProps {
  onCalculate?: (calculation: TaxCalculation) => void
}

function TaxCalculator({ onCalculate }: TaxCalculatorProps) {
  const [amount, setAmount] = useState<string>('')
  const [country, setCountry] = useState<string>('')
  const [state, setState] = useState<string>('')
  const [postalCode, setPostalCode] = useState<string>('')
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual')
  const [vatNumber, setVatNumber] = useState<string>('')
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [vatValidation, setVatValidation] = useState<VATValidation | null>(null)

  const handleCalculate = async () => {
    if (!amount || !country) return

    setIsCalculating(true)
    try {
      // Mock tax calculation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const applicableRate = mockTaxRates.find(rate => 
        rate.countryCode === country && 
        (!rate.stateCode || rate.stateCode === state)
      )

      if (applicableRate) {
        const taxableAmount = parseFloat(amount)
        const taxAmount = (taxableAmount * applicableRate.rate) / 100
        const totalAmount = taxableAmount + taxAmount

        const mockCalculation: TaxCalculation = {
          id: `calc_${Date.now()}`,
          amount: taxableAmount,
          taxableAmount: taxableAmount,
          appliedRates: [{
            rate: applicableRate,
            amount: taxAmount,
            description: `${applicableRate.taxType.toUpperCase()} ${applicableRate.rate}% - ${applicableRate.country}`
          }],
          totalTaxAmount: taxAmount,
          grandTotal: totalAmount,
          jurisdiction: applicableRate.country + (applicableRate.state ? ` - ${applicableRate.state}` : ''),
          calculationDate: new Date().toISOString(),
          vatNumber: vatNumber || undefined,
          reverseCharge: customerType === 'business' && vatNumber && country !== 'NL'
        }

        setCalculation(mockCalculation)
        onCalculate?.(mockCalculation)
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const handleVATValidation = async () => {
    if (!vatNumber || !country) return

    try {
      // Mock VAT validation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const isValid = vatNumber.startsWith(country.toUpperCase()) && vatNumber.length >= 8

      setVatValidation({
        vatNumber,
        country,
        valid: isValid,
        companyName: isValid ? 'Example Company B.V.' : undefined,
        companyAddress: isValid ? 'Business District, Amsterdam, NL' : undefined,
        requestDate: new Date().toISOString(),
        consultationNumber: isValid ? `CNS${Date.now()}` : undefined,
        error: isValid ? undefined : 'Invalid VAT number format'
      })
    } catch (error) {
      setVatValidation({
        vatNumber,
        country,
        valid: false,
        requestDate: new Date().toISOString(),
        error: 'Validation service unavailable'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tax Calculator
        </CardTitle>
        <CardDescription>
          Calculate taxes based on location and customer type
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (EUR)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NL">Netherlands</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {country === 'US' && (
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="NY">New York</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              placeholder="1000 AA"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Customer Type</Label>
            <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {customerType === 'business' && (
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="vatNumber"
                  placeholder="NL123456789B01"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleVATValidation}
                  disabled={!vatNumber || !country}
                >
                  Validate
                </Button>
              </div>
            </div>
          )}
        </div>

        {vatValidation && (
          <Alert className={vatValidation.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {vatValidation.valid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                {vatValidation.valid ? (
                  <div>
                    <div className="font-medium">VAT number is valid</div>
                    {vatValidation.companyName && (
                      <div className="text-sm">Company: {vatValidation.companyName}</div>
                    )}
                    {vatValidation.companyAddress && (
                      <div className="text-sm">Address: {vatValidation.companyAddress}</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">VAT validation failed</div>
                    <div className="text-sm">{vatValidation.error}</div>
                  </div>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Button 
          onClick={handleCalculate} 
          disabled={!amount || !country || isCalculating}
          className="w-full"
        >
          {isCalculating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Tax
            </>
          )}
        </Button>

        {calculation && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-3">Tax Calculation Result</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(calculation.amount)}</span>
              </div>
              {calculation.appliedRates.map((appliedRate, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{appliedRate.description}:</span>
                  <span>{formatPrice(appliedRate.amount)}</span>
                </div>
              ))}
              {calculation.reverseCharge && (
                <div className="text-sm text-blue-600 italic">
                  * Reverse charge applies - VAT to be paid by recipient
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>{formatPrice(calculation.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TaxRateManagerProps {
  rates: TaxRate[]
  onUpdate?: (rates: TaxRate[]) => void
}

function TaxRateManager({ rates, onUpdate }: TaxRateManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateRates = async () => {
    setIsUpdating(true)
    try {
      // Mock API call to update tax rates
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Tax rates updated successfully')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Tax Rate Configuration
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateRates}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Updating...' : 'Update Rates'}
          </Button>
        </CardTitle>
        <CardDescription>
          Current tax rates for different jurisdictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Tax Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Digital Services</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{rate.country}</div>
                        {rate.state && (
                          <div className="text-sm text-gray-500">{rate.state}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rate.taxType.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{rate.rate}%</TableCell>
                  <TableCell>
                    {rate.businessThreshold ? 
                      formatPrice(rate.businessThreshold) : 
                      'No threshold'
                    }
                  </TableCell>
                  <TableCell>
                    {rate.applicableToDigitalServices ? (
                      <Badge variant="success">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rate.registrationRequired ? 'default' : 'outline'}>
                      {rate.registrationRequired ? 'Registration Required' : 'Optional'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

interface TaxExemptionManagerProps {
  exemptions: TaxExemption[]
  onAdd?: (exemption: Omit<TaxExemption, 'id'>) => void
}

function TaxExemptionManager({ exemptions, onAdd }: TaxExemptionManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newExemption, setNewExemption] = useState({
    exemptionType: 'vat_exempt' as const,
    country: '',
    certificateNumber: '',
    validFrom: '',
    validUntil: '',
    notes: ''
  })

  const handleSubmit = async () => {
    if (!newExemption.country || !newExemption.validFrom) return

    try {
      await onAdd?.({
        organizationId: 'org_current',
        ...newExemption,
        verificationStatus: 'pending'
      })
      setIsDialogOpen(false)
      setNewExemption({
        exemptionType: 'vat_exempt',
        country: '',
        certificateNumber: '',
        validFrom: '',
        validUntil: '',
        notes: ''
      })
    } catch (error) {
      console.error('Failed to add tax exemption:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Tax Exemptions
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Add Exemption
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tax Exemption</DialogTitle>
                <DialogDescription>
                  Register a tax exemption certificate for your organization
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Exemption Type</Label>
                  <Select 
                    value={newExemption.exemptionType} 
                    onValueChange={(value: any) => setNewExemption(prev => ({ ...prev, exemptionType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vat_exempt">VAT Exempt</SelectItem>
                      <SelectItem value="charity">Charity</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="diplomatic">Diplomatic</SelectItem>
                      <SelectItem value="reverse_charge">Reverse Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select 
                    value={newExemption.country} 
                    onValueChange={(value) => setNewExemption(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Netherlands">Netherlands</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Certificate Number</Label>
                  <Input
                    placeholder="CERT-123456"
                    value={newExemption.certificateNumber}
                    onChange={(e) => setNewExemption(prev => ({ ...prev, certificateNumber: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Valid From</Label>
                    <Input
                      type="date"
                      value={newExemption.validFrom}
                      onChange={(e) => setNewExemption(prev => ({ ...prev, validFrom: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={newExemption.validUntil}
                      onChange={(e) => setNewExemption(prev => ({ ...prev, validUntil: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes about this exemption..."
                    value={newExemption.notes}
                    onChange={(e) => setNewExemption(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    Add Exemption
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>
          Manage tax exemptions and certificates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {exemptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tax exemptions registered</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exemptions.map((exemption) => (
              <div key={exemption.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {exemption.exemptionType.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge 
                        variant={
                          exemption.verificationStatus === 'verified' ? 'success' :
                          exemption.verificationStatus === 'rejected' ? 'destructive' :
                          'default'
                        }
                      >
                        {exemption.verificationStatus}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{exemption.country}</div>
                      {exemption.certificateNumber && (
                        <div className="text-gray-500">Cert: {exemption.certificateNumber}</div>
                      )}
                      <div className="text-gray-500">
                        Valid: {new Date(exemption.validFrom).toLocaleDateString()} - {' '}
                        {exemption.validUntil ? new Date(exemption.validUntil).toLocaleDateString() : 'Indefinite'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {exemption.notes && (
                  <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                    {exemption.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function TaxCalculationSystem() {
  const [taxRates] = useState<TaxRate[]>(mockTaxRates)
  const [exemptions, setExemptions] = useState<TaxExemption[]>(mockTaxExemptions)
  const [calculations, setCalculations] = useState<TaxCalculation[]>([])

  const handleAddExemption = (exemption: Omit<TaxExemption, 'id'>) => {
    const newExemption: TaxExemption = {
      ...exemption,
      id: `exemption_${Date.now()}`
    }
    setExemptions(prev => [...prev, newExemption])
  }

  const handleCalculation = (calculation: TaxCalculation) => {
    setCalculations(prev => [calculation, ...prev.slice(0, 9)]) // Keep last 10
  }

  return (
    <div className="space-y-6">
      {/* Tax Calculator */}
      <TaxCalculator onCalculate={handleCalculation} />

      {/* Tax Rate Configuration */}
      <TaxRateManager rates={taxRates} />

      {/* Tax Exemptions */}
      <TaxExemptionManager exemptions={exemptions} onAdd={handleAddExemption} />

      {/* Recent Calculations */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Calculations
            </CardTitle>
            <CardDescription>
              History of recent tax calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {calculations.map((calc) => (
                <div key={calc.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{calc.jurisdiction}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(calc.calculationDate).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(calc.grandTotal)}</div>
                      <div className="text-sm text-gray-500">
                        Tax: {formatPrice(calc.totalTaxAmount)}
                      </div>
                    </div>
                  </div>
                  {calc.reverseCharge && (
                    <Badge variant="outline" className="mt-2">
                      Reverse Charge
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}