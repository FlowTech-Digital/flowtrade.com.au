'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
  Unlink
} from 'lucide-react'

type Customer = {
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
  postal_code: string | null
}

type Job = {
  id: string
  job_number: string
  status: string
  quoted_total: number
}

type LineItem = {
  id?: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
  isNew?: boolean
  isDeleted?: boolean
  isModified?: boolean
}

// Database row type for invoice line items
type LineItemRow = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

type InvoiceData = {
  id: string
  invoice_number: string
  status: string
  customer_id: string | null
  job_id: string | null
  issue_date: string
  due_date: string | null
  notes: string | null
  subtotal: number
  gst_amount: number
  total: number
  customer: Customer | null
  job: Job | null
}

export default function EditInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const invoiceId = params.id as string

  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invoice data
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Form fields
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchingCustomers, setSearchingCustomers] = useState(false)

  // Job linking
  const [linkedJob, setLinkedJob] = useState<Job | null>(null)
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [showJobDropdown, setShowJobDropdown] = useState(false)

  // Org ID
  const [orgId, setOrgId] = useState<string | null>(null)

  // Fetch invoice data
  useEffect(() => {
    async function fetchInvoice() {
      if (!user || !invoiceId) return

      const supabase = createClient()
      if (!supabase) {
        setError('Database connection failed')
        setLoading(false)
        return
      }

      try {
        // Get user's org_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('org_id')
          .eq('auth_user_id', user.id)
          .single()

        if (userError || !userData?.org_id) {
          setError('Failed to get organization')
          setLoading(false)
          return
        }

        setOrgId(userData.org_id)

        // Fetch invoice with customer and job
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            status,
            customer_id,
            job_id,
            issue_date,
            due_date,
            notes,
            subtotal,
            gst_amount,
            total,
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
              postal_code
            ),
            job:jobs(
              id,
              job_number,
              status,
              quoted_total
            )
          `)
          .eq('id', invoiceId)
          .eq('org_id', userData.org_id)
          .single()

        if (invoiceError) {
          setError('Invoice not found')
          setLoading(false)
          return
        }

        // Fetch line items
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('sort_order', { ascending: true })

        if (itemsError) {
          console.error('Failed to fetch line items:', itemsError)
        }

        // Set form state
        setInvoice(invoiceData as InvoiceData)
        setSelectedCustomer(invoiceData.customer as Customer | null)
        setLinkedJob(invoiceData.job as Job | null)
        setIssueDate(invoiceData.issue_date || '')
        setDueDate(invoiceData.due_date || '')
        setNotes(invoiceData.notes || '')

        const items = ((itemsData || []) as LineItemRow[]).map((item: LineItemRow) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: item.sort_order
        }))
        setLineItems(items)

        // Fetch available jobs for this customer
        if (invoiceData.customer_id) {
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, job_number, status, quoted_total')
            .eq('org_id', userData.org_id)
            .eq('customer_id', invoiceData.customer_id)
            .in('status', ['completed', 'in_progress', 'scheduled'])
            .order('created_at', { ascending: false })

          setAvailableJobs(jobsData || [])
        }

      } catch (err) {
        console.error('Error fetching invoice:', err)
        setError('Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [user, invoiceId])

  // Search customers
  const searchCustomers = useCallback(async (searchTerm: string) => {
    if (!orgId || searchTerm.length < 2) {
      setCustomers([])
      return
    }

    setSearchingCustomers(true)
    const supabase = createClient()
    if (!supabase) return

    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, email, phone, address_line1, address_line2, city, state, postal_code')
      .eq('org_id', orgId)
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10)

    if (!error && data) {
      setCustomers(data)
    }
    setSearchingCustomers(false)
  }, [orgId])

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) {
        searchCustomers(customerSearch)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  // Fetch jobs when customer changes
  const fetchJobsForCustomer = useCallback(async (customerId: string) => {
    if (!orgId) return

    const supabase = createClient()
    if (!supabase) return

    const { data } = await supabase
      .from('jobs')
      .select('id, job_number, status, quoted_total')
      .eq('org_id', orgId)
      .eq('customer_id', customerId)
      .in('status', ['completed', 'in_progress', 'scheduled'])
      .order('created_at', { ascending: false })

    setAvailableJobs(data || [])
  }, [orgId])

  // Handle customer selection
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch('')
    setShowCustomerDropdown(false)
    setLinkedJob(null) // Clear job when customer changes
    fetchJobsForCustomer(customer.id)
  }

  // Get customer display name
  const getCustomerName = (customer: Customer | null) => {
    if (!customer) return ''
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
  }

  // Line item handlers
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        amount: 0,
        sort_order: lineItems.length,
        isNew: true
      }
    ])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    const item = { ...updated[index] }
    
    if (field === 'quantity' || field === 'unit_price') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
      item[field] = numValue
      item.amount = item.quantity * item.unit_price
    } else if (field === 'description') {
      item.description = value as string
    }

    // Mark as modified if it's an existing item
    if (item.id && !item.isNew) {
      item.isModified = true
    }

    updated[index] = item
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    const updated = [...lineItems]
    const item = updated[index]
    
    if (item.id && !item.isNew) {
      // Mark existing item for deletion
      item.isDeleted = true
      updated[index] = item
    } else {
      // Remove new item entirely
      updated.splice(index, 1)
    }
    
    setLineItems(updated)
  }

  // Calculate totals
  const { subtotal, gstAmount, total } = useMemo(() => {
    const activeItems = lineItems.filter(item => !item.isDeleted)
    const sub = activeItems.reduce((sum, item) => sum + item.amount, 0)
    const gst = sub * 0.1
    return {
      subtotal: sub,
      gstAmount: gst,
      total: sub + gst
    }
  }, [lineItems])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Save invoice
  const handleSave = async () => {
    if (!invoice || !orgId) return

    setSaving(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) {
      setError('Database connection failed')
      setSaving(false)
      return
    }

    try {
      // Update invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          customer_id: selectedCustomer?.id || null,
          job_id: linkedJob?.id || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          notes: notes || null,
          subtotal,
          gst_amount: gstAmount,
          total,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .eq('org_id', orgId)

      if (updateError) throw updateError

      // Handle line item changes
      const itemsToDelete = lineItems.filter(item => item.isDeleted && item.id)
      const itemsToUpdate = lineItems.filter(item => item.isModified && item.id && !item.isDeleted)
      const itemsToCreate = lineItems.filter(item => item.isNew && !item.isDeleted)

      // Delete items
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .in('id', itemsToDelete.map(i => i.id!))

        if (deleteError) console.error('Delete error:', deleteError)
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const { error: itemUpdateError } = await supabase
          .from('invoice_line_items')
          .update({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
            sort_order: item.sort_order
          })
          .eq('id', item.id!)

        if (itemUpdateError) console.error('Update error:', itemUpdateError)
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        const newItems = itemsToCreate.map((item) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: lineItems.filter(i => !i.isDeleted).indexOf(item)
        }))

        const { error: createError } = await supabase
          .from('invoice_line_items')
          .insert(newItems)

        if (createError) console.error('Create error:', createError)
      }

      // Navigate back to invoice detail
      router.push(`/invoices/${invoiceId}`)

    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-flowtrade-cyan hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  const activeLineItems = lineItems.filter(item => !item.isDeleted)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Invoice</h1>
            <p className="text-gray-400">{invoice?.invoice_number}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || activeLineItems.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Customer Section */}
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Customer</h2>
          
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  placeholder={selectedCustomer ? getCustomerName(selectedCustomer) : 'Search customers...'}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                />
              </div>
              {selectedCustomer && (
                <button
                  onClick={() => {
                    setSelectedCustomer(null)
                    setLinkedJob(null)
                    setAvailableJobs([])
                  }}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Customer dropdown */}
            {showCustomerDropdown && customerSearch.length >= 2 && (
              <div className="absolute z-10 w-full mt-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {searchingCustomers ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-flowtrade-cyan mx-auto" />
                  </div>
                ) : customers.length > 0 ? (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-flowtrade-navy-lighter transition-colors"
                    >
                      <p className="text-white font-medium">{getCustomerName(customer)}</p>
                      <p className="text-sm text-gray-400">{customer.email}</p>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-gray-500 text-center">No customers found</div>
                )}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-4 p-4 bg-flowtrade-navy rounded-lg">
              <p className="text-white font-medium">{getCustomerName(selectedCustomer)}</p>
              {selectedCustomer.email && <p className="text-sm text-gray-400">{selectedCustomer.email}</p>}
              {selectedCustomer.address_line1 && (
                <p className="text-sm text-gray-400 mt-1">
                  {selectedCustomer.address_line1}
                  {selectedCustomer.city && `, ${selectedCustomer.city}`}
                  {selectedCustomer.state && ` ${selectedCustomer.state}`}
                  {selectedCustomer.postal_code && ` ${selectedCustomer.postal_code}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Job Link Section */}
        {selectedCustomer && availableJobs.length > 0 && (
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Link to Job</h2>
            
            {linkedJob ? (
              <div className="flex items-center justify-between p-4 bg-flowtrade-navy rounded-lg">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-5 w-5 text-flowtrade-cyan" />
                  <div>
                    <p className="text-white font-medium">{linkedJob.job_number}</p>
                    <p className="text-sm text-gray-400 capitalize">{linkedJob.status.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLinkedJob(null)}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Unlink className="h-4 w-4" />
                  Unlink
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowJobDropdown(!showJobDropdown)}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-gray-400 text-left hover:border-flowtrade-cyan/50 transition-colors"
                >
                  Select a job to link...
                </button>

                {showJobDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {availableJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => {
                          setLinkedJob(job)
                          setShowJobDropdown(false)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-flowtrade-navy-lighter transition-colors"
                      >
                        <p className="text-white font-medium">{job.job_number}</p>
                        <p className="text-sm text-gray-400 capitalize">
                          {job.status.replace('_', ' ')} • {formatCurrency(job.quoted_total)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dates Section */}
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Dates</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Line Items</h2>
            <button
              onClick={addLineItem}
              className="flex items-center gap-2 px-3 py-1.5 text-flowtrade-cyan hover:bg-flowtrade-cyan/10 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-2 text-sm font-medium text-gray-400">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1"></div>
            </div>

            {/* Items */}
            {activeLineItems.map((item, index) => {
              const realIndex = lineItems.indexOf(item)
              return (
                <div key={item.id || `new-${index}`} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(realIndex, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(realIndex, 'quantity', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white text-right focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(realIndex, 'unit_price', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white text-right focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-white font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => removeLineItem(realIndex)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            {activeLineItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No line items. Click &quot;Add Item&quot; to add one.
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t border-flowtrade-navy-lighter">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>GST (10%)</span>
                  <span className="text-white">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-flowtrade-navy-lighter">
                  <span className="text-white">Total</span>
                  <span className="text-flowtrade-cyan">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or payment instructions..."
            rows={4}
            className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
          />
        </div>
      </div>
    </div>
  )
}
