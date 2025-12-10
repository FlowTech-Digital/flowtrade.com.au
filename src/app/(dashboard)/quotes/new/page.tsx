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
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
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
  const [formData, setFormData] = useState<FormData>({
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
  const [newItem, setNewItem] = useState<Omit<LineItem, 'id' | 'total'>>({
    item_type: 'labor',
    description: '',
    quantity: 1,
    unit: 'hours',
    unit_price: 0,
    cost_price: 0,
    is_optional: false,
  })

  // Get org_id on mount
  useEffect(() => {
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
  useEffect(() => {
    async function searchCustomers() {
      if (!orgId || customerSearch.length < 2) {
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
    return () => clearTimeout(debounce)
  }, [customerSearch, orgId])

  // Calculate totals
  const totals = useMemo(() => {
    const requiredItems = formData.line_items.filter(item => !item.is_optional)
    const subtotal = requiredItems.reduce((sum, item) => sum + item.total, 0)
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
  const generateQuoteNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `QTE-${year}${month}-${random}`
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

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
      job_site_address: prev.job_site_address || 
        [customer.street_address, customer.suburb, customer.state, customer.postcode]
          .filter(Boolean).join(', ')
    }))
    setCustomerSearch('')
    setCustomers([])
  }

  // Create new customer
  const handleCreateCustomer = async () => {
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
  const addLineItem = () => {
    if (!newItem.description) return

    const item: LineItem = {
      ...newItem,
      id: crypto.randomUUID(),
      total: newItem.quantity * newItem.unit_price,
    }

    setFormData(prev => ({
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
  const removeLineItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== id),
    }))
  }

  // Toggle optional
  const toggleOptional = (id: string) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map(item =>
        item.id === id ? { ...item, is_optional: !item.is_optional } : item
      ),
    }))
  }

  // Validate step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.customer_id
      case 2:
        return !!formData.job_site_address && !!formData.job_description
      case 3:
        return formData.line_items.length > 0
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  // Navigate steps
  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Save quote
  const handleSave = async () => {
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
        deposit_amount: formData.deposit_required && formData.deposit_type === 'amount' 
          ? formData.deposit_value : totals.deposit,
        deposit_percentage: formData.deposit_required && formData.deposit_type === 'percentage'
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
    if (formData.line_items.length > 0) {
      const lineItems = formData.line_items.map((item, index) => ({
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
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Select Customer</h2>
              <p className="text-gray-400">Choose an existing customer or create a new one</p>
            </div>

            {/* Selected Customer */}
            {formData.customer && (
              <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-cyan/30 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-flowtrade-cyan" />
                      <span className="font-medium text-white">{getCustomerName(formData.customer)}</span>
                    </div>
                    {formData.customer.email && (
                      <p className="text-gray-400 text-sm mt-1">{formData.customer.email}</p>
                    )}
                    {formData.customer.phone && (
                      <p className="text-gray-400 text-sm">{formData.customer.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, customer_id: null, customer: null }))}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Customer Search */}
            {!formData.customer && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search customers by name, company, or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  />
                  {searchingCustomers && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {customers.length > 0 && (
                  <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter overflow-hidden">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-flowtrade-navy-lighter transition-colors text-left border-b border-flowtrade-navy-lighter last:border-0"
                      >
                        <div className="w-10 h-10 bg-flowtrade-navy-lighter rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{getCustomerName(customer)}</p>
                          <p className="text-gray-400 text-sm">{customer.email || customer.phone || 'No contact info'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Create New Customer Button */}
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="flex items-center gap-2 px-4 py-3 w-full bg-flowtrade-navy border border-dashed border-flowtrade-navy-lighter rounded-lg text-gray-400 hover:text-white hover:border-flowtrade-cyan/50 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Create New Customer
                </button>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Job Details</h2>
              <p className="text-gray-400">Enter the job site address and description</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Job Site Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.job_site_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_site_address: e.target.value }))}
                    placeholder="Enter the job site address"
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Job Description *</label>
                <textarea
                  value={formData.job_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                  placeholder="Describe the scope of work..."
                  rows={5}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quote Valid Until</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Line Items</h2>
              <p className="text-gray-400">Add the items and services for this quote</p>
            </div>

            {/* Add Item Form */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                  <select
                    value={newItem.item_type}
                    onChange={(e) => setNewItem(prev => ({ ...prev, item_type: e.target.value as LineItem['item_type'] }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  >
                    {ITEM_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Item description"
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  >
                    {UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Line Total</label>
                  <div className="px-3 py-2 bg-flowtrade-navy-lighter rounded-lg text-white font-medium">
                    {formatCurrency(newItem.quantity * newItem.unit_price)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItem.is_optional}
                    onChange={(e) => setNewItem(prev => ({ ...prev, is_optional: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 text-flowtrade-cyan focus:ring-flowtrade-cyan bg-flowtrade-navy"
                  />
                  <span className="text-sm text-gray-400">Optional item</span>
                </label>

                <button
                  onClick={addLineItem}
                  disabled={!newItem.description}
                  className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>
            </div>

            {/* Line Items List */}
            {formData.line_items.length > 0 ? (
              <div className="bg-flowtrade-navy-light rounded-lg border border-flowtrade-navy-lighter overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-flowtrade-navy-lighter">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Description</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400">Qty</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400">Unit</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Price</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-400">Optional</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.line_items.map((item) => (
                      <tr key={item.id} className={`border-b border-flowtrade-navy-lighter ${item.is_optional ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-flowtrade-navy rounded text-gray-400 capitalize">
                              {item.item_type}
                            </span>
                            <span className="text-white">{item.description}</span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-3 text-gray-300">{item.quantity}</td>
                        <td className="text-center px-4 py-3 text-gray-300">{item.unit}</td>
                        <td className="text-right px-4 py-3 text-gray-300">{formatCurrency(item.unit_price)}</td>
                        <td className="text-right px-4 py-3 text-white font-medium">{formatCurrency(item.total)}</td>
                        <td className="text-center px-4 py-3">
                          <button
                            onClick={() => toggleOptional(item.id)}
                            className={`w-5 h-5 rounded border ${item.is_optional ? 'bg-flowtrade-cyan border-flowtrade-cyan' : 'border-gray-600'}`}
                          >
                            {item.is_optional && <Check className="h-4 w-4 text-flowtrade-navy" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No items added yet. Add your first line item above.</p>
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Pricing & Terms</h2>
              <p className="text-gray-400">Review pricing and set terms for this quote</p>
            </div>

            {/* Pricing Summary */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-6">
              <h3 className="text-lg font-medium text-white mb-4">Pricing Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>GST (10%)</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="border-t border-flowtrade-navy-lighter pt-3 flex justify-between text-white font-semibold text-lg">
                  <span>Total (inc. GST)</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Deposit Settings */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Deposit Required</h3>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, deposit_required: !prev.deposit_required }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.deposit_required ? 'bg-flowtrade-cyan' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.deposit_required ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {formData.deposit_required && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Deposit Type</label>
                    <select
                      value={formData.deposit_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, deposit_type: e.target.value as 'amount' | 'percentage' }))}
                      className="w-full px-4 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="amount">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {formData.deposit_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.deposit_type === 'percentage' ? 100 : undefined}
                      value={formData.deposit_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, deposit_value: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400">
                      Deposit amount: <span className="text-white font-medium">{formatCurrency(totals.deposit)}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Terms & Notes */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes for Customer (visible on quote)</label>
                <textarea
                  value={formData.customer_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_notes: e.target.value }))}
                  placeholder="Add any notes that should appear on the quote..."
                  rows={3}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Internal Notes (not visible to customer)</label>
                <textarea
                  value={formData.internal_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  placeholder="Add any internal notes for your team..."
                  rows={3}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Review Quote</h2>
              <p className="text-gray-400">Review your quote before saving</p>
            </div>

            {/* Customer Summary */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Customer</h3>
              <p className="text-white font-medium">{getCustomerName(formData.customer)}</p>
              {formData.customer?.email && <p className="text-gray-400 text-sm">{formData.customer.email}</p>}
            </div>

            {/* Job Summary */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Job Details</h3>
              <p className="text-white">{formData.job_site_address}</p>
              <p className="text-gray-400 text-sm mt-2">{formData.job_description}</p>
            </div>

            {/* Items Summary */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter overflow-hidden">
              <div className="px-4 py-3 border-b border-flowtrade-navy-lighter">
                <h3 className="text-sm font-medium text-gray-400">Line Items ({formData.line_items.length})</h3>
              </div>
              <div className="divide-y divide-flowtrade-navy-lighter">
                {formData.line_items.map((item) => (
                  <div key={item.id} className={`px-4 py-3 flex justify-between ${item.is_optional ? 'opacity-60' : ''}`}>
                    <div>
                      <span className="text-white">{item.description}</span>
                      {item.is_optional && <span className="text-xs text-gray-400 ml-2">(Optional)</span>}
                      <p className="text-gray-400 text-sm">
                        {item.quantity} {item.unit} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-flowtrade-navy rounded-lg border border-flowtrade-cyan/30 p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>GST (10%)</span>
                  <span>{formatCurrency(totals.tax)}</span>
                </div>
                <div className="border-t border-flowtrade-navy-lighter pt-2 flex justify-between text-white font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
                {formData.deposit_required && (
                  <div className="flex justify-between text-flowtrade-cyan">
                    <span>Deposit Required</span>
                    <span>{formatCurrency(totals.deposit)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Valid Until */}
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Valid until: {new Date(formData.valid_until).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/quotes')}
          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Quote</h1>
          <p className="text-gray-400 mt-1">Build a professional quote for your customer</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-flowtrade-cyan text-flowtrade-navy'
                        : isCurrent
                        ? 'bg-flowtrade-cyan/20 text-flowtrade-cyan border-2 border-flowtrade-cyan'
                        : 'bg-flowtrade-navy-lighter text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-2 ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-full h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-flowtrade-cyan' : 'bg-flowtrade-navy-lighter'
                    }`}
                    style={{ width: '60px' }}
                  />
                )}
              </div>
            )
          })}
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

      {/* Step Content */}
      <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6 mb-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {currentStep === 5 ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              Save as Draft
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className="flex items-center gap-2 px-6 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Creation Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-flowtrade-navy-lighter flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create New Customer</h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newCustomer.first_name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newCustomer.last_name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Street Address</label>
                <input
                  type="text"
                  value={newCustomer.street_address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, street_address: e.target.value }))}
                  className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Suburb</label>
                  <input
                    type="text"
                    value={newCustomer.suburb}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, suburb: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                  <select
                    value={newCustomer.state}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  >
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={newCustomer.postcode}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, postcode: e.target.value }))}
                    className="w-full px-3 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-flowtrade-navy-lighter flex justify-end gap-3">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={creatingCustomer || (!newCustomer.first_name && !newCustomer.company_name)}
                className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
              >
                {creatingCustomer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
