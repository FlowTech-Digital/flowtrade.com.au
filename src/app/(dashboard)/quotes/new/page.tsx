'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Search,
  User,
  Building,
  MapPin,
  FileText,
  DollarSign,
  ClipboardCheck,
  Loader2,
  X,
  Calendar,
  AlertCircle
} from 'lucide-react'

// Types
type Customer = {
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

type LineItem = {
  id: string
  item_type: 'labor' | 'materials' | 'equipment' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  cost_price: number
  is_optional: boolean
  total: number
}

type FormData = {
  customer_id: string | null
  customer: Customer | null
  job_site_address: string
  job_description: string
  valid_until: string
  line_items: LineItem[]
  deposit_required: boolean
  deposit_type: 'amount' | 'percentage'
  deposit_value: number
  terms_and_conditions: string
  internal_notes: string
  customer_notes: string
}

const STEPS = [
  { id: 1, name: 'Customer', icon: User },
  { id: 2, name: 'Job Details', icon: MapPin },
  { id: 3, name: 'Line Items', icon: FileText },
  { id: 4, name: 'Pricing', icon: DollarSign },
  { id: 5, name: 'Review', icon: ClipboardCheck },
]

const ITEM_TYPES = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
]

const UNITS = ['hours', 'each', 'sqm', 'lm', 'kg', 'days', 'lot']

const DEFAULT_TERMS = `1. This quote is valid for 30 days from the date of issue.
2. A deposit of 50% is required to commence work.
3. Final payment is due upon completion.
4. All prices include GST unless otherwise stated.
5. Additional work not covered in this quote will be charged separately.`

