'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Globe,
  RefreshCw,
  Settings,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowRightLeft,
  Calculator,
  Clock,
  Zap
} from 'lucide-react'
import { formatPrice } from '@/lib/billing'

// Currency Configuration Types
interface Currency {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  isBaseCurrency: boolean
  enabled: boolean
  regions: string[]
  popularityScore: number
}

interface ExchangeRate {
  from: string
  to: string
  rate: number
  inverseRate: number
  lastUpdated: string
  source: string
  bid: number
  ask: number
  change24h: number
  changePercent24h: number
  high24h: number
  low24h: number
}

interface CurrencyConversion {
  id: string
  amount: number
  fromCurrency: string
  toCurrency: string
  rate: number
  convertedAmount: number
  fee?: number
  timestamp: string
  source: string
}

interface RegionalCurrencyMapping {
  country: string
  countryCode: string
  primaryCurrency: string
  alternateCurrencies: string[]
  detectedFromIP?: boolean
}

interface PricingTier {
  planCode: string
  name: string
  prices: Record<string, number>
  originalCurrency: string
}

// Mock Data
const mockCurrencies: Currency[] = [
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    isBaseCurrency: true,
    enabled: true,
    regions: ['EU', 'Europe'],
    popularityScore: 95
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    enabled: true,
    regions: ['US', 'Americas'],
    popularityScore: 100
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    isBaseCurrency: false,
    enabled: true,
    regions: ['GB', 'UK'],
    popularityScore: 85
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    enabled: true,
    regions: ['CA', 'Canada'],
    popularityScore: 70
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    enabled: true,
    regions: ['AU', 'Australia'],
    popularityScore: 65
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    isBaseCurrency: false,
    enabled: true,
    regions: ['JP', 'Japan'],
    popularityScore: 80
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    isBaseCurrency: false,
    enabled: true,
    regions: ['CH', 'Switzerland'],
    popularityScore: 60
  },
  {
    code: 'SEK',
    name: 'Swedish Krona',
    symbol: 'kr',
    decimalPlaces: 2,
    isBaseCurrency: false,
    enabled: true,
    regions: ['SE', 'Sweden'],
    popularityScore: 50
  }
]

const mockExchangeRates: ExchangeRate[] = [
  {
    from: 'EUR',
    to: 'USD',
    rate: 1.0950,
    inverseRate: 0.9132,
    lastUpdated: '2024-08-23T14:30:00Z',
    source: 'ECB',
    bid: 1.0945,
    ask: 1.0955,
    change24h: 0.0025,
    changePercent24h: 0.23,
    high24h: 1.0965,
    low24h: 1.0925
  },
  {
    from: 'EUR',
    to: 'GBP',
    rate: 0.8456,
    inverseRate: 1.1826,
    lastUpdated: '2024-08-23T14:30:00Z',
    source: 'ECB',
    bid: 0.8451,
    ask: 0.8461,
    change24h: -0.0015,
    changePercent24h: -0.18,
    high24h: 0.8475,
    low24h: 0.8440
  },
  {
    from: 'EUR',
    to: 'JPY',
    rate: 162.45,
    inverseRate: 0.0062,
    lastUpdated: '2024-08-23T14:30:00Z',
    source: 'ECB',
    bid: 162.20,
    ask: 162.70,
    change24h: 1.25,
    changePercent24h: 0.77,
    high24h: 163.10,
    low24h: 161.80
  },
  {
    from: 'EUR',
    to: 'CAD',
    rate: 1.4785,
    inverseRate: 0.6763,
    lastUpdated: '2024-08-23T14:30:00Z',
    source: 'ECB',
    bid: 1.4775,
    ask: 1.4795,
    change24h: 0.0055,
    changePercent24h: 0.37,
    high24h: 1.4805,
    low24h: 1.4750
  }
]

const mockRegionalMapping: RegionalCurrencyMapping[] = [
  {
    country: 'Netherlands',
    countryCode: 'NL',
    primaryCurrency: 'EUR',
    alternateCurrencies: ['USD'],
    detectedFromIP: true
  },
  {
    country: 'United States',
    countryCode: 'US',
    primaryCurrency: 'USD',
    alternateCurrencies: ['EUR', 'CAD'],
    detectedFromIP: false
  },
  {
    country: 'United Kingdom',
    countryCode: 'GB',
    primaryCurrency: 'GBP',
    alternateCurrencies: ['EUR', 'USD'],
    detectedFromIP: false
  },
  {
    country: 'Canada',
    countryCode: 'CA',
    primaryCurrency: 'CAD',
    alternateCurrencies: ['USD', 'EUR'],
    detectedFromIP: false
  }
]

