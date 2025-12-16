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
  AlertCircle
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
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border border-current/20`}>
        <Icon className="h-3 w-3" />
        {config.label}
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-flowtrade-navy-lighter">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="text-gray-400 mt-1">Create and manage customer quotes</p>
        </div>
        <button
          onClick={() => router.push('/quotes/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-card"
        >
          <Plus className="h-5 w-5" />
          New Quote
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent cursor-pointer min-w-[140px]"
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

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        // Empty State
        <div className="bg-flowtrade-navy-light rounded-xl border-2 border-dashed border-flowtrade-navy-lighter p-12 text-center">
          <div className="w-16 h-16 bg-flowtrade-navy-lighter rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {quotes.length === 0 ? 'No quotes yet' : 'No matching quotes'}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {quotes.length === 0 
              ? 'Create your first quote to start sending professional estimates to your customers.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'
            }
          </p>
          {quotes.length === 0 && (
            <button
              onClick={() => router.push('/quotes/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create First Quote
            </button>
          )}
        </div>
      ) : (
        // Quotes Table
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-flowtrade-navy-dark/50 border-b-2 border-flowtrade-navy-lighter">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quote #</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valid Until</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flowtrade-navy-lighter">
                {filteredQuotes.map((quote, index) => (
                  <tr 
                    key={quote.id} 
                    className={`
                      hover:bg-flowtrade-navy-hover transition-colors cursor-pointer
                      ${index % 2 === 0 ? 'bg-flowtrade-navy-light' : 'bg-flowtrade-navy-dark/30'}
                    `}
                    onClick={() => router.push(`/quotes/${quote.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-semibold">{quote.quote_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{getCustomerName(quote.customer)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-semibold">{formatCurrency(quote.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400">
                        {quote.valid_until ? formatDate(quote.valid_until) : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400">{formatDate(quote.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 bg-flowtrade-navy/50 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/quotes/${quote.id}`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-md transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/quotes/${quote.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* TODO: Duplicate */}}
                          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-md transition-colors"
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

      {/* Summary Footer */}
      {quotes.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 px-2">
          <span>
            Showing {filteredQuotes.length} of {quotes.length} quotes
          </span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-flowtrade-cyan hover:text-flowtrade-cyan-light transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}
