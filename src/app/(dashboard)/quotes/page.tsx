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
  Copy,
  Pencil,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  TrendingUp
} from 'lucide-react'

type Quote = {
  id: string
  quote_number: string
  status: string
  total: number
  valid_until: string | null
  created_at: string
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-800', icon: Clock },
  sent: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Send },
  viewed: { label: 'Viewed', color: 'text-purple-400', bg: 'bg-purple-900/30', icon: Eye },
  accepted: { label: 'Accepted', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle },
  declined: { label: 'Declined', color: 'text-red-400', bg: 'bg-red-900/30', icon: XCircle },
  expired: { label: 'Expired', color: 'text-orange-400', bg: 'bg-orange-900/30', icon: AlertCircle },
}

export default function QuotesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchQuotes() {
      if (!user) return

      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

      // Get user's org_id first
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

      // Fetch quotes with customer info
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          status,
          total,
          valid_until,
          created_at,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name
          )
        `)
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false })

      if (quotesError) {
        console.error('Failed to fetch quotes:', quotesError)
      } else {
        setQuotes(quotesData || [])
      }

      setLoading(false)
    }

    fetchQuotes()
  }, [user])

  // Filter quotes based on search and status
  const filteredQuotes = quotes.filter(quote => {
    const customerName = quote.customer 
      ? `${quote.customer.first_name || ''} ${quote.customer.last_name || ''} ${quote.customer.company_name || ''}`
      : ''
    
    const matchesSearch = searchTerm === '' || 
      quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Calculate summary stats
  const pendingQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft').length
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length
  const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0)
  const conversionRate = quotes.length > 0 ? Math.round((acceptedQuotes / quotes.length) * 100) : 0

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get customer display name
  const getCustomerName = (customer: Quote['customer']) => {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft']
    if (!config) return null
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border border-current/20`}>
        <Icon className="h-3 w-3" />
        <span className="hidden sm:inline">{config.label}</span>
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6">
      {/* Header - MOBILE RESPONSIVE: Stack on mobile */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-flowtrade-navy-lighter">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Quotes</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Create and manage customer quotes</p>
        </div>
        <button
          onClick={() => router.push('/quotes/new')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-lg shadow-flowtrade-cyan/20 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          New Quote
        </button>
      </div>

      {/* Summary Stats - MOBILE RESPONSIVE: 2 columns on mobile */}
      <div className="w-full max-w-full">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Overview</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-flowtrade-cyan/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-flowtrade-cyan/5 hover:shadow-flowtrade-cyan/10 hover:border-flowtrade-cyan/40 hover:ring-2 hover:ring-flowtrade-cyan/20 transition-all duration-300 group min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-flowtrade-cyan/20 rounded-xl ring-2 ring-flowtrade-cyan/30 group-hover:ring-flowtrade-cyan/50 transition-all flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-flowtrade-cyan" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Total Quotes</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{quotes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-blue-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-blue-400/5 hover:shadow-blue-400/10 hover:border-blue-400/40 hover:ring-2 hover:ring-blue-400/20 transition-all duration-300 group min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-blue-400/20 rounded-xl ring-2 ring-blue-400/30 group-hover:ring-blue-400/50 transition-all flex-shrink-0">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{pendingQuotes}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-green-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-green-400/5 hover:shadow-green-400/10 hover:border-green-400/40 hover:ring-2 hover:ring-green-400/20 transition-all duration-300 group min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-green-400/20 rounded-xl ring-2 ring-green-400/30 group-hover:ring-green-400/50 transition-all flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Conversion</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{conversionRate}%</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-purple-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-purple-400/5 hover:shadow-purple-400/10 hover:border-purple-400/40 hover:ring-2 hover:ring-purple-400/20 transition-all duration-300 group min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-purple-400/20 rounded-xl ring-2 ring-purple-400/30 group-hover:ring-purple-400/50 transition-all flex-shrink-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-400 truncate">Total Value</p>
                <p className="text-lg sm:text-xl font-bold text-white truncate">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section - MOBILE RESPONSIVE */}
      <div className="w-full max-w-full">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Search & Filter</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-flowtrade-navy-lighter p-3 sm:p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 bg-flowtrade-navy border-2 border-flowtrade-navy-lighter rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-flowtrade-cyan transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto pl-9 sm:pl-10 pr-8 py-2.5 bg-flowtrade-navy border-2 border-flowtrade-navy-lighter rounded-lg text-white text-sm sm:text-base appearance-none focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-flowtrade-cyan cursor-pointer min-w-[140px] transition-all"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      <div className="w-full max-w-full">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">All Quotes</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        
        {filteredQuotes.length === 0 ? (
          // Empty State
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-dashed border-flowtrade-navy-lighter p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-flowtrade-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-2 ring-flowtrade-cyan/20">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-flowtrade-cyan" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">
              {quotes.length === 0 ? 'No quotes yet' : 'No matching quotes'}
            </h3>
            <p className="text-sm sm:text-base text-gray-400 mb-6 max-w-md mx-auto">
              {quotes.length === 0 
                ? 'Create your first quote to start sending professional estimates to your customers.'
                : 'Try adjusting your search or filter to find what you\'re looking for.'
              }
            </p>
            {quotes.length === 0 && (
              <button
                onClick={() => router.push('/quotes/new')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-lg shadow-flowtrade-cyan/20"
              >
                <Plus className="h-5 w-5" />
                Create First Quote
              </button>
            )}
          </div>
        ) : (
          // Quotes Table - MOBILE RESPONSIVE
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-flowtrade-navy-lighter overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-flowtrade-navy-dark/50 border-b-2 border-flowtrade-navy-lighter">
                    <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quote #</th>
                    <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="hidden md:table-cell text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valid Until</th>
                    <th className="hidden md:table-cell text-left px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="text-right px-3 py-3 sm:px-6 sm:py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-flowtrade-navy-lighter">
                  {filteredQuotes.map((quote) => (
                    <tr 
                      key={quote.id} 
                      className="border-l-4 border-l-flowtrade-cyan hover:bg-flowtrade-navy-hover hover:border-l-flowtrade-cyan/80 transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                    >
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm sm:text-base text-white font-semibold group-hover:text-flowtrade-cyan transition-colors">{quote.quote_number}</span>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm sm:text-base text-gray-300 block truncate max-w-[120px] sm:max-w-none">{getCustomerName(quote.customer)}</span>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <StatusBadge status={quote.status} />
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        <span className="text-sm sm:text-base text-white font-semibold whitespace-nowrap">{formatCurrency(quote.total)}</span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm text-gray-400">
                          {quote.valid_until ? formatDate(quote.valid_until) : '—'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-sm text-gray-400">{formatDate(quote.created_at)}</span>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4 text-right">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1 bg-flowtrade-navy/50 rounded-lg p-0.5 sm:p-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/quotes/${quote.id}`)}
                            className="p-2.5 sm:p-2 text-gray-400 hover:text-flowtrade-cyan hover:bg-flowtrade-cyan/10 rounded-md transition-all"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/quotes/${quote.id}/edit`)}
                            className="p-2.5 sm:p-2 text-gray-400 hover:text-flowtrade-cyan hover:bg-flowtrade-cyan/10 rounded-md transition-all"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* TODO: Duplicate */}}
                            className="hidden sm:block p-2.5 sm:p-2 text-gray-400 hover:text-flowtrade-cyan hover:bg-flowtrade-cyan/10 rounded-md transition-all"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
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
      </div>

      {/* Summary Footer */}
      {quotes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-gray-500 px-2">
          <span>
            Showing {filteredQuotes.length} of {quotes.length} quotes
          </span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-flowtrade-cyan hover:text-flowtrade-cyan/80 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}
