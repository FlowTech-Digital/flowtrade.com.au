'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  Briefcase, 
  Users, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  Loader2,
  Receipt,
  AlertTriangle,
  Calendar
} from 'lucide-react'

type DashboardStats = {
  totalQuotes: number
  pendingQuotes: number
  acceptedQuotes: number
  totalJobs: number
  activeJobs: number
  completedJobs: number
  scheduledJobs: number
  totalInvoices: number
  outstandingAmount: number
  paidAmount: number
  totalCustomers: number
  overdueCount: number
  overdueAmount: number
}

type RecentActivity = {
  id: string
  type: 'invoice' | 'job' | 'quote'
  number: string
  status: string
  amount: number | null
  customerName: string
  date: string
}

// Types for Supabase query results
type QuoteRow = { 
  id: string
  status: string
  quote_number: string
  total: number | null
  created_at: string
  customer: { first_name: string | null; last_name: string | null; company_name: string | null } | null
}
type JobRow = { 
  id: string
  status: string
  job_number: string
  total_amount: number | null
  created_at: string
  customer: { first_name: string | null; last_name: string | null; company_name: string | null } | null
}
type InvoiceRow = { 
  id: string
  status: string
  total: number | null
  invoice_number: string
  created_at: string
  customer: { first_name: string | null; last_name: string | null; company_name: string | null } | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

      // Get user's org_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (userError || !userData?.org_id) {
        console.error('Failed to get user org:', userError)
        setLoading(false)
        return
      }

      const orgId = userData.org_id

      // Fetch all stats in parallel
      const [quotesResult, jobsResult, invoicesResult, customersResult] = await Promise.all([
        // Quotes stats (with details for activity feed)
        supabase
          .from('quotes')
          .select('id, status, quote_number, total, created_at, customer:customers(first_name, last_name, company_name)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false }),
        
        // Jobs stats (with details for activity feed)
        supabase
          .from('jobs')
          .select('id, status, job_number, total_amount, created_at, customer:customers(first_name, last_name, company_name)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false }),
        
        // Invoices stats (with amounts)
        supabase
          .from('invoices')
          .select('id, status, total, invoice_number, created_at, customer:customers(first_name, last_name, company_name)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false }),
        
        // Customers count
        supabase
          .from('customers')
          .select('id')
          .eq('org_id', orgId)
      ])

      // Process quotes
      const quotes = (quotesResult.data || []) as QuoteRow[]
      const pendingQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'draft').length
      const acceptedQuotes = quotes.filter((q) => q.status === 'accepted').length

      // Process jobs
      const jobs = (jobsResult.data || []) as JobRow[]
      const activeJobs = jobs.filter((j) => ['scheduled', 'in_progress'].includes(j.status)).length
      const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'invoiced').length
      const scheduledJobs = jobs.filter((j) => j.status === 'scheduled').length

      // Process invoices
      const invoices = (invoicesResult.data || []) as InvoiceRow[]
      const outstandingAmount = invoices
        .filter((inv) => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + (inv.total || 0), 0)
      const paidAmount = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0)
      
      // Process overdue invoices
      const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue')
      const overdueCount = overdueInvoices.length
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      // Helper function to get customer name
      const getCustomerName = (customer: { first_name: string | null; last_name: string | null; company_name: string | null } | null): string => {
        if (!customer) return 'No Customer'
        if (customer.company_name) return customer.company_name
        return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
      }

      // Build unified recent activity from all entity types
      const quoteActivities: RecentActivity[] = quotes.slice(0, 10).map((q) => ({
        id: q.id,
        type: 'quote' as const,
        number: q.quote_number,
        status: q.status,
        amount: q.total,
        customerName: getCustomerName(q.customer),
        date: q.created_at
      }))

      const jobActivities: RecentActivity[] = jobs.slice(0, 10).map((j) => ({
        id: j.id,
        type: 'job' as const,
        number: j.job_number,
        status: j.status,
        amount: j.total_amount,
        customerName: getCustomerName(j.customer),
        date: j.created_at
      }))

      const invoiceActivities: RecentActivity[] = invoices.slice(0, 10).map((inv) => ({
        id: inv.id,
        type: 'invoice' as const,
        number: inv.invoice_number,
        status: inv.status,
        amount: inv.total,
        customerName: getCustomerName(inv.customer),
        date: inv.created_at
      }))

      // Combine and sort by date (most recent first), take top 8
      const allActivities = [...quoteActivities, ...jobActivities, ...invoiceActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8)

      setStats({
        totalQuotes: quotes.length,
        pendingQuotes,
        acceptedQuotes,
        totalJobs: jobs.length,
        activeJobs,
        completedJobs,
        scheduledJobs,
        totalInvoices: invoices.length,
        outstandingAmount,
        paidAmount,
        totalCustomers: customersResult.data?.length || 0,
        overdueCount,
        overdueAmount
      })

      setRecentActivity(allActivities)
      setLoading(false)
    }

    fetchDashboardData()
  }, [user])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const getStatusColor = (type: string, status: string) => {
    // Quote statuses
    if (type === 'quote') {
      switch (status) {
        case 'accepted': return 'text-green-400'
        case 'sent': return 'text-blue-400'
        case 'viewed': return 'text-purple-400'
        case 'draft': return 'text-gray-400'
        case 'declined': return 'text-red-400'
        case 'expired': return 'text-orange-400'
        default: return 'text-gray-400'
      }
    }
    // Job statuses
    if (type === 'job') {
      switch (status) {
        case 'completed': return 'text-green-400'
        case 'invoiced': return 'text-emerald-400'
        case 'in_progress': return 'text-blue-400'
        case 'scheduled': return 'text-purple-400'
        case 'pending': return 'text-amber-400'
        case 'cancelled': return 'text-red-400'
        default: return 'text-gray-400'
      }
    }
    // Invoice statuses
    switch (status) {
      case 'paid': return 'text-green-400'
      case 'sent': return 'text-blue-400'
      case 'viewed': return 'text-purple-400'
      case 'draft': return 'text-gray-400'
      case 'overdue': return 'text-red-400'
      case 'cancelled': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote': return <FileText className="h-4 w-4 text-flowtrade-cyan" />
      case 'job': return <Briefcase className="h-4 w-4 text-amber-400" />
      case 'invoice': return <Receipt className="h-4 w-4 text-green-400" />
      default: return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getActivityIconBg = (type: string) => {
    switch (type) {
      case 'quote': return 'bg-flowtrade-cyan/20 ring-1 ring-flowtrade-cyan/30'
      case 'job': return 'bg-amber-400/20 ring-1 ring-amber-400/30'
      case 'invoice': return 'bg-green-400/20 ring-1 ring-green-400/30'
      default: return 'bg-gray-400/20 ring-1 ring-gray-400/30'
    }
  }

  const getActivityBorder = (type: string) => {
    switch (type) {
      case 'quote': return 'border-l-flowtrade-cyan'
      case 'job': return 'border-l-amber-400'
      case 'invoice': return 'border-l-green-400'
      default: return 'border-l-gray-400'
    }
  }

  const getActivityRoute = (type: string, id: string) => {
    switch (type) {
      case 'quote': return `/quotes/${id}`
      case 'job': return `/jobs/${id}`
      case 'invoice': return `/invoices/${id}`
      default: return '/'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  const conversionRate = stats && stats.totalQuotes > 0 
    ? Math.round((stats.acceptedQuotes / stats.totalQuotes) * 100) 
    : 0

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="pb-4 border-b border-flowtrade-navy-lighter">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to FlowTrade</p>
      </div>

      {/* Main Stats Grid - Primary KPIs */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-3 py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Key Metrics</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Quotes Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-flowtrade-cyan/20 shadow-lg shadow-flowtrade-cyan/5 hover:shadow-flowtrade-cyan/10 hover:border-flowtrade-cyan/40 hover:ring-2 hover:ring-flowtrade-cyan/20 transition-all duration-300 cursor-pointer group" onClick={() => router.push('/quotes')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Total Quotes</CardTitle>
              <div className="p-2.5 bg-flowtrade-cyan/20 rounded-xl ring-2 ring-flowtrade-cyan/30 group-hover:ring-flowtrade-cyan/50 transition-all">
                <FileText className="h-5 w-5 text-flowtrade-cyan" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.totalQuotes || 0}</div>
              <p className="text-sm text-flowtrade-cyan/80 mt-1 font-medium">
                {stats?.pendingQuotes || 0} pending
              </p>
            </CardContent>
          </Card>

          {/* Active Jobs Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-amber-400/20 shadow-lg shadow-amber-400/5 hover:shadow-amber-400/10 hover:border-amber-400/40 hover:ring-2 hover:ring-amber-400/20 transition-all duration-300 cursor-pointer group" onClick={() => router.push('/jobs')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Active Jobs</CardTitle>
              <div className="p-2.5 bg-amber-400/20 rounded-xl ring-2 ring-amber-400/30 group-hover:ring-amber-400/50 transition-all">
                <Briefcase className="h-5 w-5 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.activeJobs || 0}</div>
              <p className="text-sm text-amber-400/80 mt-1 font-medium">
                {stats?.completedJobs || 0} completed
              </p>
            </CardContent>
          </Card>

          {/* Outstanding Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-blue-400/20 shadow-lg shadow-blue-400/5 hover:shadow-blue-400/10 hover:border-blue-400/40 hover:ring-2 hover:ring-blue-400/20 transition-all duration-300 cursor-pointer group" onClick={() => router.push('/invoices?status=sent')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Outstanding</CardTitle>
              <div className="p-2.5 bg-blue-400/20 rounded-xl ring-2 ring-blue-400/30 group-hover:ring-blue-400/50 transition-all">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(stats?.outstandingAmount || 0)}
              </div>
              <p className="text-sm text-blue-400/80 mt-1 font-medium">
                {stats?.totalInvoices || 0} invoices
              </p>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-green-400/20 shadow-lg shadow-green-400/5 hover:shadow-green-400/10 hover:border-green-400/40 hover:ring-2 hover:ring-green-400/20 transition-all duration-300 cursor-pointer group" onClick={() => router.push('/invoices?status=paid')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Revenue</CardTitle>
              <div className="p-2.5 bg-green-400/20 rounded-xl ring-2 ring-green-400/30 group-hover:ring-green-400/50 transition-all">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {formatCurrency(stats?.paidAmount || 0)}
              </div>
              <p className="text-sm text-green-400/80 mt-1 font-medium">
                Paid invoices
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Overdue Alert Card - Only show if there are overdue invoices */}
      {stats && stats.overdueCount > 0 && (
        <Card 
          className="bg-gradient-to-br from-red-950/60 to-red-950/40 border-2 border-red-500/50 cursor-pointer hover:bg-red-950/70 hover:border-red-400/60 hover:ring-2 hover:ring-red-500/30 transition-all duration-300 shadow-lg shadow-red-500/10"
          onClick={() => router.push('/invoices?status=overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-red-300 flex items-center gap-2">
              <span className="animate-pulse">⚠️</span> Overdue Invoices
            </CardTitle>
            <div className="p-2.5 bg-red-500/30 rounded-xl ring-2 ring-red-500/40">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-400">{stats.overdueCount}</div>
                <p className="text-sm text-red-300/80 font-medium">
                  {stats.overdueCount === 1 ? 'invoice overdue' : 'invoices overdue'}
                </p>
              </div>
              <div className="h-14 w-px bg-red-500/30 mx-6" />
              <div className="text-right">
                <div className="text-3xl font-bold text-red-400">
                  {formatCurrency(stats.overdueAmount)}
                </div>
                <p className="text-sm text-red-300/80 font-medium">total overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary Stats - Performance Metrics */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-3 py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Performance</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Customers Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-purple-400/20 shadow-lg shadow-purple-400/5 hover:shadow-purple-400/10 hover:border-purple-400/40 hover:ring-2 hover:ring-purple-400/20 transition-all duration-300 cursor-pointer group" onClick={() => router.push('/customers')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Customers</CardTitle>
              <div className="p-2.5 bg-purple-400/20 rounded-xl ring-2 ring-purple-400/30 group-hover:ring-purple-400/50 transition-all">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.totalCustomers || 0}</div>
              <p className="text-sm text-purple-400/80 mt-1 font-medium">Total customers</p>
            </CardContent>
          </Card>

          {/* Conversion Rate Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-flowtrade-cyan/20 shadow-lg shadow-flowtrade-cyan/5 hover:shadow-flowtrade-cyan/10 hover:border-flowtrade-cyan/40 hover:ring-2 hover:ring-flowtrade-cyan/20 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Conversion Rate</CardTitle>
              <div className="p-2.5 bg-flowtrade-cyan/20 rounded-xl ring-2 ring-flowtrade-cyan/30 group-hover:ring-flowtrade-cyan/50 transition-all">
                <TrendingUp className="h-5 w-5 text-flowtrade-cyan" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats?.totalQuotes ? `${conversionRate}%` : '--%'}
              </div>
              <p className="text-sm text-flowtrade-cyan/80 mt-1 font-medium">Quotes to jobs</p>
            </CardContent>
          </Card>

          {/* Completed Jobs Card */}
          <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-green-400/20 shadow-lg shadow-green-400/5 hover:shadow-green-400/10 hover:border-green-400/40 hover:ring-2 hover:ring-green-400/20 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Completed Jobs</CardTitle>
              <div className="p-2.5 bg-green-400/20 rounded-xl ring-2 ring-green-400/30 group-hover:ring-green-400/50 transition-all">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.completedJobs || 0}</div>
              <p className="text-sm text-green-400/80 mt-1 font-medium">All time</p>
            </CardContent>
          </Card>

          {/* Scheduled Jobs Card */}
          <Card 
            className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-blue-400/20 shadow-lg shadow-blue-400/5 cursor-pointer hover:shadow-blue-400/10 hover:border-blue-400/40 hover:ring-2 hover:ring-blue-400/20 transition-all duration-300 group"
            onClick={() => router.push('/jobs?status=scheduled')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Scheduled Jobs</CardTitle>
              <div className="p-2.5 bg-blue-400/20 rounded-xl ring-2 ring-blue-400/30 group-hover:ring-blue-400/50 transition-all">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.scheduledJobs || 0}</div>
              <p className="text-sm text-blue-400/80 mt-1 font-medium">Upcoming work</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions Card */}
        <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-flowtrade-navy-lighter shadow-xl">
          <CardHeader className="pb-4 border-b border-flowtrade-navy-lighter/50">
            <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">Get things done fast</CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <button
              onClick={() => router.push('/quotes/new')}
              className="w-full flex items-center justify-between p-4 bg-flowtrade-navy rounded-xl border-2 border-l-4 border-flowtrade-navy-lighter border-l-flowtrade-cyan hover:bg-flowtrade-navy-hover hover:border-flowtrade-cyan/50 hover:shadow-lg hover:shadow-flowtrade-cyan/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-flowtrade-cyan/20 rounded-xl ring-2 ring-flowtrade-cyan/30 group-hover:ring-flowtrade-cyan/50">
                  <Plus className="h-5 w-5 text-flowtrade-cyan" />
                </div>
                <span className="text-white font-semibold group-hover:text-flowtrade-cyan transition-colors">Create Quote</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-flowtrade-cyan group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => router.push('/jobs/new')}
              className="w-full flex items-center justify-between p-4 bg-flowtrade-navy rounded-xl border-2 border-l-4 border-flowtrade-navy-lighter border-l-amber-400 hover:bg-flowtrade-navy-hover hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-400/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-amber-400/20 rounded-xl ring-2 ring-amber-400/30 group-hover:ring-amber-400/50">
                  <Briefcase className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-white font-semibold group-hover:text-amber-400 transition-colors">New Job</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => router.push('/invoices/new')}
              className="w-full flex items-center justify-between p-4 bg-flowtrade-navy rounded-xl border-2 border-l-4 border-flowtrade-navy-lighter border-l-green-400 hover:bg-flowtrade-navy-hover hover:border-green-400/50 hover:shadow-lg hover:shadow-green-400/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-400/20 rounded-xl ring-2 ring-green-400/30 group-hover:ring-green-400/50">
                  <Receipt className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-white font-semibold group-hover:text-green-400 transition-colors">Create Invoice</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => router.push('/customers/new')}
              className="w-full flex items-center justify-between p-4 bg-flowtrade-navy rounded-xl border-2 border-l-4 border-flowtrade-navy-lighter border-l-purple-400 hover:bg-flowtrade-navy-hover hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-400/10 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-purple-400/20 rounded-xl ring-2 ring-purple-400/30 group-hover:ring-purple-400/50">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-white font-semibold group-hover:text-purple-400 transition-colors">Add Customer</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </button>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-flowtrade-navy-lighter shadow-xl">
          <CardHeader className="pb-4 border-b border-flowtrade-navy-lighter/50">
            <CardTitle className="text-white text-lg">Recent Activity</CardTitle>
            <CardDescription className="text-gray-400">Your latest quotes, jobs &amp; invoices</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10 px-4 bg-flowtrade-navy/50 rounded-xl border-2 border-dashed border-flowtrade-navy-lighter">
                <p className="text-sm text-gray-400">No activity yet. Create your first quote to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <button
                    key={`${activity.type}-${activity.id}`}
                    onClick={() => router.push(getActivityRoute(activity.type, activity.id))}
                    className={`w-full flex items-center justify-between p-3.5 bg-flowtrade-navy rounded-xl border-2 border-l-4 border-flowtrade-navy-lighter ${getActivityBorder(activity.type)} hover:bg-flowtrade-navy-hover hover:border-flowtrade-navy-border hover:shadow-md transition-all duration-200 text-left group`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getActivityIconBg(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="text-sm text-white font-semibold group-hover:text-flowtrade-cyan transition-colors">{activity.number}</p>
                        <p className="text-xs text-gray-400">{activity.customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white font-semibold">
                        {activity.amount ? formatCurrency(activity.amount) : '—'}
                      </p>
                      <p className={`text-xs capitalize font-medium ${getStatusColor(activity.type, activity.status)}`}>
                        {formatStatus(activity.status)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
