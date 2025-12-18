'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  ExternalLink,
  Users,
  Trophy,
  PieChart
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

type ReportPeriod = '7d' | '30d' | '90d' | '12m' | 'all'

type Payment = {
  id: string
  amount: number
  status: 'succeeded' | 'pending' | 'failed' | 'refunded'
  payment_method: string | null
  stripe_payment_intent_id: string | null
  customer_id: string | null
  invoice_id: string | null
  created_at: string
  org_id: string
}

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total: number | null
  paid_at: string | null
  customer_id: string | null
  created_at: string
}

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  email: string | null
}

type PaymentMetrics = {
  totalRevenue: number
  previousRevenue: number
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  pendingPayments: number
  refundedPayments: number
  successRate: number
  averagePayment: number
  refundTotal: number
}

// Phase 7.2 Completion - Types for additional analytics
type PaymentMethodBreakdown = {
  method: string
  count: number
  total: number
  percentage: number
}

type CustomerLeaderboardEntry = {
  id: string
  name: string
  totalPaid: number
  paymentCount: number
}

type PaymentTrend = {
  date: string
  amount: number
  count: number
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
  const [recentPayments, setRecentPayments] = useState<(Payment & { customer?: Customer; invoice?: Invoice })[]>([])
  
  // Phase 7.2 Completion - State variables for additional analytics
  const [methodBreakdown, setMethodBreakdown] = useState<PaymentMethodBreakdown[]>([])
  const [customerLeaderboard, setCustomerLeaderboard] = useState<CustomerLeaderboardEntry[]>([])
  const [trends, setTrends] = useState<PaymentTrend[]>([])

  const periodLabel = useMemo(() => {
    switch (period) {
      case '7d': return 'Last 7 Days'
      case '30d': return 'Last 30 Days'
      case '90d': return 'Last 90 Days'
      case '12m': return 'Last 12 Months'
      case 'all': return 'All Time'
    }
  }, [period])

  const getDateRange = (p: ReportPeriod): { start: Date; end: Date } => {
    const end = new Date()
    const start = new Date()
    
    switch (p) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
      case '12m':
        start.setFullYear(start.getFullYear() - 1)
        break
      case 'all':
        start.setFullYear(2020)
        break
    }
    
    return { start, end }
  }

  // Phase 7.2 Completion - Calculate payment method breakdown
  const calculateMethodBreakdown = (payments: Payment[]): PaymentMethodBreakdown[] => {
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const methodMap = new Map<string, { count: number; total: number }>()
    
    successfulPayments.forEach(payment => {
      const method = payment.payment_method || 'unknown'
      const existing = methodMap.get(method) || { count: 0, total: 0 }
      methodMap.set(method, {
        count: existing.count + 1,
        total: existing.total + (payment.amount || 0)
      })
    })
    
    const totalPayments = successfulPayments.length
    const breakdown: PaymentMethodBreakdown[] = []
    
    methodMap.forEach((value, key) => {
      breakdown.push({
        method: key,
        count: value.count,
        total: value.total,
        percentage: totalPayments > 0 ? (value.count / totalPayments) * 100 : 0
      })
    })
    
    // Sort by count descending
    return breakdown.sort((a, b) => b.count - a.count)
  }

  // Phase 7.2 Completion - Calculate customer leaderboard
  const calculateCustomerLeaderboard = (
    payments: Payment[], 
    customerMap: Map<string, Customer>
  ): CustomerLeaderboardEntry[] => {
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const customerStats = new Map<string, { totalPaid: number; paymentCount: number }>()
    
    successfulPayments.forEach(payment => {
      if (payment.customer_id) {
        const existing = customerStats.get(payment.customer_id) || { totalPaid: 0, paymentCount: 0 }
        customerStats.set(payment.customer_id, {
          totalPaid: existing.totalPaid + (payment.amount || 0),
          paymentCount: existing.paymentCount + 1
        })
      }
    })
    
    const leaderboard: CustomerLeaderboardEntry[] = []
    
    customerStats.forEach((stats, customerId) => {
      const customer = customerMap.get(customerId)
      const name = customer 
        ? (customer.company_name || 
           `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
           customer.email || 
           'Unknown Customer')
        : 'Unknown Customer'
      
      leaderboard.push({
        id: customerId,
        name,
        totalPaid: stats.totalPaid,
        paymentCount: stats.paymentCount
      })
    })
    
    // Sort by total paid descending and take top 5
    return leaderboard.sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 5)
  }

  // Phase 7.2 Completion - Calculate payment trends
  const calculateTrends = (payments: Payment[], start: Date, end: Date): PaymentTrend[] => {
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const dayMap = new Map<string, { amount: number; count: number }>()
    
    // Initialize all days in range
    const current = new Date(start)
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0]
      dayMap.set(dateKey, { amount: 0, count: 0 })
      current.setDate(current.getDate() + 1)
    }
    
    // Aggregate payments by day
    successfulPayments.forEach(payment => {
      const dateKey = new Date(payment.created_at).toISOString().split('T')[0]
      const existing = dayMap.get(dateKey)
      if (existing) {
        dayMap.set(dateKey, {
          amount: existing.amount + (payment.amount || 0),
          count: existing.count + 1
        })
      }
    })
    
    // Convert to array and format for chart
    const trends: PaymentTrend[] = []
    dayMap.forEach((value, date) => {
      trends.push({
        date,
        amount: value.amount / 100, // Convert cents to dollars for display
        count: value.count
      })
    })
    
    // Sort by date
    return trends.sort((a, b) => a.date.localeCompare(b.date))
  }

  const fetchPaymentData = async (isRefresh = false) => {
    if (!user) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    const supabase = createClient()
    if (!supabase) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData?.org_id) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    const orgId = userData.org_id
    const { start, end } = getDateRange(period)
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    // Previous period for comparison
    const prevStart = new Date(start)
    prevStart.setTime(prevStart.getTime() - (end.getTime() - start.getTime()))

    // Fetch payments, invoices, and customers in parallel
    const [paymentsResult, prevPaymentsResult, invoicesResult, customersResult] = await Promise.all([
      // Current period payments
      supabase
        .from('payments')
        .select('*')
        .eq('org_id', orgId)
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false }),
      
      // Previous period payments for comparison
      supabase
        .from('payments')
        .select('id, amount, status')
        .eq('org_id', orgId)
        .eq('status', 'succeeded')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', startISO),
      
      // Paid invoices for reference
      supabase
        .from('invoices')
        .select('id, invoice_number, status, total, paid_at, customer_id, created_at')
        .eq('org_id', orgId)
        .eq('status', 'paid')
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      
      // All customers for name lookup
      supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email')
        .eq('org_id', orgId)
    ])

    const payments = (paymentsResult.data || []) as Payment[]
    const prevPayments = (prevPaymentsResult.data || []) as Payment[]
    const invoices = (invoicesResult.data || []) as Invoice[]
    const customers = (customersResult.data || []) as Customer[]

    // Create lookup maps
    const customerMap = new Map(customers.map(c => [c.id, c]))
    const invoiceMap = new Map(invoices.map(i => [i.id, i]))

    // Calculate metrics
    const successfulPayments = payments.filter(p => p.status === 'succeeded')
    const failedPayments = payments.filter(p => p.status === 'failed')
    const pendingPayments = payments.filter(p => p.status === 'pending')
    const refundedPayments = payments.filter(p => p.status === 'refunded')

    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const previousRevenue = prevPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const refundTotal = refundedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const averagePayment = successfulPayments.length > 0 
      ? totalRevenue / successfulPayments.length 
      : 0
    const successRate = payments.length > 0 
      ? (successfulPayments.length / payments.length) * 100 
      : 0

    setMetrics({
      totalRevenue,
      previousRevenue,
      totalPayments: payments.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      pendingPayments: pendingPayments.length,
      refundedPayments: refundedPayments.length,
      successRate,
      averagePayment,
      refundTotal
    })

    // Enrich recent payments with customer and invoice data
    const enrichedPayments = payments.slice(0, 20).map(payment => ({
      ...payment,
      customer: payment.customer_id ? customerMap.get(payment.customer_id) : undefined,
      invoice: payment.invoice_id ? invoiceMap.get(payment.invoice_id) : undefined
    }))

    setRecentPayments(enrichedPayments)

    // Phase 7.2 Completion - Calculate additional metrics
    setMethodBreakdown(calculateMethodBreakdown(payments))
    setCustomerLeaderboard(calculateCustomerLeaderboard(payments, customerMap))
    setTrends(calculateTrends(payments, start, end))

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchPaymentData()
  }, [user, period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount / 100) // Stripe amounts are in cents
  }

  const formatCurrencyDollars = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount) // Already in dollars
  }

  const formatPercent = (value: number) => `${Math.round(value)}%`

  const getRevenueChange = () => {
    if (!metrics || metrics.previousRevenue === 0) return null
    return ((metrics.totalRevenue - metrics.previousRevenue) / metrics.previousRevenue) * 100
  }

  const revenueChange = getRevenueChange()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-400" />
      case 'refunded':
        return <ArrowDownRight className="h-4 w-4 text-purple-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'refunded':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(timestamp))
  }

  const getCustomerName = (customer?: Customer) => {
    if (!customer) return 'Unknown Customer'
    return customer.company_name || 
           `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
           customer.email ||
           'Unknown Customer'
  }

  const formatPaymentMethod = (method: string | null) => {
    if (!method) return 'Unknown'
    // Format common payment method types
    const formatted = method.replace(/_/g, ' ')
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  const getMethodIcon = (method: string) => {
    const lowerMethod = method.toLowerCase()
    if (lowerMethod.includes('card') || lowerMethod.includes('visa') || lowerMethod.includes('mastercard')) {
      return <CreditCard className="h-4 w-4 text-blue-400" />
    }
    if (lowerMethod.includes('apple') || lowerMethod.includes('google') || lowerMethod.includes('wallet')) {
      return <Wallet className="h-4 w-4 text-purple-400" />
    }
    if (lowerMethod.includes('bank') || lowerMethod.includes('transfer') || lowerMethod.includes('becs')) {
      return <DollarSign className="h-4 w-4 text-green-400" />
    }
    return <CreditCard className="h-4 w-4 text-gray-400" />
  }

  const formatTrendDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit',
      month: 'short'
    }).format(date)
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400' // Gold
      case 1: return 'text-gray-300' // Silver
      case 2: return 'text-amber-600' // Bronze
      default: return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-flowtrade-cyan" />
            Payment Analytics
          </h1>
          <p className="text-gray-400">Track payment performance and revenue metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={() => fetchPaymentData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-flowtrade-navy-light text-gray-400 border border-flowtrade-navy-lighter hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="12m">Last 12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
            {revenueChange !== null && (
              <div className={`flex items-center text-xs mt-1 ${revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(Math.round(revenueChange))}% vs previous period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatPercent(metrics?.successRate || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {metrics?.successfulPayments || 0} of {metrics?.totalPayments || 0} payments
            </p>
          </CardContent>
        </Card>

        {/* Average Payment */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Payment</CardTitle>
            <Receipt className="h-4 w-4 text-flowtrade-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(metrics?.averagePayment || 0)}
            </div>
            <p className="text-xs text-gray-500">{periodLabel}</p>
          </CardContent>
        </Card>

        {/* Refunds */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Refunds</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(metrics?.refundTotal || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {metrics?.refundedPayments || 0} refunds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-gray-400">Successful</span>
              </div>
              <span className="text-2xl font-bold text-green-400">{metrics?.successfulPayments || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <span className="text-gray-400">Pending</span>
              </div>
              <span className="text-2xl font-bold text-amber-400">{metrics?.pendingPayments || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                <span className="text-gray-400">Failed</span>
              </div>
              <span className="text-2xl font-bold text-red-400">{metrics?.failedPayments || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-purple-400" />
                <span className="text-gray-400">Refunded</span>
              </div>
              <span className="text-2xl font-bold text-purple-400">{metrics?.refundedPayments || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Trends Chart - Phase 7.2 Completion */}
      <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Payment Trends
          </CardTitle>
          <CardDescription className="text-gray-400">
            Daily payment volume for {periodLabel.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No payment data for chart</p>
              <p className="text-gray-500 text-sm">Payment trends will appear here when data is available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00D4AA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatTrendDate}
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`, 'Revenue']}
                  labelFormatter={(label) => formatTrendDate(label)}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#00D4AA" 
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods & Top Customers Grid - Phase 7.2 Completion */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Method Breakdown Card */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-400" />
              Payment Methods
            </CardTitle>
            <CardDescription className="text-gray-400">
              Breakdown by payment type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {methodBreakdown.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No payment method data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {methodBreakdown.map((method, index) => (
                  <div key={method.method} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(method.method)}
                        <span className="text-white text-sm font-medium">
                          {formatPaymentMethod(method.method)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">
                          {formatCurrency(method.total)}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">
                          ({method.count} payments)
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-flowtrade-navy rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
                        style={{ width: `${method.percentage}%` }}
                      />
                    </div>
                    <p className="text-gray-500 text-xs text-right">
                      {Math.round(method.percentage)}% of payments
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers Leaderboard Card */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Top Customers
            </CardTitle>
            <CardDescription className="text-gray-400">
              Top 5 by payment volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customerLeaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No customer payment data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerLeaderboard.map((customer, index) => (
                  <div 
                    key={customer.id} 
                    className="flex items-center justify-between bg-flowtrade-navy rounded-lg p-3 hover:bg-flowtrade-navy-lighter/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-flowtrade-navy-lighter ${getMedalColor(index)}`}>
                        {index < 3 ? (
                          <Trophy className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{customer.name}</p>
                        <p className="text-gray-500 text-xs">
                          {customer.paymentCount} payment{customer.paymentCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">
                        {formatCurrency(customer.totalPaid)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-flowtrade-cyan" />
            Recent Payments
          </CardTitle>
          <CardDescription className="text-gray-400">
            Last 20 payments in {periodLabel.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No payments found</p>
              <p className="text-gray-500 text-sm">Payments will appear here when processed</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between bg-flowtrade-navy rounded-lg p-4 hover:bg-flowtrade-navy-lighter/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    {getStatusIcon(payment.status)}
                    
                    {/* Payment details */}
                    <div>
                      <p className="text-white font-medium">
                        {getCustomerName(payment.customer)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatTimestamp(payment.created_at)}</span>
                        {payment.invoice && (
                          <>
                            <span>•</span>
                            <span>Invoice #{payment.invoice.invoice_number}</span>
                          </>
                        )}
                        {payment.payment_method && (
                          <>
                            <span>•</span>
                            <span>{formatPaymentMethod(payment.payment_method)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Status badge */}
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                    
                    {/* Amount */}
                    <div className="text-right">
                      <p className={`font-bold ${
                        payment.status === 'succeeded' ? 'text-green-400' :
                        payment.status === 'refunded' ? 'text-purple-400' :
                        payment.status === 'failed' ? 'text-red-400' :
                        'text-white'
                      }`}>
                        {payment.status === 'refunded' ? '-' : ''}{formatCurrency(payment.amount)}
                      </p>
                    </div>
                    
                    {/* Stripe link */}
                    {payment.stripe_payment_intent_id && (
                      <a
                        href={`https://dashboard.stripe.com/payments/${payment.stripe_payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-flowtrade-cyan transition-colors"
                        title="View in Stripe"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
