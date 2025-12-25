'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  DollarSign
} from 'lucide-react'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  subtotal: number
  gst_amount: number
  total: number
  issue_date: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  notes: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
  } | null
  job: {
    id: string
    job_number: string
    status: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-900/30', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Send },
  paid: { label: 'Paid', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-900/30', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-orange-400', bg: 'bg-orange-900/30', icon: XCircle },
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchInvoices() {
      if (!user) return

      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

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

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          status,
          subtotal,
          gst_amount,
          total,
          issue_date,
          due_date,
          paid_at,
          created_at,
          notes,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name
          ),
          job:jobs(
            id,
            job_number,
            status
          )
        `)
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false })

      if (invoicesError) {
        console.error('Failed to fetch invoices:', invoicesError)
      } else {
        setInvoices(invoicesData || [])
      }

      setLoading(false)
    }

    fetchInvoices()
  }, [user])

  const filteredInvoices = invoices.filter(invoice => {
    const customerName = invoice.customer 
      ? `${invoice.customer.first_name || ''} ${invoice.customer.last_name || ''} ${invoice.customer.company_name || ''}`
      : ''
    
    const matchesSearch = searchTerm === '' || 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.job?.job_number && invoice.job.job_number.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getCustomerName = (customer: Invoice['customer']) => {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Status badge component - mobile optimized
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft']
    if (!config) return null
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border border-current/20`}>
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="hidden sm:inline">{config.label}</span>
      </span>
    )
  }

  // Calculate summary stats
  const totalOutstanding = invoices
    .filter(inv => ['sent', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total || 0), 0)
  
  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0)

  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-flowtrade-navy-lighter">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage invoices and track payments</p>
        </div>
        <button
          onClick={() => router.push('/invoices/new')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-lg shadow-flowtrade-cyan/20 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Summary Cards - 2 columns on mobile, 4 on desktop */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Overview</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-green-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-green-400/5 hover:shadow-green-400/10 hover:border-green-400/40 hover:ring-2 hover:ring-green-400/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-green-400/20 rounded-xl ring-2 ring-green-400/30 group-hover:ring-green-400/50 transition-all">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{invoices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-blue-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-blue-400/5 hover:shadow-blue-400/10 hover:border-blue-400/40 hover:ring-2 hover:ring-blue-400/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-blue-400/20 rounded-xl ring-2 ring-blue-400/30 group-hover:ring-blue-400/50 transition-all">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Outstanding</p>
                <p className="text-base sm:text-xl font-bold text-white truncate">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-emerald-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-emerald-400/5 hover:shadow-emerald-400/10 hover:border-emerald-400/40 hover:ring-2 hover:ring-emerald-400/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-emerald-400/20 rounded-xl ring-2 ring-emerald-400/30 group-hover:ring-emerald-400/50 transition-all">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Paid</p>
                <p className="text-base sm:text-xl font-bold text-white truncate">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className={`bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 ${overdueCount > 0 ? 'border-red-400/30' : 'border-purple-400/20'} rounded-xl p-3 sm:p-4 shadow-lg transition-all duration-300 group`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-2.5 ${overdueCount > 0 ? 'bg-red-400/20 ring-red-400/30' : 'bg-purple-400/20 ring-purple-400/30'} rounded-xl ring-2 transition-all`}>
                <AlertCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${overdueCount > 0 ? 'text-red-400' : 'text-purple-400'}`} />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Overdue</p>
                <p className={`text-xl sm:text-2xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-white'}`}>{overdueCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Mobile Optimized */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Search & Filter</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-flowtrade-navy-lighter p-3 sm:p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 bg-flowtrade-navy border-2 border-flowtrade-navy-lighter rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto pl-9 sm:pl-10 pr-8 py-2.5 bg-flowtrade-navy border-2 border-flowtrade-navy-lighter rounded-lg text-sm sm:text-base text-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 cursor-pointer sm:min-w-[140px] transition-all"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List - Mobile Optimized Table */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">All Invoices</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        
        {filteredInvoices.length === 0 ? (
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-dashed border-flowtrade-navy-lighter p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-2 ring-green-400/20">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">
              {invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}
            </h3>
            <p className="text-sm sm:text-base text-gray-400 mb-6 max-w-md mx-auto">
              {invoices.length === 0 
                ? 'Create your first invoice manually or generate one from a completed job.'
                : 'Try adjusting your search or filter to find what you\'re looking for.'
              }
            </p>
            {invoices.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => router.push('/invoices/new')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-lg shadow-flowtrade-cyan/20 w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5" />
                  Create Invoice
                </button>
                <button
                  onClick={() => router.push('/jobs?status=completed')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-navy-lighter text-white font-medium rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors border-2 border-flowtrade-navy-border w-full sm:w-auto"
                >
                  <FileText className="h-5 w-5" />
                  View Completed Jobs
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-navy-lighter text-white font-medium rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors border-2 border-flowtrade-navy-border w-full sm:w-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-flowtrade-navy-lighter overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-flowtrade-navy-dark/50 border-b-2 border-flowtrade-navy-lighter">
                    <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice #</th>
                    <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="hidden md:table-cell text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Issue Date</th>
                    <th className="hidden md:table-cell text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="hidden lg:table-cell text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Job #</th>
                    <th className="text-right px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flowtrade-navy-lighter">
                  {filteredInvoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className="border-l-4 border-l-green-400 hover:bg-flowtrade-navy-hover hover:border-l-green-400/80 transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm sm:text-base text-white font-semibold group-hover:text-green-400 transition-colors">{invoice.invoice_number}</span>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm sm:text-base text-gray-300 truncate block max-w-[120px] sm:max-w-none">{getCustomerName(invoice.customer)}</span>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        <span className="text-sm sm:text-base text-white font-semibold">{formatCurrency(invoice.total)}</span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm text-gray-400">{formatDate(invoice.issue_date)}</span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm text-gray-400">{formatDate(invoice.due_date)}</span>
                      </td>
                      <td className="hidden lg:table-cell px-3 py-3 sm:px-6 sm:py-4">
                        {invoice.job ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/jobs/${invoice.job!.id}`)
                            }}
                            className="text-flowtrade-cyan hover:text-flowtrade-cyan/80 text-sm font-medium transition-colors"
                          >
                            {invoice.job.job_number}
                          </button>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        <div className="flex items-center justify-end gap-1 bg-flowtrade-navy/50 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                            className="p-2.5 sm:p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer with count and clear filter */}
            <div className="px-3 py-3 sm:px-6 sm:py-4 border-t border-flowtrade-navy-lighter flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-flowtrade-navy-dark/30">
              <span className="text-sm text-gray-500">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </span>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                  className="text-sm text-flowtrade-cyan hover:text-flowtrade-cyan/80 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