const mockPricingTiers: PricingTier[] = [
  {
    planCode: 'basic_monthly',
    name: 'Basic Monthly',
    prices: {
      'EUR': 15.00,
      'USD': 16.43,
      'GBP': 12.68,
      'CAD': 22.18,
      'JPY': 2437,
      'AUD': 24.50
    },
    originalCurrency: 'EUR'
  },
  {
    planCode: 'full_monthly',
    name: 'Full Monthly',
    prices: {
      'EUR': 30.00,
      'USD': 32.85,
      'GBP': 25.37,
      'CAD': 44.36,
      'JPY': 4873,
      'AUD': 49.00
    },
    originalCurrency: 'EUR'
  }
]

interface CurrencyConverterProps {
  onConversion?: (conversion: CurrencyConversion) => void
}

function CurrencyConverter({ onConversion }: CurrencyConverterProps) {
  const [amount, setAmount] = useState<string>('')
  const [fromCurrency, setFromCurrency] = useState<string>('EUR')
  const [toCurrency, setToCurrency] = useState<string>('USD')
  const [conversion, setConversion] = useState<CurrencyConversion | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  const currentRate = mockExchangeRates.find(rate => 
    rate.from === fromCurrency && rate.to === toCurrency
  ) || mockExchangeRates.find(rate => 
    rate.from === toCurrency && rate.to === fromCurrency
  )

  const handleConvert = async () => {
    if (!amount || !fromCurrency || !toCurrency) return

    setIsConverting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const rate = currentRate?.from === fromCurrency ? 
        currentRate.rate : 
        currentRate?.inverseRate || 1

      const convertedAmount = parseFloat(amount) * rate

      const newConversion: CurrencyConversion = {
        id: `conv_${Date.now()}`,
        amount: parseFloat(amount),
        fromCurrency,
        toCurrency,
        rate,
        convertedAmount,
        timestamp: new Date().toISOString(),
        source: 'ECB'
      }

      setConversion(newConversion)
      onConversion?.(newConversion)
    } finally {
      setIsConverting(false)
    }
  }

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    if (conversion) {
      setAmount(conversion.convertedAmount.toString())
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Currency Converter
        </CardTitle>
        <CardDescription>
          Convert between supported currencies with real-time rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockCurrencies.filter(c => c.enabled).map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockCurrencies.filter(c => c.enabled && c.code !== fromCurrency).map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSwapCurrencies}
                className="flex-none"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {currentRate && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Current Rate:</span>
              <div className="text-right">
                <div className="font-medium">
                  1 {fromCurrency} = {currentRate.from === fromCurrency ? currentRate.rate.toFixed(4) : currentRate.inverseRate.toFixed(4)} {toCurrency}
                </div>
                <div className={`text-xs flex items-center gap-1 ${
                  currentRate.changePercent24h > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentRate.changePercent24h > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(currentRate.changePercent24h).toFixed(2)}% (24h)
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(currentRate.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}

        <Button 
          onClick={handleConvert}
          disabled={!amount || isConverting}
          className="w-full"
        >
          {isConverting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Convert
            </>
          )}
        </Button>

        {conversion && (
          <div className="p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">
                {conversion.convertedAmount.toLocaleString(undefined, {
                  style: 'currency',
                  currency: conversion.toCurrency,
                  minimumFractionDigits: mockCurrencies.find(c => c.code === conversion.toCurrency)?.decimalPlaces || 2,
                  maximumFractionDigits: mockCurrencies.find(c => c.code === conversion.toCurrency)?.decimalPlaces || 2
                })}
              </div>
              <div className="text-sm text-green-700 mt-1">
                {conversion.amount} {conversion.fromCurrency} @ {conversion.rate.toFixed(4)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ExchangeRateMonitorProps {
  rates: ExchangeRate[]
  onRefresh?: () => void
}

function ExchangeRateMonitor({ rates, onRefresh }: ExchangeRateMonitorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.()
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Exchange Rates Monitor
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time exchange rates with 24-hour trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>24h Change</TableHead>
                <TableHead>24h High/Low</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-medium">
                      {rate.from}/{rate.to}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{rate.rate.toFixed(4)}</div>
                      <div className="text-xs text-gray-500">
                        Spread: {(rate.ask - rate.bid).toFixed(4)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1 ${
                      rate.changePercent24h > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rate.changePercent24h > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <div>
                        <div className="font-medium">
                          {Math.abs(rate.changePercent24h).toFixed(2)}%
                        </div>
                        <div className="text-xs">
                          {rate.change24h > 0 ? '+' : ''}{rate.change24h.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="text-green-600">H: {rate.high24h.toFixed(4)}</div>
                      <div className="text-red-600">L: {rate.low24h.toFixed(4)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-500">
                      {new Date(rate.lastUpdated).toLocaleTimeString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">
                      <Clock className="h-3 w-3 mr-1" />
                      Live
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

interface MultiCurrencyPricingProps {
  pricingTiers: PricingTier[]
  selectedCurrency: string
  onCurrencyChange?: (currency: string) => void
}

function MultiCurrencyPricing({ pricingTiers, selectedCurrency, onCurrencyChange }: MultiCurrencyPricingProps) {
  const selectedCurrencyInfo = mockCurrencies.find(c => c.code === selectedCurrency)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Multi-Currency Pricing
          </div>
          <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockCurrencies.filter(c => c.enabled).map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
        <CardDescription>
          View pricing in your preferred currency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {pricingTiers.map((tier) => {
            const price = tier.prices[selectedCurrency]
            const originalPrice = tier.prices[tier.originalCurrency]
            const rate = price / originalPrice
            
            return (
              <div key={tier.planCode} className="p-4 border rounded-lg">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{tier.name}</h3>
                    {tier.originalCurrency !== selectedCurrency && (
                      <div className="text-xs text-gray-500">
                        Original: {tier.prices[tier.originalCurrency]} {tier.originalCurrency}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-3xl font-bold">
                    {price?.toLocaleString(undefined, {
                      style: 'currency',
                      currency: selectedCurrency,
                      minimumFractionDigits: selectedCurrencyInfo?.decimalPlaces || 2,
                      maximumFractionDigits: selectedCurrencyInfo?.decimalPlaces || 2
                    })}
                  </div>
                  
                  {tier.originalCurrency !== selectedCurrency && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Rate: {rate.toFixed(4)}</span>
                    </div>
                  )}
                  
                  <Button className="w-full">
                    Select Plan
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <div className="font-medium">Currency Notice</div>
              <div>
                Prices are converted from EUR at current exchange rates. 
                Final billing will use the rate at the time of purchase.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface RegionalCurrencyDetectionProps {
  mapping: RegionalCurrencyMapping[]
  onRegionChange?: (region: RegionalCurrencyMapping) => void
}

function RegionalCurrencyDetection({ mapping, onRegionChange }: RegionalCurrencyDetectionProps) {
  const [detectedRegion] = useState<RegionalCurrencyMapping>(
    mapping.find(m => m.detectedFromIP) || mapping[0]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Regional Currency Detection
        </CardTitle>
        <CardDescription>
          Automatic currency selection based on your location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium">Detected Location</div>
              <div className="text-sm text-green-700">
                {detectedRegion.country} ({detectedRegion.countryCode})
              </div>
            </div>
          </div>
          <Badge variant="success">
            <Zap className="h-3 w-3 mr-1" />
            Auto-detected
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Recommended Currency</Label>
            <div className="mt-1 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">{detectedRegion.primaryCurrency}</span>
                  <span className="text-gray-600">
                    {mockCurrencies.find(c => c.code === detectedRegion.primaryCurrency)?.name}
                  </span>
                </div>
                <Button size="sm" onClick={() => onRegionChange?.(detectedRegion)}>
                  Use Currency
                </Button>
              </div>
            </div>
          </div>

          {detectedRegion.alternateCurrencies.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Alternative Currencies</Label>
              <div className="mt-1 space-y-2">
                {detectedRegion.alternateCurrencies.map((currencyCode) => {
                  const currency = mockCurrencies.find(c => c.code === currencyCode)
                  return (
                    <div key={currencyCode} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-gray-500" />
                        <span className="text-sm">{currencyCode} - {currency?.name}</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Select
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Currency detection based on IP geolocation</div>
            <div>• You can change your preferred currency at any time</div>
            <div>• Prices are converted using real-time exchange rates</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MultiCurrencySystem() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')
  const [conversions, setConversions] = useState<CurrencyConversion[]>([])

  const handleConversion = (conversion: CurrencyConversion) => {
    setConversions(prev => [conversion, ...prev.slice(0, 4)]) // Keep last 5
  }

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency)
  }

  const handleRegionChange = (region: RegionalCurrencyMapping) => {
    setSelectedCurrency(region.primaryCurrency)
  }

  return (
    <div className="space-y-6">
      {/* Regional Currency Detection */}
      <RegionalCurrencyDetection 
        mapping={mockRegionalMapping} 
        onRegionChange={handleRegionChange}
      />

      {/* Currency Converter */}
      <CurrencyConverter onConversion={handleConversion} />

      {/* Exchange Rate Monitor */}
      <ExchangeRateMonitor 
        rates={mockExchangeRates} 
        onRefresh={() => console.log('Refreshing rates...')}
      />

      {/* Multi-Currency Pricing */}
      <MultiCurrencyPricing 
        pricingTiers={mockPricingTiers}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={handleCurrencyChange}
      />

      {/* Recent Conversions */}
      {conversions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Conversions
            </CardTitle>
            <CardDescription>
              History of recent currency conversions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {conversions.map((conversion) => (
                <div key={conversion.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {conversion.amount} {conversion.fromCurrency} → {conversion.convertedAmount.toFixed(2)} {conversion.toCurrency}
                      </div>
                      <div className="text-sm text-gray-500">
                        Rate: {conversion.rate.toFixed(4)} • {new Date(conversion.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {conversion.source}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}