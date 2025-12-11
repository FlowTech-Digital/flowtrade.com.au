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
  AlertTriangle
} from 'lucide-react'

type DashboardStats = {
  totalQuotes: number
  pendingQuotes: number
  acceptedQuotes: number
  totalJobs: number
  activeJobs: number
  completedJobs: number
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
      case 'quote': return 'bg-flowtrade-cyan/10'
      case 'job': return 'bg-amber-400/10'
      case 'invoice': return 'bg-green-400/10'
      default: return 'bg-gray-400/10'
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
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome to FlowTrade</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-flowtrade-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalQuotes || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.pendingQuotes || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.activeJobs || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.completedJobs || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats?.outstandingAmount || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {stats?.totalInvoices || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats?.paidAmount || 0)}
            </div>
            <p className="text-xs text-gray-500">
              Paid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert Card - Only show if there are overdue invoices */}
      {stats && stats.overdueCount > 0 && (
        <Card 
          className="bg-red-950/30 border-red-900/50 cursor-pointer hover:bg-red-950/40 transition-colors"
          onClick={() => router.push('/invoices?status=overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-400">Overdue Invoices</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.overdueCount}</div>
                <p className="text-xs text-red-400/70">
                  {stats.overdueCount === 1 ? 'invoice overdue' : 'invoices overdue'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(stats.overdueAmount)}
                </div>
                <p className="text-xs text-red-400/70">total overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalCustomers || 0}</div>
            <p className="text-xs text-gray-500">Total customers</p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-flowtrade-cyan" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats?.totalQuotes ? `${conversionRate}%` : '--%'}
            </div>
            <p className="text-xs text-gray-500">Quotes to jobs</p>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.completedJobs || 0}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">Get things done fast</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push('/quotes/new')}
              className="w-full flex items-center justify-between p-3 bg-flowtrade-navy rounded-lg hover:bg-flowtrade-navy-lighter transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-flowtrade-cyan/10 rounded-lg">
                  <Plus className="h-4 w-4 text-flowtrade-cyan" />
                </div>
                <span className="text-white">Create Quote</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-flowtrade-cyan transition-colors" />
            </button>

            <button
              onClick={() => router.push('/jobs/new')}
              className="w-full flex items-center justify-between p-3 bg-flowtrade-navy rounded-lg hover:bg-flowtrade-navy-lighter transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400/10 rounded-lg">
                  <Briefcase className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-white">New Job</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-flowtrade-cyan transition-colors" />
            </button>

            <button
              onClick={() => router.push('/invoices/new')}
              className="w-full flex items-center justify-between p-3 bg-flowtrade-navy rounded-lg hover:bg-flowtrade-navy-lighter transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-400/10 rounded-lg">
                  <Receipt className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-white">Create Invoice</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-flowtrade-cyan transition-colors" />
            </button>

            <button
              onClick={() => router.push('/customers/new')}
              className="w-full flex items-center justify-between p-3 bg-flowtrade-navy rounded-lg hover:bg-flowtrade-navy-lighter transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-400/10 rounded-lg">
                  <Users className="h-4 w-4 text-purple-400" />
                </div>
                <span className="text-white">Add Customer</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-flowtrade-cyan transition-colors" />
            </button>
          </CardContent>
        </Card>

        <Card className="bg-flowtrade-navy-light border-flowtrade-navy-lighter">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-gray-400">Your latest quotes, jobs &amp; invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet. Create your first quote to get started.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <button
                    key={`${activity.type}-${activity.id}`}
                    onClick={() => router.push(getActivityRoute(activity.type, activity.id))}
                    className="w-full flex items-center justify-between p-3 bg-flowtrade-navy rounded-lg hover:bg-flowtrade-navy-lighter transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getActivityIconBg(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{activity.number}</p>
                        <p className="text-xs text-gray-500">{activity.customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">
                        {activity.amount ? formatCurrency(activity.amount) : '—'}
                      </p>
                      <p className={`text-xs capitalize ${getStatusColor(activity.type, activity.status)}`}>
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