export default function CreateQuotePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState&lt;string | null&gt;(null)
  const [orgId, setOrgId] = useState&lt;string | null&gt;(null)
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState&lt;Customer[]&gt;([])
  const [searchingCustomers, setSearchingCustomers] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    street_address: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
  })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Form data
  const [formData, setFormData] = useState&lt;FormData&gt;({
    customer_id: null,
    customer: null,
    job_site_address: '',
    job_description: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    line_items: [],
    deposit_required: true,
    deposit_type: 'percentage',
    deposit_value: 50,
    terms_and_conditions: DEFAULT_TERMS,
    internal_notes: '',
    customer_notes: '',
  })

  // New line item state
  const [newItem, setNewItem] = useState&lt;Omit&lt;LineItem, 'id' | 'total'&gt;&gt;({
    item_type: 'labor',
    description: '',
    quantity: 1,
    unit: 'hours',
    unit_price: 0,
    cost_price: 0,
    is_optional: false,
  })

  // Get org_id on mount
  useEffect(() =&gt; {
    async function getOrgId() {
      if (!user) return
      const supabase = createClient()
      if (!supabase) return

      const { data } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (data?.org_id) {
        setOrgId(data.org_id)
      }
    }
    getOrgId()
  }, [user])

  // Search customers
  useEffect(() =&gt; {
    async function searchCustomers() {
      if (!orgId || customerSearch.length &lt; 2) {
        setCustomers([])
        return
      }

      setSearchingCustomers(true)
      const supabase = createClient()
      if (!supabase) {
        setSearchingCustomers(false)
        return
      }

      const searchTerm = `%${customerSearch}%`
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email, phone, street_address, suburb, state, postcode')
        .eq('org_id', orgId)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},company_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(10)

      setCustomers(data || [])
      setSearchingCustomers(false)
    }

    const debounce = setTimeout(searchCustomers, 300)
    return () =&gt; clearTimeout(debounce)
  }, [customerSearch, orgId])

  // Calculate totals
  const totals = useMemo(() =&gt; {
    const requiredItems = formData.line_items.filter(item =&gt; !item.is_optional)
    const subtotal = requiredItems.reduce((sum, item) =&gt; sum + item.total, 0)
    const tax = subtotal * 0.1 // 10% GST
    const total = subtotal + tax
    const deposit = formData.deposit_required
      ? formData.deposit_type === 'percentage'
        ? total * (formData.deposit_value / 100)
        : formData.deposit_value
      : 0

    return { subtotal, tax, total, deposit }
  }, [formData.line_items, formData.deposit_required, formData.deposit_type, formData.deposit_value])

  // Generate quote number
  const generateQuoteNumber = () =&gt; {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `QTE-${year}${month}-${random}`
  }

  // Format currency
  const formatCurrency = (amount: number) =&gt; {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Get customer display name
  const getCustomerName = (customer: Customer | null) =&gt; {
    if (!customer) return 'No customer selected'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Select customer
  const selectCustomer = (customer: Customer) =&gt; {
    setFormData(prev =&gt; ({
      ...prev,
      customer_id: customer.id,
      customer: customer,
      job_site_address: prev.job_site_address || 
        [customer.street_address, customer.suburb, customer.state, customer.postcode]
          .filter(Boolean).join(', ')
    }))
    setCustomerSearch('')
    setCustomers([])
  }

  // Create new customer
  const handleCreateCustomer = async () =&gt; {
    if (!orgId) return
    setCreatingCustomer(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) {
      setCreatingCustomer(false)
      setError('Failed to connect to database')
      return
    }

    const { data, error: createError } = await supabase
      .from('customers')
      .insert({
        org_id: orgId,
        ...newCustomer,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setCreatingCustomer(false)
      return
    }

    if (data) {
      selectCustomer(data)
      setShowCustomerModal(false)
      setNewCustomer({
        first_name: '',
        last_name: '',
        company_name: '',
        email: '',
        phone: '',
        street_address: '',
        suburb: '',
        state: 'NSW',
        postcode: '',
      })
    }
    setCreatingCustomer(false)
  }

  // Add line item
  const addLineItem = () =&gt; {
    if (!newItem.description) return

    const item: LineItem = {
      ...newItem,
      id: crypto.randomUUID(),
      total: newItem.quantity * newItem.unit_price,
    }

    setFormData(prev =&gt; ({
      ...prev,
      line_items: [...prev.line_items, item],
    }))

    setNewItem({
      item_type: 'labor',
      description: '',
      quantity: 1,
      unit: 'hours',
      unit_price: 0,
      cost_price: 0,
      is_optional: false,
    })
  }

  // Remove line item
  const removeLineItem = (id: string) =&gt; {
    setFormData(prev =&gt; ({
      ...prev,
      line_items: prev.line_items.filter(item =&gt; item.id !== id),
    }))
  }

  // Toggle optional
  const toggleOptional = (id: string) =&gt; {
    setFormData(prev =&gt; ({
      ...prev,
      line_items: prev.line_items.map(item =&gt;
        item.id === id ? { ...item, is_optional: !item.is_optional } : item
      ),
    }))
  }

  // Validate step
  const validateStep = (step: number): boolean =&gt; {
    switch (step) {
      case 1:
        return !!formData.customer_id
      case 2:
        return !!formData.job_site_address &amp;&amp; !!formData.job_description
      case 3:
        return formData.line_items.length &gt; 0
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  // Navigate steps
  const nextStep = () =&gt; {
    if (validateStep(currentStep) &amp;&amp; currentStep &lt; 5) {
      setCurrentStep(prev =&gt; prev + 1)
    }
  }

  const prevStep = () =&gt; {
    if (currentStep &gt; 1) {
      setCurrentStep(prev =&gt; prev - 1)
    }
  }

  // Save quote
  const handleSave = async () =&gt; {
    if (!orgId || !user) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) {
      setSaving(false)
      setError('Failed to connect to database')
      return
    }

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) {
      setSaving(false)
      setError('Failed to get user information')
      return
    }

    const quoteNumber = generateQuoteNumber()

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        org_id: orgId,
        quote_number: quoteNumber,
        version: 1,
        status: 'draft',
        customer_id: formData.customer_id,
        job_site_address: formData.job_site_address,
        job_description: formData.job_description,
        subtotal: totals.subtotal,
        tax_rate: 10,
        tax_amount: totals.tax,
        total: totals.total,
        deposit_required: formData.deposit_required,
        deposit_amount: formData.deposit_required &amp;&amp; formData.deposit_type === 'amount' 
          ? formData.deposit_value : totals.deposit,
        deposit_percentage: formData.deposit_required &amp;&amp; formData.deposit_type === 'percentage'
          ? formData.deposit_value : null,
        valid_until: formData.valid_until,
        terms_and_conditions: formData.terms_and_conditions,
        internal_notes: formData.internal_notes,
        customer_notes: formData.customer_notes,
        created_by: userData.id,
      })
      .select()
      .single()

    if (quoteError || !quote) {
      setSaving(false)
      setError(quoteError?.message || 'Failed to create quote')
      return
    }

    // Create line items
    if (formData.line_items.length &gt; 0) {
      const lineItems = formData.line_items.map((item, index) =&gt; ({
        quote_id: quote.id,
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

      const { error: itemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItems)

      if (itemsError) {
        console.error('Failed to create line items:', itemsError)
      }
    }

    setSaving(false)
    router.push(`/quotes/${quote.id}`)
  }

  // Render step content
  const renderStep = () =&gt; {
    switch (currentStep) {
      case 1:
        return (
          &lt;div className="space-y-6"&gt;
            &lt;div&gt;
              &lt;h2 className="text-xl font-semibold text-white mb-2"&gt;Select Customer&lt;/h2&gt;
              &lt;p className="text-gray-400"&gt;Choose an existing customer or create a new one&lt;/p&gt;
            &lt;/div&gt;

            {/* Selected Customer */}
            {formData.customer &amp;&amp; (
              &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-cyan/30 p-4"&gt;
                &lt;div className="flex items-start justify-between"&gt;
                  &lt;div&gt;
                    &lt;div className="flex items-center gap-2"&gt;
                      &lt;Building className="h-5 w-5 text-flowtrade-cyan" /&gt;
                      &lt;span className="font-medium text-white"&gt;{getCustomerName(formData.customer)}&lt;/span&gt;
                    &lt;/div&gt;
                    {formData.customer.email &amp;&amp; (
                      &lt;p className="text-gray-400 text-sm mt-1"&gt;{formData.customer.email}&lt;/p&gt;
                    )}
                    {formData.customer.phone &amp;&amp; (
                      &lt;p className="text-gray-400 text-sm"&gt;{formData.customer.phone}&lt;/p&gt;
                    )}
                  &lt;/div&gt;
                  &lt;button
                    onClick={() =&gt; setFormData(prev =&gt; ({ ...prev, customer_id: null, customer: null }))}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  &gt;
                    &lt;X className="h-5 w-5" /&gt;
                  &lt;/button&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}

            {/* Customer Search */}
            {!formData.customer &amp;&amp; (
              &lt;div className="space-y-4"&gt;
                &lt;div className="relative"&gt;
                  &lt;Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /&gt;
                  &lt;input
                    type="text"
                    placeholder="Search customers by name, company, or email..."
                    value={customerSearch}
                    onChange={(e) =&gt; setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  /&gt;
                  {searchingCustomers &amp;&amp; (
                    &lt;Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 animate-spin" /&gt;
                  )}
                &lt;/div&gt;

                {/* Search Results */}
                {customers.length &gt; 0 &amp;&amp; (
                  &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter overflow-hidden"&gt;
                    {customers.map((customer) =&gt; (
                      &lt;button
                        key={customer.id}
                        onClick={() =&gt; selectCustomer(customer)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-flowtrade-navy-lighter transition-colors text-left border-b border-flowtrade-navy-lighter last:border-0"
                      &gt;
                        &lt;div className="w-10 h-10 bg-flowtrade-navy-lighter rounded-full flex items-center justify-center"&gt;
                          &lt;User className="h-5 w-5 text-gray-400" /&gt;
                        &lt;/div&gt;
                        &lt;div&gt;
                          &lt;p className="text-white font-medium"&gt;{getCustomerName(customer)}&lt;/p&gt;
                          &lt;p className="text-gray-400 text-sm"&gt;{customer.email || customer.phone || 'No contact info'}&lt;/p&gt;
                        &lt;/div&gt;
                      &lt;/button&gt;
                    ))}
                  &lt;/div&gt;
                )}

                {/* Create New Customer Button */}
                &lt;button
                  onClick={() =&gt; setShowCustomerModal(true)}
                  className="flex items-center gap-2 px-4 py-3 w-full bg-flowtrade-navy border border-dashed border-flowtrade-navy-lighter rounded-lg text-gray-400 hover:text-white hover:border-flowtrade-cyan/50 transition-colors"
                &gt;
                  &lt;Plus className="h-5 w-5" /&gt;
                  Create New Customer
                &lt;/button&gt;
              &lt;/div&gt;
            )}
          &lt;/div&gt;
        )

      case 2:
        return (
          &lt;div className="space-y-6"&gt;
            &lt;div&gt;
              &lt;h2 className="text-xl font-semibold text-white mb-2"&gt;Job Details&lt;/h2&gt;
              &lt;p className="text-gray-400"&gt;Enter the job site address and description&lt;/p&gt;
            &lt;/div&gt;

            &lt;div className="space-y-4"&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Job Site Address *&lt;/label&gt;
                &lt;div className="relative"&gt;
                  &lt;MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-500" /&gt;
                  &lt;input
                    type="text"
                    value={formData.job_site_address}
                    onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, job_site_address: e.target.value }))}
                    placeholder="Enter the job site address"
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Job Description *&lt;/label&gt;
                &lt;textarea
                  value={formData.job_description}
                  onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, job_description: e.target.value }))}
                  placeholder="Describe the scope of work..."
                  rows={5}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                /&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Quote Valid Until&lt;/label&gt;
                &lt;div className="relative"&gt;
                  &lt;Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" /&gt;
                  &lt;input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, valid_until: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        )

      case 3:
        return (
          &lt;div className="space-y-6"&gt;
            &lt;div&gt;
              &lt;h2 className="text-xl font-semibold text-white mb-2"&gt;Line Items&lt;/h2&gt;
              &lt;p className="text-gray-400"&gt;Add the items and services for this quote&lt;/p&gt;
            &lt;/div&gt;

            {/* Add Item Form */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-4 space-y-4"&gt;
              &lt;div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-xs font-medium text-gray-400 mb-1"&gt;Type&lt;/label&gt;
                  &lt;select
                    value={newItem.item_type}
                    onChange={(e) =&gt; setNewItem(prev =&gt; ({ ...prev, item_type: e.target.value as LineItem['item_type'] }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  &gt;
                    {ITEM_TYPES.map(type =&gt; (
                      &lt;option key={type.value} value={type.value}&gt;{type.label}&lt;/option&gt;
                    ))}
                  &lt;/select&gt;
                &lt;/div&gt;

                &lt;div className="md:col-span-2 lg:col-span-3"&gt;
                  &lt;label className="block text-xs font-medium text-gray-400 mb-1"&gt;Description&lt;/label&gt;
                  &lt;input
                    type="text"
                    value={newItem.description}
                    onChange={(e) =&gt; setNewItem(prev =&gt; ({ ...prev, description: e.target.value }))}
                    placeholder="Item description"
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div className="grid grid-cols-2 md:grid-cols-4 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-xs font-medium text-gray-400 mb-1"&gt;Quantity&lt;/label&gt;
                  &lt;input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newItem.quantity}
                    onChange={(e) =&gt; setNewItem(prev =&gt; ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;

                &lt;div&gt;
                  &lt;label className="block text-xs font-medium text-gray-400 mb-1"&gt;Unit&lt;/label&gt;
                  &lt;select
                    value={newItem.unit}
                    onChange={(e) =&gt; setNewItem(prev =&gt; ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  &gt;
                    {UNITS.map(unit =&gt; (
                      &lt;option key={unit} value={unit}&gt;{unit}&lt;/option&gt;
                    ))}
                  &lt;/select&gt;
                &lt;/div&gt;

                &lt;div&gt;
                  &lt;label className="block text-xs font-medium text-gray-400 mb-1"&gt;Unit Price ($)&lt;/label&gt;
                  &lt;input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) =&gt; setNewItem(prev =&gt; ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;

                &lt;div&gt;
                  &lt;label className="block text-xs font-medium text-gray-400 mb-1"&gt;Line Total&lt;/label&gt;
                  &lt;div className="px-3 py-2 bg-flowtrade-navy-lighter rounded-lg text-white font-medium"&gt;
                    {formatCurrency(newItem.quantity * newItem.unit_price)}
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div className="flex items-center justify-between pt-2"&gt;
                &lt;label className="flex items-center gap-2 cursor-pointer"&gt;
                  &lt;input
                    type="checkbox"
                    checked={newItem.is_optional}
                    onChange={(e) =&gt; setNewItem(prev =&gt; ({ ...prev, is_optional: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 text-flowtrade-cyan focus:ring-flowtrade-cyan bg-flowtrade-navy"
                  /&gt;
                  &lt;span className="text-sm text-gray-400"&gt;Optional item&lt;/span&gt;
                &lt;/label&gt;

                &lt;button
                  onClick={addLineItem}
                  disabled={!newItem.description}
                  className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                &gt;
                  &lt;Plus className="h-4 w-4" /&gt;
                  Add Item
                &lt;/button&gt;
              &lt;/div&gt;
            &lt;/div&gt;

            {/* Line Items List */}
            {formData.line_items.length &gt; 0 ? (
              &lt;div className="bg-flowtrade-navy-light rounded-lg border border-flowtrade-navy-lighter overflow-hidden"&gt;
                &lt;table className="w-full"&gt;
                  &lt;thead&gt;
                    &lt;tr className="border-b border-flowtrade-navy-lighter"&gt;
                      &lt;th className="text-left px-4 py-3 text-xs font-medium text-gray-400"&gt;Description&lt;/th&gt;
                      &lt;th className="text-center px-4 py-3 text-xs font-medium text-gray-400"&gt;Qty&lt;/th&gt;
                      &lt;th className="text-center px-4 py-3 text-xs font-medium text-gray-400"&gt;Unit&lt;/th&gt;
                      &lt;th className="text-right px-4 py-3 text-xs font-medium text-gray-400"&gt;Price&lt;/th&gt;
                      &lt;th className="text-right px-4 py-3 text-xs font-medium text-gray-400"&gt;Total&lt;/th&gt;
                      &lt;th className="text-center px-4 py-3 text-xs font-medium text-gray-400"&gt;Optional&lt;/th&gt;
                      &lt;th className="px-4 py-3"&gt;&lt;/th&gt;
                    &lt;/tr&gt;
                  &lt;/thead&gt;
                  &lt;tbody&gt;
                    {formData.line_items.map((item) =&gt; (
                      &lt;tr key={item.id} className={`border-b border-flowtrade-navy-lighter ${item.is_optional ? 'opacity-60' : ''}`}&gt;
                        &lt;td className="px-4 py-3"&gt;
                          &lt;div className="flex items-center gap-2"&gt;
                            &lt;span className="text-xs px-2 py-0.5 bg-flowtrade-navy rounded text-gray-400 capitalize"&gt;
                              {item.item_type}
                            &lt;/span&gt;
                            &lt;span className="text-white"&gt;{item.description}&lt;/span&gt;
                          &lt;/div&gt;
                        &lt;/td&gt;
                        &lt;td className="text-center px-4 py-3 text-gray-300"&gt;{item.quantity}&lt;/td&gt;
                        &lt;td className="text-center px-4 py-3 text-gray-300"&gt;{item.unit}&lt;/td&gt;
                        &lt;td className="text-right px-4 py-3 text-gray-300"&gt;{formatCurrency(item.unit_price)}&lt;/td&gt;
                        &lt;td className="text-right px-4 py-3 text-white font-medium"&gt;{formatCurrency(item.total)}&lt;/td&gt;
                        &lt;td className="text-center px-4 py-3"&gt;
                          &lt;button
                            onClick={() =&gt; toggleOptional(item.id)}
                            className={`w-5 h-5 rounded border ${item.is_optional ? 'bg-flowtrade-cyan border-flowtrade-cyan' : 'border-gray-600'}`}
                          &gt;
                            {item.is_optional &amp;&amp; &lt;Check className="h-4 w-4 text-flowtrade-navy" /&gt;}
                          &lt;/button&gt;
                        &lt;/td&gt;
                        &lt;td className="px-4 py-3"&gt;
                          &lt;button
                            onClick={() =&gt; removeLineItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          &gt;
                            &lt;Trash2 className="h-4 w-4" /&gt;
                          &lt;/button&gt;
                        &lt;/td&gt;
                      &lt;/tr&gt;
                    ))}
                  &lt;/tbody&gt;
                &lt;/table&gt;
              &lt;/div&gt;
            ) : (
              &lt;div className="text-center py-8 text-gray-400"&gt;
                &lt;FileText className="h-12 w-12 mx-auto mb-3 opacity-50" /&gt;
                &lt;p&gt;No items added yet. Add your first line item above.&lt;/p&gt;
              &lt;/div&gt;
            )}
          &lt;/div&gt;
        )

      case 4:
        return (
          &lt;div className="space-y-6"&gt;
            &lt;div&gt;
              &lt;h2 className="text-xl font-semibold text-white mb-2"&gt;Pricing &amp; Terms&lt;/h2&gt;
              &lt;p className="text-gray-400"&gt;Review pricing and set terms for this quote&lt;/p&gt;
            &lt;/div&gt;

            {/* Pricing Summary */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-6"&gt;
              &lt;h3 className="text-lg font-medium text-white mb-4"&gt;Pricing Summary&lt;/h3&gt;
              &lt;div className="space-y-3"&gt;
                &lt;div className="flex justify-between text-gray-300"&gt;
                  &lt;span&gt;Subtotal&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(totals.subtotal)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex justify-between text-gray-300"&gt;
                  &lt;span&gt;GST (10%)&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(totals.tax)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="border-t border-flowtrade-navy-lighter pt-3 flex justify-between text-white font-semibold text-lg"&gt;
                  &lt;span&gt;Total (inc. GST)&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(totals.total)}&lt;/span&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;

            {/* Deposit Settings */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-6"&gt;
              &lt;div className="flex items-center justify-between mb-4"&gt;
                &lt;h3 className="text-lg font-medium text-white"&gt;Deposit Required&lt;/h3&gt;
                &lt;button
                  onClick={() =&gt; setFormData(prev =&gt; ({ ...prev, deposit_required: !prev.deposit_required }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.deposit_required ? 'bg-flowtrade-cyan' : 'bg-gray-600'
                  }`}
                &gt;
                  &lt;span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.deposit_required ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  /&gt;
                &lt;/button&gt;
              &lt;/div&gt;

              {formData.deposit_required &amp;&amp; (
                &lt;div className="grid grid-cols-2 gap-4"&gt;
                  &lt;div&gt;
                    &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Deposit Type&lt;/label&gt;
                    &lt;select
                      value={formData.deposit_type}
                      onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, deposit_type: e.target.value as 'amount' | 'percentage' }))}
                      className="w-full px-4 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                    &gt;
                      &lt;option value="percentage"&gt;Percentage&lt;/option&gt;
                      &lt;option value="amount"&gt;Fixed Amount&lt;/option&gt;
                    &lt;/select&gt;
                  &lt;/div&gt;
                  &lt;div&gt;
                    &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;
                      {formData.deposit_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                    &lt;/label&gt;
                    &lt;input
                      type="number"
                      min="0"
                      max={formData.deposit_type === 'percentage' ? 100 : undefined}
                      value={formData.deposit_value}
                      onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, deposit_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                    /&gt;
                  &lt;/div&gt;
                  &lt;div className="col-span-2"&gt;
                    &lt;p className="text-gray-400"&gt;
                      Deposit amount: &lt;span className="text-white font-medium"&gt;{formatCurrency(totals.deposit)}&lt;/span&gt;
                    &lt;/p&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              )}
            &lt;/div&gt;

            {/* Terms &amp; Notes */}
            &lt;div className="space-y-4"&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Terms &amp; Conditions&lt;/label&gt;
                &lt;textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, terms_and_conditions: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                /&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Notes for Customer (visible on quote)&lt;/label&gt;
                &lt;textarea
                  value={formData.customer_notes}
                  onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, customer_notes: e.target.value }))}
                  placeholder="Add any notes that should appear on the quote..."
                  rows={3}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                /&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-2"&gt;Internal Notes (not visible to customer)&lt;/label&gt;
                &lt;textarea
                  value={formData.internal_notes}
                  onChange={(e) =&gt; setFormData(prev =&gt; ({ ...prev, internal_notes: e.target.value }))}
                  placeholder="Add any internal notes for your team..."
                  rows={3}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                /&gt;
              &lt;/div&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        )

      case 5:
        return (
          &lt;div className="space-y-6"&gt;
            &lt;div&gt;
              &lt;h2 className="text-xl font-semibold text-white mb-2"&gt;Review Quote&lt;/h2&gt;
              &lt;p className="text-gray-400"&gt;Review your quote before saving&lt;/p&gt;
            &lt;/div&gt;

            {/* Customer Summary */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-4"&gt;
              &lt;h3 className="text-sm font-medium text-gray-400 mb-2"&gt;Customer&lt;/h3&gt;
              &lt;p className="text-white font-medium"&gt;{getCustomerName(formData.customer)}&lt;/p&gt;
              {formData.customer?.email &amp;&amp; &lt;p className="text-gray-400 text-sm"&gt;{formData.customer.email}&lt;/p&gt;}
            &lt;/div&gt;

            {/* Job Summary */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-4"&gt;
              &lt;h3 className="text-sm font-medium text-gray-400 mb-2"&gt;Job Details&lt;/h3&gt;
              &lt;p className="text-white"&gt;{formData.job_site_address}&lt;/p&gt;
              &lt;p className="text-gray-400 text-sm mt-2"&gt;{formData.job_description}&lt;/p&gt;
            &lt;/div&gt;

            {/* Items Summary */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter overflow-hidden"&gt;
              &lt;div className="px-4 py-3 border-b border-flowtrade-navy-lighter"&gt;
                &lt;h3 className="text-sm font-medium text-gray-400"&gt;Line Items ({formData.line_items.length})&lt;/h3&gt;
              &lt;/div&gt;
              &lt;div className="divide-y divide-flowtrade-navy-lighter"&gt;
                {formData.line_items.map((item) =&gt; (
                  &lt;div key={item.id} className={`px-4 py-3 flex justify-between ${item.is_optional ? 'opacity-60' : ''}`}&gt;
                    &lt;div&gt;
                      &lt;span className="text-white"&gt;{item.description}&lt;/span&gt;
                      {item.is_optional &amp;&amp; &lt;span className="text-xs text-gray-400 ml-2"&gt;(Optional)&lt;/span&gt;}
                      &lt;p className="text-gray-400 text-sm"&gt;
                        {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                      &lt;/p&gt;
                    &lt;/div&gt;
                    &lt;span className="text-white font-medium"&gt;{formatCurrency(item.total)}&lt;/span&gt;
                  &lt;/div&gt;
                ))}
              &lt;/div&gt;
            &lt;/div&gt;

            {/* Totals */}
            &lt;div className="bg-flowtrade-navy rounded-lg border border-flowtrade-cyan/30 p-4"&gt;
              &lt;div className="space-y-2"&gt;
                &lt;div className="flex justify-between text-gray-300"&gt;
                  &lt;span&gt;Subtotal&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(totals.subtotal)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex justify-between text-gray-300"&gt;
                  &lt;span&gt;GST (10%)&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(totals.tax)}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="border-t border-flowtrade-navy-lighter pt-2 flex justify-between text-white font-semibold text-lg"&gt;
                  &lt;span&gt;Total&lt;/span&gt;
                  &lt;span&gt;{formatCurrency(totals.total)}&lt;/span&gt;
                &lt;/div&gt;
                {formData.deposit_required &amp;&amp; (
                  &lt;div className="flex justify-between text-flowtrade-cyan"&gt;
                    &lt;span&gt;Deposit Required&lt;/span&gt;
                    &lt;span&gt;{formatCurrency(totals.deposit)}&lt;/span&gt;
                  &lt;/div&gt;
                )}
              &lt;/div&gt;
            &lt;/div&gt;

            {/* Valid Until */}
            &lt;div className="flex items-center gap-2 text-gray-400"&gt;
              &lt;Calendar className="h-4 w-4" /&gt;
              &lt;span&gt;Valid until: {new Date(formData.valid_until).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}&lt;/span&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        )

      default:
        return null
    }
  }

  return (
    &lt;div&gt;
      {/* Header */}
      &lt;div className="flex items-center gap-4 mb-8"&gt;
        &lt;button
          onClick={() =&gt; router.push('/quotes')}
          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
        &gt;
          &lt;ArrowLeft className="h-5 w-5" /&gt;
        &lt;/button&gt;
        &lt;div&gt;
          &lt;h1 className="text-2xl font-bold text-white"&gt;Create Quote&lt;/h1&gt;
          &lt;p className="text-gray-400 mt-1"&gt;Build a professional quote for your customer&lt;/p&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      {/* Progress Steps */}
      &lt;div className="mb-8"&gt;
        &lt;div className="flex items-center justify-between"&gt;
          {STEPS.map((step, index) =&gt; {
            const Icon = step.icon
            const isCompleted = currentStep &gt; step.id
            const isCurrent = currentStep === step.id

            return (
              &lt;div key={step.id} className="flex items-center"&gt;
                &lt;div className="flex flex-col items-center"&gt;
                  &lt;div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-flowtrade-cyan text-flowtrade-navy'
                        : isCurrent
                        ? 'bg-flowtrade-cyan/20 text-flowtrade-cyan border-2 border-flowtrade-cyan'
                        : 'bg-flowtrade-navy-lighter text-gray-400'
                    }`}
                  &gt;
                    {isCompleted ? &lt;Check className="h-5 w-5" /&gt; : &lt;Icon className="h-5 w-5" /&gt;}
                  &lt;/div&gt;
                  &lt;span className={`text-xs mt-2 ${isCurrent ? 'text-white' : 'text-gray-500'}`}&gt;
                    {step.name}
                  &lt;/span&gt;
                &lt;/div&gt;
                {index &lt; STEPS.length - 1 &amp;&amp; (
                  &lt;div
                    className={`w-full h-0.5 mx-2 ${
                      currentStep &gt; step.id ? 'bg-flowtrade-cyan' : 'bg-flowtrade-navy-lighter'
                    }`}
                    style={{ width: '60px' }}
                  /&gt;
                )}
              &lt;/div&gt;
            )
          })}
        &lt;/div&gt;
      &lt;/div&gt;

      {/* Error Alert */}
      {error &amp;&amp; (
        &lt;div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3"&gt;
          &lt;AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" /&gt;
          &lt;p className="text-red-400"&gt;{error}&lt;/p&gt;
          &lt;button onClick={() =&gt; setError(null)} className="ml-auto text-red-400 hover:text-red-300"&gt;
            &lt;X className="h-4 w-4" /&gt;
          &lt;/button&gt;
        &lt;/div&gt;
      )}

      {/* Step Content */}
      &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6 mb-6"&gt;
        {renderStep()}
      &lt;/div&gt;

      {/* Navigation Buttons */}
      &lt;div className="flex items-center justify-between"&gt;
        &lt;button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        &gt;
          &lt;ArrowLeft className="h-5 w-5" /&gt;
          Back
        &lt;/button&gt;

        &lt;div className="flex items-center gap-3"&gt;
          {currentStep === 5 ? (
            &lt;button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
            &gt;
              {saving ? (
                &lt;Loader2 className="h-5 w-5 animate-spin" /&gt;
              ) : (
                &lt;Check className="h-5 w-5" /&gt;
              )}
              Save as Draft
            &lt;/button&gt;
          ) : (
            &lt;button
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className="flex items-center gap-2 px-6 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            &gt;
              Continue
              &lt;ArrowRight className="h-5 w-5" /&gt;
            &lt;/button&gt;
          )}
        &lt;/div&gt;
      &lt;/div&gt;

      {/* Customer Creation Modal */}
      {showCustomerModal &amp;&amp; (
        &lt;div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"&gt;
          &lt;div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter w-full max-w-lg max-h-[90vh] overflow-y-auto"&gt;
            &lt;div className="p-6 border-b border-flowtrade-navy-lighter flex items-center justify-between"&gt;
              &lt;h3 className="text-lg font-semibold text-white"&gt;Create New Customer&lt;/h3&gt;
              &lt;button
                onClick={() =&gt; setShowCustomerModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              &gt;
                &lt;X className="h-5 w-5" /&gt;
              &lt;/button&gt;
            &lt;/div&gt;

            &lt;div className="p-6 space-y-4"&gt;
              &lt;div className="grid grid-cols-2 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;First Name&lt;/label&gt;
                  &lt;input
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Last Name&lt;/label&gt;
                  &lt;input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Company Name&lt;/label&gt;
                &lt;input
                  type="text"
                  value={newCustomer.company_name}
                  onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                /&gt;
              &lt;/div&gt;

              &lt;div className="grid grid-cols-2 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Email&lt;/label&gt;
                  &lt;input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Phone&lt;/label&gt;
                  &lt;input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;

              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Street Address&lt;/label&gt;
                &lt;input
                  type="text"
                  value={newCustomer.street_address}
                  onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, street_address: e.target.value }))}
                  className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                /&gt;
              &lt;/div&gt;

              &lt;div className="grid grid-cols-3 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Suburb&lt;/label&gt;
                  &lt;input
                    type="text"
                    value={newCustomer.suburb}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, suburb: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;State&lt;/label&gt;
                  &lt;select
                    value={newCustomer.state}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  &gt;
                    &lt;option value="NSW"&gt;NSW&lt;/option&gt;
                    &lt;option value="VIC"&gt;VIC&lt;/option&gt;
                    &lt;option value="QLD"&gt;QLD&lt;/option&gt;
                    &lt;option value="WA"&gt;WA&lt;/option&gt;
                    &lt;option value="SA"&gt;SA&lt;/option&gt;
                    &lt;option value="TAS"&gt;TAS&lt;/option&gt;
                    &lt;option value="NT"&gt;NT&lt;/option&gt;
                    &lt;option value="ACT"&gt;ACT&lt;/option&gt;
                  &lt;/select&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-gray-300 mb-1"&gt;Postcode&lt;/label&gt;
                  &lt;input
                    type="text"
                    value={newCustomer.postcode}
                    onChange={(e) =&gt; setNewCustomer(prev =&gt; ({ ...prev, postcode: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/div&gt;

            &lt;div className="p-6 border-t border-flowtrade-navy-lighter flex justify-end gap-3"&gt;
              &lt;button
                onClick={() =&gt; setShowCustomerModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              &gt;
                Cancel
              &lt;/button&gt;
              &lt;button
                onClick={handleCreateCustomer}
                disabled={creatingCustomer || (!newCustomer.first_name &amp;&amp; !newCustomer.company_name)}
                className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
              &gt;
                {creatingCustomer ? (
                  &lt;Loader2 className="h-4 w-4 animate-spin" /&gt;
                ) : (
                  &lt;Plus className="h-4 w-4" /&gt;
                )}
                Create Customer
              &lt;/button&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}
    &lt;/div&gt;
  )
}
