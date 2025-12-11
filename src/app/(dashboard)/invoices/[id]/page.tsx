'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Pencil
} from 'lucide-react'

export const runtime = 'edge'

// Dynamic import for PDF download (client-side only)
const InvoicePDFDownload = dynamic(
  () => import('@/components/invoices/InvoicePDFDownload').then(mod => mod.InvoicePDFDownload),
  { 
    ssr: false,
    loading: () => (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan/50 text-flowtrade-navy rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </button>
    )
  }
)

type Invoice = {
  id: string
  invoice_number: string
  status: string
  subtotal: number
  tax_rate: number
  gst_amount: number
  total: number
  issue_date: string
  due_date: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  notes: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    email: string | null
    phone: string | null
    address_line1: string | null
    address_line2: string | null
    suburb: string | null
    state: string | null
    postcode: string | null
  } | null
  job: {
    id: string
    job_number: string
    status: string
    quoted_total: number | null
    actual_total: number | null
    job_notes: string | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-900/30', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Send },
  paid: { label: 'Paid', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-900/30', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-orange-400', bg: 'bg-orange-900/30', icon: XCircle },
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { user } = useAuth()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  useEffect(() => {
    async function fetchInvoice() {
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

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name,
            email,
            phone,
            address_line1,
            address_line2,
            suburb,
            state,
            postcode
          ),
          job:jobs(
            id,
            job_number,
            status,
            quoted_total,
            actual_total,
            job_notes
          )
        `)
        .eq('id', id)
        .eq('org_id', userData.org_id)
        .single()

      if (invoiceError) {
        console.error('Failed to fetch invoice:', invoiceError)
      } else {
        setInvoice(invoiceData)
      }

      setLoading(false)
    }

    fetchInvoice()
  }, [user, id])

  const updateStatus = async (newStatus: string) => {
    if (!invoice) return
    
    setUpdating(true)
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update invoice')
      }

      const { invoice: updatedInvoice } = await response.json()
      setInvoice(prev => prev ? { ...prev, ...updatedInvoice } : null)
    } catch (error) {
      console.error('Error updating invoice:', error)
    } finally {
      setUpdating(false)
    }
  }

  const sendInvoiceEmail = async () => {
    if (!invoice) return
    
    setSending(true)
    setSendError(null)
    setSendSuccess(false)
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invoice')
      }

      setSendSuccess(true)
      
      // Update local state if status changed
      if (data.status && data.status !== invoice.status) {
        setInvoice(prev => prev ? { ...prev, status: data.status } : null)
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSendSuccess(false), 5000)
    } catch (error) {
      console.error('Error sending invoice:', error)
      setSendError(error instanceof Error ? error.message : 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

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
      month: 'long',
      year: 'numeric'
    })
  }

  const getCustomerName = (customer: Invoice['customer']) => {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  const getCustomerAddress = (customer: Invoice['customer']) => {
    if (!customer) return null
    const parts = [
      customer.address_line1,
      customer.address_line2,
      [customer.suburb, customer.state, customer.postcode].filter(Boolean).join(' ')
    ].filter(Boolean)
    return parts.length > 0 ? parts : null
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft']
    if (!config) return null
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
        <Icon className="h-4 w-4" />
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

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-white mb-2">Invoice not found</h2>
        <button
          onClick={() => router.push('/invoices')}
          className="text-flowtrade-cyan hover:text-flowtrade-cyan/80"
        >
          Back to Invoices
        </button>
      </div>
    )
  }

  const availableTransitions = VALID_TRANSITIONS[invoice.status] || []
  const customerAddress = getCustomerAddress(invoice.customer)
  const canEdit = invoice.status === 'draft' || invoice.status === 'sent'
  const canSendEmail = invoice.customer?.email && (invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue')

  // Prepare invoice data for PDF
  const pdfInvoiceData = {
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.issue_date,
    due_date: invoice.due_date,
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate,
    tax_amount: invoice.gst_amount,
    total: invoice.total,
    notes: invoice.notes,
    customer: invoice.customer ? {
      first_name: invoice.customer.first_name,
      last_name: invoice.customer.last_name,
      company_name: invoice.customer.company_name,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
      address_line1: invoice.customer.address_line1,
      address_line2: invoice.customer.address_line2,
      suburb: invoice.customer.suburb,
      state: invoice.customer.state,
      postcode: invoice.customer.postcode,
    } : null,
    job: invoice.job ? {
      job_number: invoice.job.job_number,
      job_notes: invoice.job.job_notes,
    } : null,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/invoices')}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{invoice.invoice_number}</h1>
            <p className="text-gray-400 mt-1">{getCustomerName(invoice.customer)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-white rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          <InvoicePDFDownload invoice={pdfInvoiceData} />
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Send Success/Error Messages */}
      {sendSuccess && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-400">Invoice sent successfully to {invoice.customer?.email}</span>
        </div>
      )}
      {sendError && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-400">{sendError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Invoice Details</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Invoice Date</p>
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {formatDate(invoice.issue_date)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Due Date</p>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {formatDate(invoice.due_date)}
                </div>
              </div>
              {invoice.paid_at && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Payment Date</p>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    {formatDate(invoice.paid_at)}
                  </div>
                </div>
              )}
              {invoice.job && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Related Job</p>
                  <button
                    onClick={() => router.push(`/jobs/${invoice.job!.id}`)}
                    className="flex items-center gap-2 text-flowtrade-cyan hover:text-flowtrade-cyan/80"
                  >
                    <Briefcase className="h-4 w-4" />
                    {invoice.job.job_number}
                  </button>
                </div>
              )}
            </div>

            {/* Amount Breakdown */}
            <div className="mt-6 pt-6 border-t border-flowtrade-navy-lighter">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>GST ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.gst_amount)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-flowtrade-navy-lighter">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          {(availableTransitions.length > 0 || canSendEmail) && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                {/* Send Email Button */}
                {canSendEmail && (
                  <button
                    onClick={sendInvoiceEmail}
                    disabled={sending}
                    className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {sending ? 'Sending...' : 'Send Email'}
                  </button>
                )}
                {availableTransitions.includes('sent') && (
                  <button
                    onClick={() => updateStatus('sent')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Mark as Sent
                  </button>
                )}
                {availableTransitions.includes('paid') && (
                  <button
                    onClick={() => updateStatus('paid')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Mark as Paid
                  </button>
                )}
                {availableTransitions.includes('overdue') && (
                  <button
                    onClick={() => updateStatus('overdue')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                    Mark as Overdue
                  </button>
                )}
                {availableTransitions.includes('cancelled') && (
                  <button
                    onClick={() => updateStatus('cancelled')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-gray-300 rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Cancel Invoice
                  </button>
                )}
              </div>
              {!invoice.customer?.email && (
                <p className="mt-3 text-sm text-amber-400">
                  💡 Add an email address to this customer to enable email sending
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Customer</h2>
            
            {invoice.customer ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">{getCustomerName(invoice.customer)}</p>
                    {invoice.customer.company_name && invoice.customer.first_name && (
                      <p className="text-sm text-gray-400">
                        {invoice.customer.first_name} {invoice.customer.last_name}
                      </p>
                    )}
                  </div>
                </div>
                
                {invoice.customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <a 
                      href={`mailto:${invoice.customer.email}`}
                      className="text-flowtrade-cyan hover:text-flowtrade-cyan/80"
                    >
                      {invoice.customer.email}
                    </a>
                  </div>
                )}
                
                {invoice.customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <a 
                      href={`tel:${invoice.customer.phone}`}
                      className="text-gray-300 hover:text-white"
                    >
                      {invoice.customer.phone}
                    </a>
                  </div>
                )}
                
                {customerAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div className="text-gray-300">
                      {customerAddress.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No customer information</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <span className="text-xl font-bold text-white">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-300">{formatDate(invoice.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
