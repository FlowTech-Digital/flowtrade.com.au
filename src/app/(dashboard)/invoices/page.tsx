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
  Send
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

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft']
    if (!config) return null
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-gray-400 mt-1">Manage invoices and track payments</p>
        </div>
        <button
          onClick={() => router.push('/invoices/new')}
          className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Outstanding</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Paid</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Invoices</p>
              <p className="text-xl font-bold text-white">{invoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent cursor-pointer"
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

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-12 text-center">
          <div className="w-16 h-16 bg-flowtrade-navy-lighter rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {invoices.length === 0 ? 'No invoices yet' : 'No matching invoices'}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {invoices.length === 0 
              ? 'Create your first invoice manually or generate one from a completed job.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'
            }
          </p>
          {invoices.length === 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push('/invoices/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Invoice
              </button>
              <button
                onClick={() => router.push('/jobs?status=completed')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-white font-medium rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors"
              >
                <FileText className="h-5 w-5" />
                View Completed Jobs
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-flowtrade-navy-lighter">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Invoice #</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Total</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Issue Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Due Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Job #</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className="border-b border-flowtrade-navy-lighter hover:bg-flowtrade-navy-lighter/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{getCustomerName(invoice.customer)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">{formatCurrency(invoice.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400">{formatDate(invoice.issue_date)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400">{formatDate(invoice.due_date)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {invoice.job ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/jobs/${invoice.job!.id}`)
                          }}
                          className="text-flowtrade-cyan hover:text-flowtrade-cyan/80 text-sm"
                        >
                          {invoice.job.job_number}
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
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
        </div>
      )}

      {invoices.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
      )}
    </div>
  )
}
