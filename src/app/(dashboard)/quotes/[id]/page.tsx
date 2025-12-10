'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Send,
  Copy,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  MapPin,
  User,
  Building,
  Phone,
  Mail,
  Loader2,
  MoreVertical,
  RefreshCw,
  Briefcase
} from 'lucide-react'

// Types
type Quote = {
  id: string
  quote_number: string
  version: number
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
  customer_id: string
  job_site_address: string
  job_description: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_required: boolean
  deposit_amount: number | null
  deposit_percentage: number | null
  valid_until: string
  terms_and_conditions: string | null
  internal_notes: string | null
  customer_notes: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
  accepted_at: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    email: string | null
    phone: string | null
    street_address: string | null
    suburb: string | null
    state: string | null
    postcode: string | null
  }
}

type LineItem = {
  id: string
  position: number
  item_type: 'labor' | 'materials' | 'equipment' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  cost_price: number
  total: number
  is_optional: boolean
}

type QuoteEvent = {
  id: string
  event_type: string
  event_data: Record<string, unknown> | null
  created_at: string
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: Clock, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  sent: { label: 'Sent', icon: Send, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  viewed: { label: 'Viewed', icon: Eye, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  declined: { label: 'Declined', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export default function QuoteDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [events, setEvents] = useState<QuoteEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  // Fetch quote data
  useEffect(() => {
    async function fetchQuote() {
      if (!user || !quoteId) return

      const supabase = createClient()
      if (!supabase) {
        setError('Failed to connect to database')
        setLoading(false)
        return
      }

      // Fetch quote with customer
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(
            id, first_name, last_name, company_name,
            email, phone, street_address, suburb, state, postcode
          )
        `)
        .eq('id', quoteId)
        .single()

      if (quoteError || !quoteData) {
        setError(quoteError?.message || 'Quote not found')
        setLoading(false)
        return
      }

      setQuote(quoteData)

      // Fetch line items
      const { data: itemsData } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('position', { ascending: true })

      setLineItems(itemsData || [])

      // Fetch events
      const { data: eventsData } = await supabase
        .from('quote_events')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(10)

      setEvents(eventsData || [])
      setLoading(false)
    }

    fetchQuote()
  }, [user, quoteId])

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

  // Format datetime
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get customer display name
  const getCustomerName = () => {
    if (!quote?.customer) return 'Unknown Customer'
    if (quote.customer.company_name) return quote.customer.company_name
    return `${quote.customer.first_name || ''} ${quote.customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Update quote status
  const updateStatus = async (newStatus: Quote['status']) => {
    if (!quote) return
    setActionLoading(newStatus)

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setActionLoading(null)
      return
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'sent' && !quote.sent_at) {
      updateData.sent_at = new Date().toISOString()
    }
    if (newStatus === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quote.id)

    if (updateError) {
      setError(updateError.message)
      setActionLoading(null)
      return
    }

    // Log event
    await supabase.from('quote_events').insert({
      quote_id: quote.id,
      event_type: `status_changed_to_${newStatus}`,
      event_data: { previous_status: quote.status }
    })

    // Refresh quote data
    setQuote({ ...quote, status: newStatus, ...updateData })
    setActionLoading(null)
    setShowActionsMenu(false)
  }

  // Duplicate quote
  const duplicateQuote = async () => {
    if (!quote) return
    setActionLoading('duplicate')

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setActionLoading(null)
      return
    }

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user?.id)
      .single()

    if (!userData) {
      setError('Failed to get user information')
      setActionLoading(null)
      return
    }

    // Generate new quote number
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    const newQuoteNumber = `QTE-${year}${month}-${random}`

    // Create new quote
    const { data: newQuote, error: createError } = await supabase
      .from('quotes')
      .insert({
        org_id: userData.org_id,
        quote_number: newQuoteNumber,
        version: 1,
        status: 'draft',
        customer_id: quote.customer_id,
        job_site_address: quote.job_site_address,
        job_description: quote.job_description,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        deposit_required: quote.deposit_required,
        deposit_amount: quote.deposit_amount,
        deposit_percentage: quote.deposit_percentage,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        terms_and_conditions: quote.terms_and_conditions,
        internal_notes: quote.internal_notes,
        customer_notes: quote.customer_notes,
        created_by: userData.id,
      })
      .select()
      .single()

    if (createError || !newQuote) {
      setError(createError?.message || 'Failed to duplicate quote')
      setActionLoading(null)
      return
    }

    // Copy line items
    if (lineItems.length > 0) {
      const newLineItems = lineItems.map((item, index) => ({
        quote_id: newQuote.id,
        position: index + 1,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        total: item.total,
        is_optional: item.is_optional,
        tax_inclusive: false,
      }))

      await supabase.from('quote_line_items').insert(newLineItems)
    }

    setActionLoading(null)
    router.push(`/quotes/${newQuote.id}`)
  }

  // Delete quote
  const deleteQuote = async () => {
    if (!quote) return
    setActionLoading('delete')

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setActionLoading(null)
      return
    }

    // Delete line items first
    await supabase.from('quote_line_items').delete().eq('quote_id', quote.id)
    
    // Delete events
    await supabase.from('quote_events').delete().eq('quote_id', quote.id)

    // Delete quote
    const { error: deleteError } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quote.id)

    if (deleteError) {
      setError(deleteError.message)
      setActionLoading(null)
      return
    }

    router.push('/quotes')
  }

  // Check if quote is expired
  const isExpired = quote && new Date(quote.valid_until) < new Date() && quote.status !== 'accepted'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-flowtrade-cyan animate-spin" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error || 'Quote not found'}</p>
        <button
          onClick={() => router.push('/quotes')}
          className="text-flowtrade-cyan hover:underline"
        >
          Back to Quotes
        </button>
      </div>
    )
  }

  const StatusIcon = STATUS_CONFIG[quote.status]?.icon || Clock
  const statusConfig = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/quotes')}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{quote.quote_number}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </span>
              {isExpired && quote.status !== 'expired' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-orange-500/20 text-orange-400 border-orange-500/30">
                  <AlertCircle className="h-4 w-4" />
                  Expired
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1">
              Created {formatDateTime(quote.created_at)}
              {quote.version > 1 && ` • Version ${quote.version}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {quote.status === 'draft' && (
            <button
              onClick={() => router.push(`/quotes/${quote.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-white rounded-lg hover:bg-flowtrade-navy transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}

          {(quote.status === 'draft' || quote.status === 'sent') && (
            <button
              onClick={() => updateStatus('sent')}
              disabled={actionLoading === 'sent'}
              className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'sent' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {quote.status === 'draft' ? 'Send Quote' : 'Resend'}
            </button>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg shadow-lg z-20 py-1">
                  {quote.status === 'sent' && (
                    <>
                      <button
                        onClick={() => updateStatus('accepted')}
                        disabled={!!actionLoading}
                        className="w-full px-4 py-2 text-left text-green-400 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark as Accepted
                      </button>
                      <button
                        onClick={() => updateStatus('declined')}
                        disabled={!!actionLoading}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Mark as Declined
                      </button>
                    </>
                  )}
                  <button
                    onClick={duplicateQuote}
                    disabled={!!actionLoading}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                  >
                    {actionLoading === 'duplicate' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Duplicate Quote
                  </button>
                  {quote.status === 'accepted' && (
                    <button
                      onClick={() => {/* TODO: Convert to job */}}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      Convert to Job
                    </button>
                  )}
                  <button
                    onClick={() => {/* TODO: Generate PDF */}}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                  {quote.version > 1 && (
                    <button
                      onClick={() => {/* TODO: Create revision */}}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Create Revision
                    </button>
                  )}
                  <div className="border-t border-flowtrade-navy-lighter my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowDeleteModal(true)
                    }}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Quote
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Job Details */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Customer</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {quote.customer.company_name ? (
                      <Building className="h-5 w-5 text-flowtrade-cyan" />
                    ) : (
                      <User className="h-5 w-5 text-flowtrade-cyan" />
                    )}
                    <span className="text-white font-medium">{getCustomerName()}</span>
                  </div>
                  {quote.customer.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${quote.customer.email}`} className="hover:text-white">
                        {quote.customer.email}
                      </a>
                    </div>
                  )}
                  {quote.customer.phone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${quote.customer.phone}`} className="hover:text-white">
                        {quote.customer.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Site */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Job Site</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-flowtrade-cyan mt-0.5" />
                  <span className="text-white">{quote.job_site_address}</span>
                </div>
              </div>
            </div>

            {/* Job Description */}
            {quote.job_description && (
              <div className="mt-6 pt-6 border-t border-flowtrade-navy-lighter">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Job Description</h3>
                <p className="text-white whitespace-pre-wrap">{quote.job_description}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter overflow-hidden">
            <div className="px-6 py-4 border-b border-flowtrade-navy-lighter">
              <h3 className="text-lg font-medium text-white">Line Items</h3>
            </div>
            
            {lineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-flowtrade-navy-lighter">
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">Description</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400">Qty</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400">Unit</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Price</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-flowtrade-navy-lighter ${item.is_optional ? 'opacity-60' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-flowtrade-navy rounded text-gray-400 capitalize">
                              {item.item_type}
                            </span>
                            <span className="text-white">{item.description}</span>
                            {item.is_optional && (
                              <span className="text-xs text-gray-500">(Optional)</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center px-4 py-4 text-gray-300">{item.quantity}</td>
                        <td className="text-center px-4 py-4 text-gray-300">{item.unit}</td>
                        <td className="text-right px-4 py-4 text-gray-300">{formatCurrency(item.unit_price)}</td>
                        <td className="text-right px-6 py-4 text-white font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-gray-400">
                No line items
              </div>
            )}
          </div>

          {/* Notes */}
          {(quote.customer_notes || quote.internal_notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quote.customer_notes && (
                <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Notes for Customer</h3>
                  <p className="text-white whitespace-pre-wrap">{quote.customer_notes}</p>
                </div>
              )}
              {quote.internal_notes && (
                <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Internal Notes</h3>
                  <p className="text-white whitespace-pre-wrap">{quote.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Terms & Conditions */}
          {quote.terms_and_conditions && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Terms & Conditions</h3>
              <p className="text-gray-300 whitespace-pre-wrap text-sm">{quote.terms_and_conditions}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Summary */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-cyan/30 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Quote Total</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>GST ({quote.tax_rate}%)</span>
                <span>{formatCurrency(quote.tax_amount)}</span>
              </div>
              <div className="border-t border-flowtrade-navy-lighter pt-3 flex justify-between text-white font-semibold text-xl">
                <span>Total</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
              {quote.deposit_required && (
                <div className="flex justify-between text-flowtrade-cyan pt-2">
                  <span>Deposit Required</span>
                  <span>
                    {quote.deposit_percentage
                      ? `${quote.deposit_percentage}%`
                      : formatCurrency(quote.deposit_amount || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quote Details */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-lg font-medium text-white mb-4">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Valid Until</span>
                <span className={`text-white ${isExpired ? 'text-red-400' : ''}`}>
                  {formatDate(quote.valid_until)}
                </span>
              </div>
              {quote.sent_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sent</span>
                  <span className="text-white">{formatDateTime(quote.sent_at)}</span>
                </div>
              )}
              {quote.accepted_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Accepted</span>
                  <span className="text-white">{formatDateTime(quote.accepted_at)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Version</span>
                <span className="text-white">{quote.version}</span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          {events.length > 0 && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h3 className="text-lg font-medium text-white mb-4">Activity</h3>
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-flowtrade-cyan" />
                    <div>
                      <p className="text-white text-sm">
                        {event.event_type.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Quote</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete quote <strong>{quote.quote_number}</strong>? 
              This will also delete all line items and activity history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteQuote}
                disabled={actionLoading === 'delete'}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
