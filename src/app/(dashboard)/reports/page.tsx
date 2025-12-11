'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Briefcase,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react'

type ReportPeriod = '7d' | '30d' | '90d' | '12m' | 'all'

type RevenueData = {
  totalRevenue: number
  previousRevenue: number
  invoiceCount: number
  averageInvoice: number
  monthlyBreakdown: { month: string; amount: number }[]
}

type JobMetrics = {
  totalJobs: number
  completedJobs: number
  completionRate: number
  averageJobValue: number
  statusBreakdown: { status: string; count: number }[]
}

type QuoteMetrics = {
  totalQuotes: number
  acceptedQuotes: number
  declinedQuotes: number
  conversionRate: number
  averageQuoteValue: number
  totalQuoteValue: number
  statusBreakdown: { status: string; count: number }[]
}

type CustomerMetrics = {
  totalCustomers: number
  activeCustomers: number
  topCustomers: { id: string; name: string; totalRevenue: number; jobCount: number }[]
  newCustomers: number
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [jobMetrics, setJobMetrics] = useState<JobMetrics | null>(null)
  const [quoteMetrics, setQuoteMetrics] = useState<QuoteMetrics | null>(null)
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null)

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

  useEffect(() => {
    async function fetchReportData() {
      if (!user) return

      setLoading(true)
      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData?.org_id) {
        setLoading(false)
        return
      }

      const orgId = userData.org_id
      const { start, end } = getDateRange(period)
      const startISO = start.toISOString()
      const endISO = end.toISOString()

      // Previous period for comparison
      const prevStart = new Date(start)
      const prevEnd = new Date(start)
      prevStart.setTime(prevStart.getTime() - (end.getTime() - start.getTime()))

      // Fetch all data in parallel
      const [invoicesResult, jobsResult, quotesResult, customersResult, prevInvoicesResult] = await Promise.all([
        // Current period invoices
        supabase
          .from('invoices')
          .select('id, status, total, created_at, customer_id')
          .eq('org_id', orgId)
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        
        // Current period jobs
        supabase
          .from('jobs')
          .select('id, status, total_amount, created_at, customer_id')
          .eq('org_id', orgId)
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        
        // Current period quotes
        supabase
          .from('quotes')
          .select('id, status, total, created_at, customer_id')
          .eq('org_id', orgId)
          .gte('created_at', startISO)
          .lte('created_at', endISO),
        
        // All customers with their invoices for top customers
        supabase
          .from('customers')
          .select('id, first_name, last_name, company_name, created_at')
          .eq('org_id', orgId),
        
        // Previous period invoices for comparison
        supabase
          .from('invoices')
          .select('id, status, total')
          .eq('org_id', orgId)
          .eq('status', 'paid')
          .gte('created_at', prevStart.toISOString())
          .lt('created_at', startISO)
      ])

      const invoices = invoicesResult.data || []
      const jobs = jobsResult.data || []
      const quotes = quotesResult.data || []
      const customers = customersResult.data || []
      const prevInvoices = prevInvoicesResult.data || []

      // Calculate Revenue Data
      const paidInvoices = invoices.filter(inv => inv.status === 'paid')
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const previousRevenue = prevInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const averageInvoice = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0

      // Monthly breakdown
      const monthlyMap = new Map<string, number>()
      paidInvoices.forEach(inv => {
        const date = new Date(inv.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (inv.total || 0))
      })
      const monthlyBreakdown = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))

      setRevenueData({
        totalRevenue,
        previousRevenue,
        invoiceCount: paidInvoices.length,
        averageInvoice,
        monthlyBreakdown
      })

      // Calculate Job Metrics
      const completedJobs = jobs.filter(j => ['completed', 'invoiced'].includes(j.status)).length
      const completionRate = jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0
      const jobsWithValue = jobs.filter(j => j.total_amount && j.total_amount > 0)
      const averageJobValue = jobsWithValue.length > 0
        ? jobsWithValue.reduce((sum, j) => sum + (j.total_amount || 0), 0) / jobsWithValue.length
        : 0

      const jobStatusMap = new Map<string, number>()
      jobs.forEach(j => {
        jobStatusMap.set(j.status, (jobStatusMap.get(j.status) || 0) + 1)
      })

      setJobMetrics({
        totalJobs: jobs.length,
        completedJobs,
        completionRate,
        averageJobValue,
        statusBreakdown: Array.from(jobStatusMap.entries()).map(([status, count]) => ({ status, count }))
      })

      // Calculate Quote Metrics
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length
      const declinedQuotes = quotes.filter(q => q.status === 'declined').length
      const conversionRate = quotes.length > 0 ? (acceptedQuotes / quotes.length) * 100 : 0
      const quotesWithValue = quotes.filter(q => q.total && q.total > 0)
      const totalQuoteValue = quotesWithValue.reduce((sum, q) => sum + (q.total || 0), 0)
      const averageQuoteValue = quotesWithValue.length > 0 ? totalQuoteValue / quotesWithValue.length : 0

      const quoteStatusMap = new Map<string, number>()
      quotes.forEach(q => {
        quoteStatusMap.set(q.status, (quoteStatusMap.get(q.status) || 0) + 1)
      })

      setQuoteMetrics({
        totalQuotes: quotes.length,
        acceptedQuotes,
        declinedQuotes,
        conversionRate,
        averageQuoteValue,
        totalQuoteValue,
        statusBreakdown: Array.from(quoteStatusMap.entries()).map(([status, count]) => ({ status, count }))
      })

      // Calculate Customer Metrics
      const newCustomers = customers.filter(c => {
        const created = new Date(c.created_at)
        return created >= start && created <= end
      }).length

      // Get customer revenue from paid invoices
      const customerRevenueMap = new Map<string, { revenue: number; jobs: number }>()
      paidInvoices.forEach(inv => {
        if (inv.customer_id) {
          const existing = customerRevenueMap.get(inv.customer_id) || { revenue: 0, jobs: 0 }
          existing.revenue += inv.total || 0
          customerRevenueMap.set(inv.customer_id, existing)
        }
      })
      jobs.forEach(job => {
        if (job.customer_id) {
          const existing = customerRevenueMap.get(job.customer_id) || { revenue: 0, jobs: 0 }
          existing.jobs += 1
          customerRevenueMap.set(job.customer_id, existing)
        }
      })

      const topCustomers = customers
        .map(c => {
          const data = customerRevenueMap.get(c.id) || { revenue: 0, jobs: 0 }
          const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed'
          return {
            id: c.id,
            name,
            totalRevenue: data.revenue,
            jobCount: data.jobs
          }
        })
        .filter(c => c.totalRevenue > 0 || c.jobCount > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)

      const activeCustomerIds = new Set([...paidInvoices.map(i => i.customer_id), ...jobs.map(j => j.customer_id)].filter(Boolean))

      setCustomerMetrics({
        totalCustomers: customers.length,
        activeCustomers: activeCustomerIds.size,
        topCustomers,
        newCustomers
      })

      setLoading(false)
    }

    fetchReportData()
  }, [user, period])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const formatPercent = (value: number) => `${Math.round(value)}%`

  const getRevenueChange = () => {
    if (!revenueData || revenueData.previousRevenue === 0) return null
    const change = ((revenueData.totalRevenue - revenueData.previousRevenue) / revenueData.previousRevenue) * 100
    return change
  }

  const revenueChange = getRevenueChange()

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-500',
      completed: 'bg-green-500',
      invoiced: 'bg-emerald-500',
      accepted: 'bg-green-500',
      sent: 'bg-blue-500',
      in_progress: 'bg-blue-500',
      scheduled: 'bg-purple-500',
      pending: 'bg-amber-500',
      draft: 'bg-gray-500',
      declined: 'bg-red-500',
      cancelled: 'bg-red-500',
      overdue: 'bg-red-500',
      expired: 'bg-orange-500',
      viewed: 'bg-purple-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  const formatStatus = (status: string) => status.replace(/_/g, ' ')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400">Business insights and performance metrics</p>
        </div>
        
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

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(revenueData?.totalRevenue || 0)}
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

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Paid Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{revenueData?.invoiceCount || 0}</div>
            <p className="text-xs text-gray-500">{periodLabel}</p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Invoice</CardTitle>
            <BarChart3 className="h-4 w-4 text-flowtrade-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(revenueData?.averageInvoice || 0)}
            </div>
            <p className="text-xs text-gray-500">Per paid invoice</p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-flowtrade-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatPercent(quoteMetrics?.conversionRate || 0)}
            </div>
            <p className="text-xs text-gray-500">Quotes to jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Metrics */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-400" />
              Job Performance
            </CardTitle>
            <CardDescription className="text-gray-400">{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Jobs</p>
                <p className="text-2xl font-bold text-white">{jobMetrics?.totalJobs || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-400">{jobMetrics?.completedJobs || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Completion Rate</p>
                <p className="text-2xl font-bold text-white">{formatPercent(jobMetrics?.completionRate || 0)}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Avg Job Value</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(jobMetrics?.averageJobValue || 0)}</p>
              </div>
            </div>

            {/* Job Status Breakdown */}
            {jobMetrics && jobMetrics.statusBreakdown.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Status Breakdown</p>
                <div className="space-y-2">
                  {jobMetrics.statusBreakdown.map(({ status, count }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                        <span className="text-sm text-gray-300 capitalize">{formatStatus(status)}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Metrics */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-flowtrade-cyan" />
              Quote Analytics
            </CardTitle>
            <CardDescription className="text-gray-400">{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Quotes</p>
                <p className="text-2xl font-bold text-white">{quoteMetrics?.totalQuotes || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Accepted</p>
                <p className="text-2xl font-bold text-green-400">{quoteMetrics?.acceptedQuotes || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Declined</p>
                <p className="text-2xl font-bold text-red-400">{quoteMetrics?.declinedQuotes || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Avg Quote Value</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(quoteMetrics?.averageQuoteValue || 0)}</p>
              </div>
            </div>

            {/* Quote Status Breakdown */}
            {quoteMetrics && quoteMetrics.statusBreakdown.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Status Breakdown</p>
                <div className="space-y-2">
                  {quoteMetrics.statusBreakdown.map(({ status, count }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                        <span className="text-sm text-gray-300 capitalize">{formatStatus(status)}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Quote Value */}
            <div className="pt-2 border-t border-flowtrade-navy-lighter">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Quote Value</span>
                <span className="text-lg font-bold text-white">{formatCurrency(quoteMetrics?.totalQuoteValue || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Customer Insights
            </CardTitle>
            <CardDescription className="text-gray-400">{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">{customerMetrics?.totalCustomers || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-400">{customerMetrics?.activeCustomers || 0}</p>
              </div>
              <div className="bg-flowtrade-navy rounded-lg p-4">
                <p className="text-sm text-gray-400">New</p>
                <p className="text-2xl font-bold text-flowtrade-cyan">{customerMetrics?.newCustomers || 0}</p>
              </div>
            </div>

            {/* Top Customers */}
            {customerMetrics && customerMetrics.topCustomers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Top Customers by Revenue</p>
                <div className="space-y-2">
                  {customerMetrics.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between bg-flowtrade-navy rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-flowtrade-cyan/20 flex items-center justify-center text-xs font-bold text-flowtrade-cyan">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.jobCount} jobs</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-400">{formatCurrency(customer.totalRevenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customerMetrics && customerMetrics.topCustomers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No customer revenue data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5 text-green-400" />
              Revenue Trend
            </CardTitle>
            <CardDescription className="text-gray-400">Monthly breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData && revenueData.monthlyBreakdown.length > 0 ? (
              <div className="space-y-3">
                {revenueData.monthlyBreakdown.map(({ month, amount }) => {
                  const maxAmount = Math.max(...revenueData.monthlyBreakdown.map(m => m.amount))
                  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0
                  const monthName = new Date(month + '-01').toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
                  
                  return (
                    <div key={month} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{monthName}</span>
                        <span className="text-white font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="w-full bg-flowtrade-navy rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No revenue data for this period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
