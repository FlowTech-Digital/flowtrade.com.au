'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  AlertCircle,
  MapPin,
  User,
  Building,
  Search,
  Plus,
  X,
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
  street_address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
}

type FormData = {
  customer_id: string | null
  customer: Customer | null
  job_site_address: string
  scheduled_date: string
  scheduled_time_start: string
  scheduled_time_end: string
  quoted_total: string
  assigned_to: string
  job_notes: string
}

export default function CreateJobPage() {
  const { user } = useAuth()
  const router = useRouter()
  
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
    scheduled_date: '',
    scheduled_time_start: '',
    scheduled_time_end: '',
    quoted_total: '',
    assigned_to: '',
    job_notes: '',
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

  // Search customers - FIXED: Now loads all customers when search is empty
  useEffect(() => {
    async function searchCustomers() {
      if (!orgId) {
        setCustomers([])
        return
      }

      // Skip 1-character searches - too short for meaningful results
      // But keep current results visible while typing
      if (customerSearch.length === 1) {
        return
      }

      setSearchingCustomers(true)
      const supabase = createClient()
      if (!supabase) {
        setSearchingCustomers(false)
        return
      }

      // Build query - either all customers or filtered by search term
      let query = supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, email, phone, street_address, suburb, state, postcode')
        .eq('org_id', orgId)
        .order('company_name', { ascending: true, nullsFirst: false })
        .limit(10)

      // Apply search filter only if search term has 2+ characters
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

  // Get customer display name
  const getCustomerName = (customer: Customer | null) => {
    if (!customer) return 'No customer selected'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Get customer address
  const getCustomerAddress = (customer: Customer) => {
    const parts = [
      customer.street_address,
      customer.suburb,
      customer.state,
      customer.postcode
    ].filter(Boolean)
    return parts.join(', ')
  }

  // Select customer
  const selectCustomer = (customer: Customer) => {
    const address = getCustomerAddress(customer)
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer: customer,
      job_site_address: prev.job_site_address || address
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

  // Validate form
  const isValid = () => {
    return formData.customer_id && formData.job_site_address
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Save job
  const handleSave = async () => {
    if (!orgId || !user || !isValid()) return
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

    // Create job (job_number generated by database trigger)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        org_id: orgId,
        customer_id: formData.customer_id,
        status: 'scheduled',
        scheduled_date: formData.scheduled_date || null,
        scheduled_time_start: formData.scheduled_time_start ? `${formData.scheduled_time_start}:00` : null,
        scheduled_time_end: formData.scheduled_time_end ? `${formData.scheduled_time_end}:00` : null,
        quoted_total: formData.quoted_total ? parseFloat(formData.quoted_total) : null,
        assigned_to: formData.assigned_to || null,
        job_notes: formData.job_notes || null,
      })
      .select()
      .single()

    if (jobError || !job) {
      setSaving(false)
      setError(jobError?.message || 'Failed to create job')
      return
    }

    // Log activity
    await supabase.from('job_activity_log').insert({
      job_id: job.id,
      user_id: userData.id,
      action: 'Job created',
      details: 'Job created manually',
      metadata: { created_by: userData.id }
    })

    setSaving(false)
    router.push(`/jobs/${job.id}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/jobs')}
          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Job</h1>
          <p className="text-gray-400 mt-1">Create a new job manually</p>
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

            {/* Selected Customer */}
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
            ) : (
              <div className="space-y-4">
                {/* Search Input */}
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

          {/* Job Site Address */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Job Site *</h3>
            </div>
            <input
              type="text"
              value={formData.job_site_address}
              onChange={(e) => setFormData(prev => ({ ...prev, job_site_address: e.target.value }))}
              placeholder="Enter job site address"
              className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
            />
            <p className="text-gray-500 text-sm mt-2">Auto-filled from customer address, edit if different</p>
          </div>

          {/* Scheduling */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Scheduling</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.scheduled_time_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time_start: e.target.value }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.scheduled_time_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time_end: e.target.value }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
            </div>
          </div>

          {/* Financial & Assignment */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Financial & Assignment</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quoted Total ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quoted_total}
                  onChange={(e) => setFormData(prev => ({ ...prev, quoted_total: e.target.value }))}
                  placeholder="Enter quoted amount"
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Assigned To</label>
                <input
                  type="text"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  placeholder="Team member name"
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
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
              value={formData.job_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, job_notes: e.target.value }))}
              placeholder="Add notes about this job..."
              rows={4}
              className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Job Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-blue-400 font-medium">Scheduled</span>
              </div>
              {formData.scheduled_date && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">
                    {new Date(formData.scheduled_date + 'T00:00:00').toLocaleDateString('en-AU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>
              )}
              {formData.quoted_total && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Quoted</span>
                  <span className="text-white font-medium">
                    {formatCurrency(parseFloat(formData.quoted_total))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tip Card */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-cyan/20 p-6">
            <h3 className="text-sm font-medium text-flowtrade-cyan mb-2">💡 Tip</h3>
            <p className="text-gray-400 text-sm">
              Creating a job from an accepted quote automatically links the customer, site address, and quoted amount.
            </p>
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
            Create Job
          </button>

          <button
            onClick={() => router.push('/jobs')}
            className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
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
