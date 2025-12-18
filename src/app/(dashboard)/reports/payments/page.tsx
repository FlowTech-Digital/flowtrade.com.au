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
  ExternalLink
} from 'lucide-react'

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

// TODO: Phase 7.2 Completion - Add these types and features
// type PaymentMethodBreakdown = { method: string; count: number; total: number }[]
// type CustomerLeaderboard = { id: string; name: string; totalPaid: number; paymentCount: number }[]
// type PaymentTrend = { date: string; amount: number; count: number }[]

export default function PaymentsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null)
  const [recentPayments, setRecentPayments] = useState<(Payment & { customer?: Customer; invoice?: Invoice })[]>([])
  
  // TODO: Phase 7.2 Completion - Add these state variables
  // const [methodBreakdown, setMethodBreakdown] = useState<PaymentMethodBreakdown>([])
  // const [customerLeaderboard, setCustomerLeaderboard] = useState<CustomerLeaderboard>([])
  // const [trends, setTrends] = useState<PaymentTrend[]>([])

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

    // TODO: Phase 7.2 Completion - Calculate these additional metrics
    // calculateMethodBreakdown(payments)
    // calculateCustomerLeaderboard(payments, customerMap)
    // calculateTrends(payments, start, end)

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

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter lg:col-span-2">
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

        {/* TODO: Phase 7.2 Completion - Payment Method Breakdown Card */}
        {/* 
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-400" />
              Payment Methods
            </CardTitle>
            <CardDescription className="text-gray-400">Breakdown by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            {methodBreakdown.map(method => (
              <div key={method.method}>...</div>
            ))}
          </CardContent>
        </Card>
        */}

        {/* TODO: Phase 7.2 Completion - Top Customers Card */}
        {/*
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Top Customers
            </CardTitle>
            <CardDescription className="text-gray-400">By payment volume</CardDescription>
          </CardHeader>
          <CardContent>
            {customerLeaderboard.map((customer, index) => (
              <div key={customer.id}>...</div>
            ))}
          </CardContent>
        </Card>
        */}
      </div>

      {/* TODO: Phase 7.2 Completion - Payment Trends Chart (integrate with 7.4 Recharts) */}
      {/*
      <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Payment Trends
          </CardTitle>
          <CardDescription className="text-gray-400">Daily payment volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              ...
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      */}
    </div>
  )
}
