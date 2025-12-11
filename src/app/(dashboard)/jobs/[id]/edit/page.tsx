'use client'

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
  MapPin,
  User,
  Building
} from 'lucide-react'

// Types
type Job = {
  id: string
  job_number: string
  status: 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'invoiced'
  customer_id: string
  property_id: string | null
  quote_id: string | null
  scheduled_date: string | null
  scheduled_time_start: string | null
  scheduled_time_end: string | null
  actual_start: string | null
  actual_end: string | null
  quoted_total: number
  actual_total: number | null
  invoice_number: string | null
  invoiced_at: string | null
  paid_at: string | null
  payment_method: string | null
  job_notes: string | null
  completion_notes: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    street_address: string | null
    suburb: string | null
    state: string | null
    postcode: string | null
  } | null
  quote: {
    id: string
    quote_number: string
    job_site_address: string | null
  } | null
  property: {
    id: string
    address_line1: string | null
    suburb: string | null
    state: string | null
    postcode: string | null
  } | null
}

type FormData = {
  status: Job['status']
  scheduled_date: string
  scheduled_time_start: string
  scheduled_time_end: string
  actual_total: string
  invoice_number: string
  payment_method: string
  job_notes: string
  completion_notes: string
}

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'invoiced', label: 'Invoiced' },
]

const PAYMENT_METHODS = [
  { value: '', label: 'Select payment method' },
  { value: 'cash', label: 'Cash' },
  { value: 'eftpos', label: 'EFTPOS' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cheque', label: 'Cheque' },
]

export default function EditJobPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    status: 'scheduled',
    scheduled_date: '',
    scheduled_time_start: '',
    scheduled_time_end: '',
    actual_total: '',
    invoice_number: '',
    payment_method: '',
    job_notes: '',
    completion_notes: '',
  })

  // Load job data
  useEffect(() => {
    async function loadJob() {
      if (!user || !jobId) return

      const supabase = createClient()
      if (!supabase) {
        setError('Failed to connect to database')
        setLoading(false)
        return
      }

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(
            id, first_name, last_name, company_name,
            street_address, suburb, state, postcode
          ),
          quote:quotes(
            id, quote_number, job_site_address
          ),
          property:customer_properties(
            id, address_line1, suburb, state, postcode
          )
        `)
        .eq('id', jobId)
        .single()

      if (jobError || !jobData) {
        setError(jobError?.message || 'Job not found')
        setLoading(false)
        return
      }

      setJob(jobData)

      // Populate form
      setFormData({
        status: jobData.status || 'scheduled',
        scheduled_date: jobData.scheduled_date || '',
        scheduled_time_start: jobData.scheduled_time_start?.slice(0, 5) || '',
        scheduled_time_end: jobData.scheduled_time_end?.slice(0, 5) || '',
        actual_total: jobData.actual_total?.toString() || '',
        invoice_number: jobData.invoice_number || '',
        payment_method: jobData.payment_method || '',
        job_notes: jobData.job_notes || '',
        completion_notes: jobData.completion_notes || '',
      })

      setLoading(false)
    }

    loadJob()
  }, [user, jobId])

  // Get customer name
  const getCustomerName = () => {
    if (!job?.customer) return 'Unknown Customer'
    if (job.customer.company_name) return job.customer.company_name
    return `${job.customer.first_name || ''} ${job.customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Get job site address
  const getJobSiteAddress = () => {
    if (job?.property) {
      const parts = [
        job.property.address_line1,
        job.property.suburb,
        job.property.state,
        job.property.postcode
      ].filter(Boolean)
      if (parts.length > 0) return parts.join(', ')
    }
    if (job?.quote?.job_site_address) {
      return job.quote.job_site_address
    }
    if (job?.customer) {
      const parts = [
        job.customer.street_address,
        job.customer.suburb,
        job.customer.state,
        job.customer.postcode
      ].filter(Boolean)
      if (parts.length > 0) return parts.join(', ')
    }
    return 'No address specified'
  }

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Handle save
  const handleSave = async () => {
    if (!job || !user) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setSaving(false)
      return
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: formData.status,
      scheduled_date: formData.scheduled_date || null,
      scheduled_time_start: formData.scheduled_time_start ? `${formData.scheduled_time_start}:00` : null,
      scheduled_time_end: formData.scheduled_time_end ? `${formData.scheduled_time_end}:00` : null,
      actual_total: formData.actual_total ? parseFloat(formData.actual_total) : null,
      invoice_number: formData.invoice_number || null,
      payment_method: formData.payment_method || null,
      job_notes: formData.job_notes || null,
      completion_notes: formData.completion_notes || null,
      updated_at: new Date().toISOString(),
    }

    // Auto-set timestamps based on status changes
    if (formData.status === 'completed' && job.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
      if (!job.actual_end) {
        updateData.actual_end = new Date().toISOString()
      }
    }
    if (formData.status === 'in_progress' && job.status === 'scheduled') {
      if (!job.actual_start) {
        updateData.actual_start = new Date().toISOString()
      }
    }
    if (formData.status === 'invoiced' && job.status !== 'invoiced') {
      updateData.invoiced_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    // Log activity
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userData) {
      await supabase.from('job_activity_log').insert({
        job_id: jobId,
        user_id: userData.id,
        action: 'Job updated',
        details: formData.status !== job.status 
          ? `Status changed from ${job.status} to ${formData.status}`
          : 'Job details updated',
        metadata: { previous_status: job.status, new_status: formData.status }
      })
    }

    setSaving(false)
    router.push(`/jobs/${jobId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-flowtrade-cyan animate-spin" />
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push('/jobs')}
          className="text-flowtrade-cyan hover:underline"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  if (!job) return null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Job</h1>
          <p className="text-gray-400 mt-1">{job.job_number}</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-lg font-medium text-white mb-4">Status</h3>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Job['status'] }))}
              className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
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

          {/* Financial */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Financial</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quoted Total</label>
                <div className="px-4 py-2 bg-flowtrade-navy-lighter rounded-lg text-gray-400">
                  {formatCurrency(job.quoted_total)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Actual Total ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.actual_total}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_total: e.target.value }))}
                  placeholder="Enter actual total"
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-flowtrade-cyan" />
              <h3 className="text-lg font-medium text-white">Invoice</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Invoice Number</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="e.g., INV-001"
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-lg font-medium text-white mb-4">Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Job Notes</label>
                <textarea
                  value={formData.job_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_notes: e.target.value }))}
                  placeholder="Notes about the job..."
                  rows={3}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Completion Notes</label>
                <textarea
                  value={formData.completion_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, completion_notes: e.target.value }))}
                  placeholder="Notes after job completion..."
                  rows={3}
                  className="w-full px-4 py-3 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Customer</h3>
            <div className="flex items-center gap-2 mb-2">
              {job.customer?.company_name ? (
                <Building className="h-5 w-5 text-flowtrade-cyan" />
              ) : (
                <User className="h-5 w-5 text-flowtrade-cyan" />
              )}
              <span className="text-white font-medium">{getCustomerName()}</span>
            </div>
          </div>

          {/* Job Site */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Job Site</h3>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-flowtrade-cyan mt-0.5" />
              <span className="text-white">{getJobSiteAddress()}</span>
            </div>
          </div>

          {/* Source Quote */}
          {job.quote && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Source Quote</h3>
              <button
                onClick={() => router.push(`/quotes/${job.quote!.id}`)}
                className="flex items-center gap-2 text-flowtrade-cyan hover:text-flowtrade-cyan/80"
              >
                <FileText className="h-4 w-4" />
                {job.quote.quote_number}
              </button>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Save Changes
          </button>

          <button
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
