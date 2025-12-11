'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  AlertCircle,
  User,
  Building,
  Search,
  Plus,
  X,
  Trash2,
  Briefcase
} from 'lucide-react'

// Types
type Customer = {
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
}

type Job = {
  id: string
  job_number: string
  status: string
  quoted_total: number | null
}

type LineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
}

type FormData = {
  customer_id: string | null
  customer: Customer | null
  job_id: string | null
  job: Job | null
  issue_date: string
  due_date: string
  payment_terms: number
  notes: string
  line_items: LineItem[]
}

// Generate unique line item ID
function generateLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default function EditInvoicePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string>('')
  const [invoiceStatus, setInvoiceStatus] = useState<string>('draft')

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  // Job search state
  const [jobSearch, setJobSearch] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchingJobs, setSearchingJobs] = useState(false)

  // Form data
  const [formData, setFormData] = useState<FormData>({
    customer_id: null,
    customer: null,
    job_id: null,
    job: null,
    issue_date: '',
    due_date: '',
    payment_terms: 14,
    notes: '',
    line_items: []
  })

  // Load invoice data on mount
  useEffect(() => {
    async function loadInvoiceData() {
      if (!user || !invoiceId) return

      const supabase = createClient()
      if (!supabase) {
        setError('Failed to connect to database')
        setLoading(false)
        return
      }

      // Get user's org_id
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (userData?.org_id) {
        setOrgId(userData.org_id)
      }

      // Fetch invoice with customer and job
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(
            id, first_name, last_name, company_name,
            email, phone, address_line1, address_line2, suburb, state, postcode
          ),
          job:jobs(
            id, job_number, status, quoted_total
          )
        `)
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoiceData) {
        setError(invoiceError?.message || 'Invoice not found')
        setLoading(false)
        return
      }

      // Check if invoice is editable (only draft status)
      if (invoiceData.status !== 'draft') {
        setError('Only draft invoices can be edited. This invoice has already been sent.')
        setLoading(false)
        return
      }

      setInvoiceNumber(invoiceData.invoice_number)
      setInvoiceStatus(invoiceData.status)

      // Fetch line items
      const { data: lineItemsData } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true })

      // Convert database line items to form format
      const lineItems: LineItem[] = (lineItemsData || []).map((item) => ({
        id: item.id,
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        amount: item.amount || 0,
      }))

      // Calculate payment terms from issue_date and due_date
      let paymentTerms = 14
      if (invoiceData.issue_date && invoiceData.due_date) {
        const issueDate = new Date(invoiceData.issue_date)
        const dueDate = new Date(invoiceData.due_date)
        const diffTime = dueDate.getTime() - issueDate.getTime()
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
        if ([7, 14, 30, 60].includes(diffDays)) {
          paymentTerms = diffDays
        }
      }

      // Populate form with invoice data
      setFormData({
        customer_id: invoiceData.customer_id,
        customer: invoiceData.customer,
        job_id: invoiceData.job_id,
        job: invoiceData.job,
        issue_date: invoiceData.issue_date?.slice(0, 10) || '',
        due_date: invoiceData.due_date?.slice(0, 10) || '',
        payment_terms: paymentTerms,
        notes: invoiceData.notes || '',
        line_items: lineItems.length > 0 ? lineItems : [
          { id: generateLineItemId(), description: '', quantity: 1, unit_price: 0, amount: 0 }
        ]
      })

      setLoading(false)
    }

    loadInvoiceData()
  }, [user, invoiceId])

  // Calculate due date when issue date or payment terms change
  useEffect(() => {
    if (formData.issue_date && formData.payment_terms) {
      const issueDate = new Date(formData.issue_date)
      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + formData.payment_terms)
      const year = dueDate.getFullYear()
      const month = String(dueDate.getMonth() + 1).padStart(2, '0')
      const day = String(dueDate.getDate()).padStart(2, '0')
      setFormData(prev => ({
        ...prev,
        due_date: `${year}-${month}-${day}`
      }))
    }
  }, [formData.issue_date, formData.payment_terms])

  // Search customers
  useEffect(() => {
    async function searchCustomers() {
      if (!orgId) {
        setCustomers([])
        return
      }

      if (customerSearch.length === 1) {
        return
      }

      setSearchingCustomers(true)
      const supabase = createClient()
      if (!supabase) {
        setSearchingCustomers(false)
        return
      }

      let query = supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email, phone, address_line1, address_line2, suburb, state, postcode')
        .eq('org_id', orgId)
        .order('company_name', { ascending: true, nullsFirst: false })
        .limit(10)

      if (customerSearch.length >= 2) {
        const searchTerm = `%${customerSearch}%`
        query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},company_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      }

      const { data } = await query
      setCustomers(data || [])
      setSearchingCustomers(false)
    }

    const debounce = setTimeout(searchCustomers, 300)
    return () => clearTimeout(debounce)
  }, [customerSearch, orgId])

  // Search jobs for selected customer
  useEffect(() => {
    async function searchJobs() {
      if (!orgId || !formData.customer_id) {
        setJobs([])
        return
      }

      setSearchingJobs(true)
      const supabase = createClient()
      if (!supabase) {
        setSearchingJobs(false)
        return
      }

      let query = supabase
        .from('jobs')
        .select('id, job_number, status, quoted_total')
        .eq('org_id', orgId)
        .eq('customer_id', formData.customer_id)
        .in('status', ['completed', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (jobSearch.length >= 2) {
        query = query.ilike('job_number', `%${jobSearch}%`)
      }

      const { data } = await query
      setJobs(data || [])
      setSearchingJobs(false)
    }

    const debounce = setTimeout(searchJobs, 300)
    return () => clearTimeout(debounce)
  }, [jobSearch, orgId, formData.customer_id])

  // Get customer display name
  const getCustomerName = (customer: Customer | null) => {
    if (!customer) return 'No customer selected'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Select customer
  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer: customer,
      job_id: null,
      job: null
    }))
    setCustomerSearch('')
    setCustomers([])
    setJobs([])
  }

  // Select job
  const selectJob = (job: Job) => {
    setFormData(prev => ({
      ...prev,
      job_id: job.id,
      job: job
    }))
    setJobSearch('')
    setJobs([])
  }

  // Line item handlers
  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        { id: generateLineItemId(), description: '', quantity: 1, unit_price: 0, amount: 0 }
      ]
    }))
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unit_price') {
          updated.amount = Number(updated.quantity) * Number(updated.unit_price)
        }
        return updated
      })
    }))
  }

  const removeLineItem = (id: string) => {
    if (formData.line_items.length <= 1) return
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== id)
    }))
  }

  // Calculate totals
  const subtotal = formData.line_items.reduce((sum, item) => sum + item.amount, 0)
  const gstAmount = subtotal * 0.1
  const total = subtotal + gstAmount

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Validate form
  const isValid = () => {
    return formData.customer_id &&
      formData.line_items.some(item => item.description && item.amount > 0)
  }

  // Save invoice
  const handleSave = async () => {
    if (!orgId || !user || !isValid() || !invoiceId) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) {
      setSaving(false)
      setError('Failed to connect to database')
      return
    }

    // Update invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        customer_id: formData.customer_id,
        job_id: formData.job_id,
        subtotal: subtotal,
        gst_amount: gstAmount,
        total: total,
        issue_date: formData.issue_date,
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (invoiceError) {
      setSaving(false)
      setError(invoiceError.message)
      return
    }

    // Delete existing line items and recreate
    await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId)

    // Create new line items
    const lineItemsToInsert = formData.line_items
      .filter(item => item.description && item.amount > 0)
      .map((item, index) => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
        sort_order: index
      }))

    if (lineItemsToInsert.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        console.error('Failed to update line items:', lineItemsError)
      }
    }

    setSaving(false)
    router.push(`/invoices/${invoiceId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-flowtrade-cyan animate-spin" />
      </div>
    )
  }

  if (error && !formData.customer_id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400 text-center max-w-md">{error}</p>
        <button
          onClick={() => router.push('/invoices')}
          className="text-flowtrade-cyan hover:underline"
        >
          Back to Invoices
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push(`/invoices/${invoiceId}`)}
          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Invoice</h1>
          <p className="text-gray-400 mt-1">{invoiceNumber} • {invoiceStatus}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Customer *</h3>
            </div>

            {formData.customer ? (
              <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-cyan/30 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {formData.customer.company_name ? (
                        <Building className="h-5 w-5 text-flowtrade-cyan" />
                      ) : (
                        <User className="h-5 w-5 text-flowtrade-cyan" />
                      )}
                      <span className="font-medium text-white">{getCustomerName(formData.customer)}</span>
                    </div>
                    {formData.customer.email && (
                      <p className="text-gray-400 text-sm mt-1">{formData.customer.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, customer_id: null, customer: null, job_id: null, job: null }))}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
                {searchingCustomers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 animate-spin" />
                )}

                {customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter shadow-lg overflow-hidden">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-flowtrade-navy-lighter transition-colors text-left border-b border-flowtrade-navy-lighter last:border-0"
                      >
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-white font-medium">{getCustomerName(customer)}</p>
                          <p className="text-gray-400 text-sm">{customer.email || 'No email'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job Selection (Optional) */}
          {formData.customer_id && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-flowtrade-cyan" />
                <h3 className="text-lg font-medium text-white">Link to Job (Optional)</h3>
              </div>

              {formData.job ? (
                <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-cyan/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium text-white">{formData.job.job_number}</span>
                      <p className="text-gray-400 text-sm mt-1">Status: {formData.job.status}</p>
                      {formData.job.quoted_total && (
                        <p className="text-gray-400 text-sm">Quoted: {formatCurrency(formData.job.quoted_total)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, job_id: null, job: null }))}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search jobs for this customer..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                  {searchingJobs && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 animate-spin" />
                  )}

                  {jobs.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter shadow-lg overflow-hidden">
                      {jobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => selectJob(job)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-flowtrade-navy-lighter transition-colors text-left border-b border-flowtrade-navy-lighter last:border-0"
                        >
                          <div>
                            <p className="text-white font-medium">{job.job_number}</p>
                            <p className="text-gray-400 text-sm">{job.status}</p>
                          </div>
                          {job.quoted_total && (
                            <span className="text-flowtrade-cyan">{formatCurrency(job.quoted_total)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-flowtrade-cyan" />
                <h3 className="text-lg font-medium text-white">Line Items *</h3>
              </div>
              <button
                onClick={addLineItem}
                className="flex items-center gap-1 px-3 py-1.5 text-flowtrade-cyan hover:bg-flowtrade-navy rounded-lg transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {formData.line_items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-5">
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Description</label>}
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Qty</label>}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Unit Price</label>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">Amount</label>}
                    <div className="px-3 py-2 bg-flowtrade-navy/50 border border-flowtrade-navy-lighter rounded-lg text-white text-sm">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {index === 0 && <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>}
                    <button
                      onClick={() => removeLineItem(item.id)}
                      disabled={formData.line_items.length <= 1}
                      className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates & Terms */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Dates & Terms</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms (days)</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Notes</h3>
            </div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes to this invoice..."
              rows={3}
              className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Invoice Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Invoice #</span>
                <span className="text-white font-medium">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-gray-400 font-medium capitalize">{invoiceStatus}</span>
              </div>
              <div className="border-t border-flowtrade-navy-lighter pt-3"></div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">GST (10%)</span>
                <span className="text-white">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="border-t border-flowtrade-navy-lighter pt-3">
                <div className="flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-flowtrade-cyan font-bold text-lg">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || !isValid()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save Changes
          </button>

          <button
            onClick={() => router.push(`/invoices/${invoiceId}`)}
            className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
