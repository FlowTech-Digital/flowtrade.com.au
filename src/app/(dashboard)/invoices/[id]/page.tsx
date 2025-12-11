'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
  Briefcase
} from 'lucide-react'

// Dynamic import for PDF download (client-side only)
const InvoicePDFDownload = dynamic(
  () => import('@/components/invoices/InvoicePDFDownload').then(mod => mod.InvoicePDFDownload),
  { 
    ssr: false,
    loading: () => (
      &lt;button disabled className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan/50 text-flowtrade-navy rounded-lg"&gt;
        &lt;Loader2 className="h-4 w-4 animate-spin" /&gt;
        Loading...
      &lt;/button&gt;
    )
  }
)

type Invoice = {
  id: string
  invoice_number: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  invoice_date: string
  due_date: string | null
  payment_date: string | null
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
    city: string | null
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

const STATUS_CONFIG: Record&lt;string, { label: string; color: string; bg: string; icon: React.ElementType }&gt; = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-900/30', icon: FileText },
  sent: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Send },
  paid: { label: 'Paid', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-900/30', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'text-orange-400', bg: 'bg-orange-900/30', icon: XCircle },
}

const VALID_TRANSITIONS: Record&lt;string, string[]&gt; = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
}

export default function InvoiceDetailPage({ params }: { params: Promise&lt;{ id: string }&gt; }) {
  const resolvedParams = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [invoice, setInvoice] = useState&lt;Invoice | null&gt;(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() =&gt; {
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
            city,
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
        .eq('id', resolvedParams.id)
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
  }, [user, resolvedParams.id])

  const updateStatus = async (newStatus: string) =&gt; {
    if (!invoice) return
    
    setUpdating(true)
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update invoice')
      }

      const { invoice: updatedInvoice } = await response.json()
      setInvoice(prev =&gt; prev ? { ...prev, ...updatedInvoice } : null)
    } catch (error) {
      console.error('Error updating invoice:', error)
    } finally {
      setUpdating(false)
    }
  }

  const formatCurrency = (amount: number | null) =&gt; {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) =&gt; {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getCustomerName = (customer: Invoice['customer']) =&gt; {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  const getCustomerAddress = (customer: Invoice['customer']) =&gt; {
    if (!customer) return null
    const parts = [
      customer.address_line1,
      customer.address_line2,
      [customer.city, customer.state, customer.postcode].filter(Boolean).join(' ')
    ].filter(Boolean)
    return parts.length &gt; 0 ? parts : null
  }

  const StatusBadge = ({ status }: { status: string }) =&gt; {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft']
    if (!config) return null
    const Icon = config.icon
    
    return (
      &lt;span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.color}`}&gt;
        &lt;Icon className="h-4 w-4" /&gt;
        {config.label}
      &lt;/span&gt;
    )
  }

  if (loading) {
    return (
      &lt;div className="flex items-center justify-center min-h-[400px]"&gt;
        &lt;Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" /&gt;
      &lt;/div&gt;
    )
  }

  if (!invoice) {
    return (
      &lt;div className="text-center py-12"&gt;
        &lt;h2 className="text-xl font-medium text-white mb-2"&gt;Invoice not found&lt;/h2&gt;
        &lt;button
          onClick={() =&gt; router.push('/invoices')}
          className="text-flowtrade-cyan hover:text-flowtrade-cyan/80"
        &gt;
          Back to Invoices
        &lt;/button&gt;
      &lt;/div&gt;
    )
  }

  const availableTransitions = VALID_TRANSITIONS[invoice.status] || []
  const customerAddress = getCustomerAddress(invoice.customer)

  // Prepare invoice data for PDF
  const pdfInvoiceData = {
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate,
    tax_amount: invoice.tax_amount,
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
      city: invoice.customer.city,
      state: invoice.customer.state,
      postcode: invoice.customer.postcode,
    } : null,
    job: invoice.job ? {
      job_number: invoice.job.job_number,
      job_notes: invoice.job.job_notes,
    } : null,
  }

  return (
    &lt;div&gt;
      {/* Header */}
      &lt;div className="flex items-center justify-between mb-8"&gt;
        &lt;div className="flex items-center gap-4"&gt;
          &lt;button
            onClick={() =&gt; router.push('/invoices')}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          &gt;
            &lt;ArrowLeft className="h-5 w-5" /&gt;
          &lt;/button&gt;
          &lt;div&gt;
            &lt;h1 className="text-2xl font-bold text-white"&gt;{invoice.invoice_number}&lt;/h1&gt;
            &lt;p className="text-gray-400 mt-1"&gt;{getCustomerName(invoice.customer)}&lt;/p&gt;
          &lt;/div&gt;
        &lt;/div&gt;
        &lt;div className="flex items-center gap-3"&gt;
          &lt;InvoicePDFDownload invoice={pdfInvoiceData} /&gt;
          &lt;StatusBadge status={invoice.status} /&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div className="grid grid-cols-1 lg:grid-cols-3 gap-6"&gt;
        {/* Main Content */}
        &lt;div className="lg:col-span-2 space-y-6"&gt;
          {/* Invoice Details */}
          &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6"&gt;
            &lt;h2 className="text-lg font-semibold text-white mb-4"&gt;Invoice Details&lt;/h2&gt;
            
            &lt;div className="grid grid-cols-2 gap-6"&gt;
              &lt;div&gt;
                &lt;p className="text-sm text-gray-400 mb-1"&gt;Invoice Date&lt;/p&gt;
                &lt;div className="flex items-center gap-2 text-white"&gt;
                  &lt;Calendar className="h-4 w-4 text-gray-500" /&gt;
                  {formatDate(invoice.invoice_date)}
                &lt;/div&gt;
              &lt;/div&gt;
              &lt;div&gt;
                &lt;p className="text-sm text-gray-400 mb-1"&gt;Due Date&lt;/p&gt;
                &lt;div className="flex items-center gap-2 text-white"&gt;
                  &lt;Clock className="h-4 w-4 text-gray-500" /&gt;
                  {formatDate(invoice.due_date)}
                &lt;/div&gt;
              &lt;/div&gt;
              {invoice.payment_date &amp;&amp; (
                &lt;div&gt;
                  &lt;p className="text-sm text-gray-400 mb-1"&gt;Payment Date&lt;/p&gt;
                  &lt;div className="flex items-center gap-2 text-green-400"&gt;
                    &lt;CheckCircle className="h-4 w-4" /&gt;
                    {formatDate(invoice.payment_date)}
                  &lt;/div&gt;
                &lt;/div&gt;
              )}
              {invoice.job &amp;&amp; (
                &lt;div&gt;
                  &lt;p className="text-sm text-gray-400 mb-1"&gt;Related Job&lt;/p&gt;
                  &lt;button
                    onClick={() =&gt; router.push(`/jobs/${invoice.job!.id}`)}
                    className="flex items-center gap-2 text-flowtrade-cyan hover:text-flowtrade-cyan/80"
                  &gt;
                    &lt;Briefcase className="h-4 w-4" /&gt;
                    {invoice.job.job_number}
                  &lt;/button&gt;
                &lt;/div&gt;
              )}
            &lt;/div&gt;

            {/* Amount Breakdown */}
            &lt;div className="mt-6 pt-6 border-t border-flowtrade-navy-lighter"&gt;
              &lt;div className="space-y-3"&gt;
                &lt;div className="flex justify-between text-gray-400"&gt;
                  &lt;span&gt;Subtotal&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(invoice.subtotal)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex justify-between text-gray-400"&gt;
                  &lt;span&gt;GST ({invoice.tax_rate}%)&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(invoice.tax_amount)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex justify-between text-xl font-bold text-white pt-3 border-t border-flowtrade-navy-lighter"&gt;
                  &lt;span&gt;Total&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(invoice.total)}&lt;/span&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          {/* Notes */}
          {invoice.notes &amp;&amp; (
            &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6"&gt;
              &lt;h2 className="text-lg font-semibold text-white mb-4"&gt;Notes&lt;/h2&gt;
              &lt;p className="text-gray-300 whitespace-pre-wrap"&gt;{invoice.notes}&lt;/p&gt;
            &lt;/div&gt;
          )}

          {/* Status Actions */}
          {availableTransitions.length &gt; 0 &amp;&amp; (
            &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6"&gt;
              &lt;h2 className="text-lg font-semibold text-white mb-4"&gt;Actions&lt;/h2&gt;
              &lt;div className="flex flex-wrap gap-3"&gt;
                {availableTransitions.includes('sent') &amp;&amp; (
                  &lt;button
                    onClick={() =&gt; updateStatus('sent')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  &gt;
                    {updating ? &lt;Loader2 className="h-4 w-4 animate-spin" /&gt; : &lt;Send className="h-4 w-4" /&gt;}
                    Mark as Sent
                  &lt;/button&gt;
                )}
                {availableTransitions.includes('paid') &amp;&amp; (
                  &lt;button
                    onClick={() =&gt; updateStatus('paid')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  &gt;
                    {updating ? &lt;Loader2 className="h-4 w-4 animate-spin" /&gt; : &lt;CheckCircle className="h-4 w-4" /&gt;}
                    Mark as Paid
                  &lt;/button&gt;
                )}
                {availableTransitions.includes('overdue') &amp;&amp; (
                  &lt;button
                    onClick={() =&gt; updateStatus('overdue')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  &gt;
                    {updating ? &lt;Loader2 className="h-4 w-4 animate-spin" /&gt; : &lt;AlertCircle className="h-4 w-4" /&gt;}
                    Mark as Overdue
                  &lt;/button&gt;
                )}
                {availableTransitions.includes('cancelled') &amp;&amp; (
                  &lt;button
                    onClick={() =&gt; updateStatus('cancelled')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-gray-300 rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors disabled:opacity-50"
                  &gt;
                    {updating ? &lt;Loader2 className="h-4 w-4 animate-spin" /&gt; : &lt;XCircle className="h-4 w-4" /&gt;}
                    Cancel Invoice
                  &lt;/button&gt;
                )}
              &lt;/div&gt;
            &lt;/div&gt;
          )}
        &lt;/div&gt;

        {/* Sidebar */}
        &lt;div className="space-y-6"&gt;
          {/* Customer Info */}
          &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6"&gt;
            &lt;h2 className="text-lg font-semibold text-white mb-4"&gt;Customer&lt;/h2&gt;
            
            {invoice.customer ? (
              &lt;div className="space-y-4"&gt;
                &lt;div className="flex items-start gap-3"&gt;
                  &lt;Building2 className="h-5 w-5 text-gray-500 mt-0.5" /&gt;
                  &lt;div&gt;
                    &lt;p className="text-white font-medium"&gt;{getCustomerName(invoice.customer)}&lt;/p&gt;
                    {invoice.customer.company_name &amp;&amp; invoice.customer.first_name &amp;&amp; (
                      &lt;p className="text-sm text-gray-400"&gt;
                        {invoice.customer.first_name} {invoice.customer.last_name}
                      &lt;/p&gt;
                    )}
                  &lt;/div&gt;
                &lt;/div&gt;
                
                {invoice.customer.email &amp;&amp; (
                  &lt;div className="flex items-center gap-3"&gt;
                    &lt;Mail className="h-5 w-5 text-gray-500" /&gt;
                    &lt;a 
                      href={`mailto:${invoice.customer.email}`}
                      className="text-flowtrade-cyan hover:text-flowtrade-cyan/80"
                    &gt;
                      {invoice.customer.email}
                    &lt;/a&gt;
                  &lt;/div&gt;
                )}
                
                {invoice.customer.phone &amp;&amp; (
                  &lt;div className="flex items-center gap-3"&gt;
                    &lt;Phone className="h-5 w-5 text-gray-500" /&gt;
                    &lt;a 
                      href={`tel:${invoice.customer.phone}`}
                      className="text-gray-300 hover:text-white"
                    &gt;
                      {invoice.customer.phone}
                    &lt;/a&gt;
                  &lt;/div&gt;
                )}
                
                {customerAddress &amp;&amp; (
                  &lt;div className="flex items-start gap-3"&gt;
                    &lt;MapPin className="h-5 w-5 text-gray-500 mt-0.5" /&gt;
                    &lt;div className="text-gray-300"&gt;
                      {customerAddress.map((line, i) =&gt; (
                        &lt;p key={i}&gt;{line}&lt;/p&gt;
                      ))}
                    &lt;/div&gt;
                  &lt;/div&gt;
                )}
              &lt;/div&gt;
            ) : (
              &lt;p className="text-gray-500"&gt;No customer information&lt;/p&gt;
            )}
          &lt;/div&gt;

          {/* Quick Stats */}
          &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6"&gt;
            &lt;h2 className="text-lg font-semibold text-white mb-4"&gt;Summary&lt;/h2&gt;
            &lt;div className="space-y-4"&gt;
              &lt;div className="flex items-center justify-between"&gt;
                &lt;span className="text-gray-400"&gt;Status&lt;/span&gt;
                &lt;StatusBadge status={invoice.status} /&gt;
              &lt;/div&gt;
              &lt;div className="flex items-center justify-between"&gt;
                &lt;span className="text-gray-400"&gt;Total&lt;/span&gt;
                &lt;span className="text-xl font-bold text-white"&gt;{formatCurrency(invoice.total)}&lt;/span&gt;
              &lt;/div&gt;
              &lt;div className="flex items-center justify-between"&gt;
                &lt;span className="text-gray-400"&gt;Created&lt;/span&gt;
                &lt;span className="text-gray-300"&gt;{formatDate(invoice.created_at)}&lt;/span&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  )
}
