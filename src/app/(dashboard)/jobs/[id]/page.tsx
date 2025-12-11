'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Building,
  Phone,
  Mail,
  Loader2,
  MoreVertical,
  Calendar,
  Wrench,
  Pause,
  FileText,
  AlertCircle,
  Play,
  CircleCheck,
  Receipt,
  FilePlus,
  Ban
} from 'lucide-react'

// Types
type JobStatus = 'pending' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'invoiced'

type Job = {
  id: string
  job_number: string
  status: JobStatus
  quote_id: string | null
  customer_id: string
  property_id: string | null
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
  created_at: string
  updated_at: string
  completed_at: string | null
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
  } | null
  quote: {
    id: string
    quote_number: string
    job_site_address: string | null
    job_description: string | null
  } | null
  property: {
    id: string
    address_line1: string | null
    suburb: string | null
    state: string | null
    postcode: string | null
  } | null
}

type JobActivity = {
  id: string
  action: string
  details: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user: {
    first_name: string | null
    last_name: string | null
  } | null
}

// Status configuration with workflow order
const STATUS_CONFIG: Record<JobStatus, { 
  label: string
  icon: typeof Clock
  color: string
  bgColor: string
  order: number
}> = {
  pending: { 
    label: 'Pending', 
    icon: Clock, 
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
    order: 0
  },
  scheduled: { 
    label: 'Scheduled', 
    icon: Calendar, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    order: 1
  },
  in_progress: { 
    label: 'In Progress', 
    icon: Wrench, 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20 border-amber-500/30',
    order: 2
  },
  on_hold: { 
    label: 'On Hold', 
    icon: Pause, 
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    order: 2.5  // Same level as in_progress
  },
  completed: { 
    label: 'Completed', 
    icon: CheckCircle, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
    order: 3
  },
  invoiced: { 
    label: 'Invoiced', 
    icon: FileText, 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    order: 4
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: XCircle, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 border-red-500/30',
    order: -1  // Terminal state
  },
}

// Valid status transitions
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['on_hold', 'completed', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: ['invoiced'],
  invoiced: [],  // Terminal state
  cancelled: [],  // Terminal state
}

// Main workflow steps (excluding on_hold and cancelled which are side branches)
const WORKFLOW_STEPS: JobStatus[] = ['pending', 'scheduled', 'in_progress', 'completed', 'invoiced']

// Status Workflow Stepper Component
function StatusWorkflow({ currentStatus, onStatusChange, isLoading }: {
  currentStatus: JobStatus
  onStatusChange: (status: JobStatus) => void
  isLoading: string | null
}) {
  const validNextSteps = VALID_TRANSITIONS[currentStatus] || []
  const isTerminal = validNextSteps.length === 0
  const currentOrder = STATUS_CONFIG[currentStatus]?.order ?? 0

  // Get the primary next action (first valid transition that's in the main workflow)
  const primaryNextAction = validNextSteps.find(s => WORKFLOW_STEPS.includes(s))

  return (
    <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
      <h3 className="text-lg font-medium text-white mb-4">Job Status</h3>
      
      {/* Current Status Badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-medium border ${STATUS_CONFIG[currentStatus]?.bgColor || ''} ${STATUS_CONFIG[currentStatus]?.color || ''}`}>
          {(() => {
            const StatusIcon = STATUS_CONFIG[currentStatus]?.icon || Clock
            return <StatusIcon className="h-5 w-5" />
          })()}
          {STATUS_CONFIG[currentStatus]?.label || currentStatus}
        </span>
        {isTerminal && (
          <span className="text-gray-500 text-sm">(Final Status)</span>
        )}
      </div>

      {/* Workflow Stepper */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, index) => {
            const stepConfig = STATUS_CONFIG[step]
            const StepIcon = stepConfig.icon
            const isCurrentStep = step === currentStatus || 
              (currentStatus === 'on_hold' && step === 'in_progress')
            const isCompletedStep = stepConfig.order < currentOrder && currentStatus !== 'cancelled'
            const isCancelled = currentStatus === 'cancelled'

            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                {/* Step Circle */}
                <div className={`
                  relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${isCancelled ? 'border-red-500/50 bg-red-500/10' :
                    isCurrentStep ? `border-current ${stepConfig.color} ${stepConfig.bgColor}` :
                    isCompletedStep ? 'border-green-500 bg-green-500/20' :
                    'border-gray-600 bg-flowtrade-navy'}
                `}>
                  {isCancelled ? (
                    <Ban className="h-5 w-5 text-red-400" />
                  ) : isCompletedStep ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <StepIcon className={`h-5 w-5 ${isCurrentStep ? stepConfig.color : 'text-gray-500'}`} />
                  )}
                </div>

                {/* Connector Line */}
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className={`
                    flex-1 h-0.5 mx-2
                    ${isCancelled ? 'bg-red-500/30' :
                      isCompletedStep ? 'bg-green-500/50' : 'bg-gray-700'}
                  `} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between mt-2">
          {WORKFLOW_STEPS.map((step, index) => {
            const stepConfig = STATUS_CONFIG[step]
            const isCurrentStep = step === currentStatus || 
              (currentStatus === 'on_hold' && step === 'in_progress')
            const isCompletedStep = stepConfig.order < currentOrder && currentStatus !== 'cancelled'

            return (
              <div key={step} className={`
                text-xs text-center flex-1 last:flex-none
                ${isCurrentStep ? stepConfig.color : isCompletedStep ? 'text-green-400' : 'text-gray-500'}
              `} style={{ minWidth: index === WORKFLOW_STEPS.length - 1 ? '60px' : undefined }}>
                {stepConfig.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* On Hold Indicator */}
      {currentStatus === 'on_hold' && (
        <div className="mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
          <div className="flex items-center gap-2 text-orange-400">
            <Pause className="h-4 w-4" />
            <span className="text-sm font-medium">Job is currently on hold</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-2">Available Actions:</p>
          
          {/* Primary Action - Prominent */}
          {primaryNextAction && (
            <button
              onClick={() => onStatusChange(primaryNextAction)}
              disabled={!!isLoading}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                ${primaryNextAction === 'in_progress' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                  primaryNextAction === 'scheduled' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                  primaryNextAction === 'completed' ? 'bg-green-500 hover:bg-green-600 text-white' :
                  primaryNextAction === 'invoiced' ? 'bg-purple-500 hover:bg-purple-600 text-white' :
                  'bg-flowtrade-cyan hover:bg-flowtrade-cyan/90 text-flowtrade-navy'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading === primaryNextAction ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {primaryNextAction === 'scheduled' && <Calendar className="h-5 w-5" />}
                  {primaryNextAction === 'in_progress' && <Play className="h-5 w-5" />}
                  {primaryNextAction === 'completed' && <CircleCheck className="h-5 w-5" />}
                  {primaryNextAction === 'invoiced' && <Receipt className="h-5 w-5" />}
                </>
              )}
              {primaryNextAction === 'scheduled' && 'Schedule Job'}
              {primaryNextAction === 'in_progress' && 'Start Job'}
              {primaryNextAction === 'completed' && 'Complete Job'}
              {primaryNextAction === 'invoiced' && 'Mark as Invoiced'}
            </button>
          )}

          {/* Secondary Actions */}
          <div className="flex gap-2">
            {/* On Hold / Resume */}
            {currentStatus === 'in_progress' && (
              <button
                onClick={() => onStatusChange('on_hold')}
                disabled={!!isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-50"
              >
                {isLoading === 'on_hold' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
                Put On Hold
              </button>
            )}
            
            {currentStatus === 'on_hold' && (
              <button
                onClick={() => onStatusChange('in_progress')}
                disabled={!!isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-all disabled:opacity-50"
              >
                {isLoading === 'in_progress' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Resume Job
              </button>
            )}

            {/* Cancel - Always available except for terminal states */}
            {validNextSteps.includes('cancelled') && (
              <button
                onClick={() => onStatusChange('cancelled')}
                disabled={!!isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
              >
                {isLoading === 'cancelled' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Cancel Job
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal State Message */}
      {isTerminal && (
        <div className={`p-3 rounded-lg ${currentStatus === 'cancelled' ? 'bg-red-500/10 border border-red-500/30' : 'bg-purple-500/10 border border-purple-500/30'}`}>
          <p className={`text-sm ${currentStatus === 'cancelled' ? 'text-red-400' : 'text-purple-400'}`}>
            {currentStatus === 'cancelled' 
              ? 'This job has been cancelled. No further status changes are available.'
              : 'This job has been invoiced. The workflow is complete.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function JobDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [activities, setActivities] = useState<JobActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  // Fetch job data
  useEffect(() => {
    async function fetchJob() {
      if (!user || !jobId) return

      const supabase = createClient()
      if (!supabase) {
        setError('Failed to connect to database')
        setLoading(false)
        return
      }

      // Fetch job with customer, quote, and property
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(
            id, first_name, last_name, company_name,
            email, phone, street_address, suburb, state, postcode
          ),
          quote:quotes(
            id, quote_number, job_site_address, job_description
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

      // Fetch activity log
      const { data: activityData } = await supabase
        .from('job_activity_log')
        .select(`
          id, action, details, metadata, created_at,
          user:users(first_name, last_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(20)

      setActivities(activityData || [])
      setLoading(false)
    }

    fetchJob()
  }, [user, jobId])

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '\u2014'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '\u2014'
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format time - FIXED: Safe array destructuring with fallbacks
  const formatTime = (timeString: string | null) => {
    if (!timeString) return null
    // timeString is in HH:MM:SS format
    const parts = timeString.split(':')
    const hours = parts[0] || '0'
    const minutes = parts[1] || '00'
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Format datetime
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '\u2014'
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
    if (!job?.customer) return 'Unknown Customer'
    if (job.customer.company_name) return job.customer.company_name
    return `${job.customer.first_name || ''} ${job.customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Get job site address
  const getJobSiteAddress = () => {
    // First check property
    if (job?.property) {
      const parts = [
        job.property.address_line1,
        job.property.suburb,
        job.property.state,
        job.property.postcode
      ].filter(Boolean)
      if (parts.length > 0) return parts.join(', ')
    }
    // Then check quote
    if (job?.quote?.job_site_address) {
      return job.quote.job_site_address
    }
    // Fallback to customer address
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

  // Generate invoice from job
  const generateInvoice = async () => {
    if (!job) return
    setGeneratingInvoice(true)
    setShowActionsMenu(false)

    try {
      const response = await fetch('/api/invoices/from-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409 && data.existing_invoice_id) {
          // Invoice already exists, navigate to it
          router.push(`/invoices/${data.existing_invoice_id}`)
          return
        }
        throw new Error(data.error || 'Failed to generate invoice')
      }

      setSuccessMessage(`Invoice ${data.invoice.invoice_number} generated successfully!`)
      setTimeout(() => {
        router.push(`/invoices/${data.invoice.id}`)
      }, 1500)
    } catch (error) {
      console.error('Error generating invoice:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate invoice')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  // Update job status with validation
  const updateStatus = async (newStatus: JobStatus) => {
    if (!job) return
    
    // Validate transition
    const validTransitions = VALID_TRANSITIONS[job.status] || []
    if (!validTransitions.includes(newStatus)) {
      setError(`Cannot transition from ${STATUS_CONFIG[job.status]?.label} to ${STATUS_CONFIG[newStatus]?.label}`)
      return
    }

    setActionLoading(newStatus)
    setShowActionsMenu(false)

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setActionLoading(null)
      return
    }

    const updateData: Record<string, unknown> = { status: newStatus }
    
    // Add timestamps based on status
    if (newStatus === 'in_progress' && !job.actual_start) {
      updateData.actual_start = new Date().toISOString()
    }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
      if (!job.actual_end) {
        updateData.actual_end = new Date().toISOString()
      }
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)

    if (updateError) {
      setError(updateError.message)
      setActionLoading(null)
      return
    }

    // Log activity
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user?.id)
      .single()

    if (userData) {
      await supabase.from('job_activity_log').insert({
        job_id: jobId,
        user_id: userData.id,
        action: `Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`,
        details: `Previous status: ${STATUS_CONFIG[job.status]?.label || job.status}`,
        metadata: { previous_status: job.status, new_status: newStatus }
      })
    }

    // Refresh activities
    const { data: activityData } = await supabase
      .from('job_activity_log')
      .select(`
        id, action, details, metadata, created_at,
        user:users(first_name, last_name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(20)

    setActivities(activityData || [])

    // Update local state
    setJob({ ...job, status: newStatus, ...updateData } as Job)
    setSuccessMessage(`Job status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
    setTimeout(() => setSuccessMessage(null), 3000)
    setActionLoading(null)
  }

  // Delete job
  const deleteJob = async () => {
    if (!job) return
    setActionLoading('delete')

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setActionLoading(null)
      return
    }

    // Delete activity log first
    await supabase.from('job_activity_log').delete().eq('job_id', jobId)
    
    // Delete materials used
    await supabase.from('job_materials_used').delete().eq('job_id', jobId)
    
    // Delete photos
    await supabase.from('job_photos').delete().eq('job_id', jobId)

    // Delete job
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      setError(deleteError.message)
      setActionLoading(null)
      return
    }

    router.push('/jobs')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-flowtrade-cyan animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error || 'Job not found'}</p>
        <button
          onClick={() => router.push('/jobs')}
          className="text-flowtrade-cyan hover:underline"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  const StatusIcon = STATUS_CONFIG[job.status]?.icon || Clock
  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending

  return (
    <div>
      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle className="h-5 w-5" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 text-green-400 hover:text-green-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/jobs')}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{job.job_number}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-gray-400 mt-1">
              Created {formatDateTime(job.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {job.status !== 'completed' && job.status !== 'cancelled' && job.status !== 'invoiced' && (
            <button
              onClick={() => router.push(`/jobs/${jobId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-white rounded-lg hover:bg-flowtrade-navy transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}

          {/* Generate Invoice Button - for completed jobs */}
          {job.status === 'completed' && (
            <button
              onClick={generateInvoice}
              disabled={generatingInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {generatingInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus className="h-4 w-4" />
              )}
              Generate Invoice
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
                  {job.quote && (
                    <button
                      onClick={() => router.push(`/quotes/${job.quote!.id}`)}
                      className="w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Quote
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/invoices')}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                  >
                    <Receipt className="h-4 w-4" />
                    View Invoices
                  </button>
                  <div className="border-t border-flowtrade-navy-lighter my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowDeleteModal(true)
                    }}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-flowtrade-navy-lighter flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Job
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
          {/* Status Workflow - NEW COMPONENT */}
          <StatusWorkflow
            currentStatus={job.status}
            onStatusChange={updateStatus}
            isLoading={actionLoading}
          />

          {/* Customer & Job Site */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Customer</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {job.customer?.company_name ? (
                      <Building className="h-5 w-5 text-flowtrade-cyan" />
                    ) : (
                      <User className="h-5 w-5 text-flowtrade-cyan" />
                    )}
                    <span className="text-white font-medium">{getCustomerName()}</span>
                  </div>
                  {job.customer?.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${job.customer.email}`} className="hover:text-white">
                        {job.customer.email}
                      </a>
                    </div>
                  )}
                  {job.customer?.phone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${job.customer.phone}`} className="hover:text-white">
                        {job.customer.phone}
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
                  <span className="text-white">{getJobSiteAddress()}</span>
                </div>
              </div>
            </div>

            {/* Job Description */}
            {job.quote?.job_description && (
              <div className="mt-6 pt-6 border-t border-flowtrade-navy-lighter">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Job Description</h3>
                <p className="text-white whitespace-pre-wrap">{job.quote.job_description}</p>
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-lg font-medium text-white mb-4">Scheduling</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Scheduled Date</p>
                <p className="text-white font-medium">{formatDate(job.scheduled_date)}</p>
              </div>
              {(job.scheduled_time_start || job.scheduled_time_end) && (
                <div>
                  <p className="text-sm text-gray-400">Scheduled Time</p>
                  <p className="text-white font-medium">
                    {formatTime(job.scheduled_time_start)}
                    {job.scheduled_time_end && ` - ${formatTime(job.scheduled_time_end)}`}
                  </p>
                </div>
              )}
              {job.actual_start && (
                <div>
                  <p className="text-sm text-gray-400">Actual Start</p>
                  <p className="text-white font-medium">{formatDateTime(job.actual_start)}</p>
                </div>
              )}
              {job.actual_end && (
                <div>
                  <p className="text-sm text-gray-400">Actual End</p>
                  <p className="text-white font-medium">{formatDateTime(job.actual_end)}</p>
                </div>
              )}
              {job.completed_at && (
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-green-400 font-medium">{formatDateTime(job.completed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(job.job_notes || job.completion_notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.job_notes && (
                <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Job Notes</h3>
                  <p className="text-white whitespace-pre-wrap">{job.job_notes}</p>
                </div>
              )}
              {job.completion_notes && (
                <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Completion Notes</h3>
                  <p className="text-white whitespace-pre-wrap">{job.completion_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-cyan/30 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Financial</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-300">
                <span>Quoted Total</span>
                <span>{formatCurrency(job.quoted_total)}</span>
              </div>
              {job.actual_total !== null && (
                <div className="flex justify-between text-gray-300">
                  <span>Actual Total</span>
                  <span className={job.actual_total > job.quoted_total ? 'text-red-400' : 'text-green-400'}>
                    {formatCurrency(job.actual_total)}
                  </span>
                </div>
              )}
              {job.actual_total !== null && job.actual_total !== job.quoted_total && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Variance</span>
                  <span className={job.actual_total > job.quoted_total ? 'text-red-400' : 'text-green-400'}>
                    {job.actual_total > job.quoted_total ? '+' : ''}
                    {formatCurrency(job.actual_total - job.quoted_total)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          {(job.invoice_number || job.invoiced_at || job.paid_at) && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h3 className="text-lg font-medium text-white mb-4">Invoice</h3>
              <div className="space-y-3">
                {job.invoice_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Invoice #</span>
                    <span className="text-white">{job.invoice_number}</span>
                  </div>
                )}
                {job.invoiced_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Invoiced</span>
                    <span className="text-white">{formatDate(job.invoiced_at)}</span>
                  </div>
                )}
                {job.paid_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Paid</span>
                    <span className="text-green-400">{formatDate(job.paid_at)}</span>
                  </div>
                )}
                {job.payment_method && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Method</span>
                    <span className="text-white capitalize">{job.payment_method}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quote Link */}
          {job.quote && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h3 className="text-lg font-medium text-white mb-4">Source Quote</h3>
              <button
                onClick={() => router.push(`/quotes/${job.quote!.id}`)}
                className="flex items-center gap-2 text-flowtrade-cyan hover:text-flowtrade-cyan/80"
              >
                <FileText className="h-4 w-4" />
                {job.quote.quote_number}
              </button>
            </div>
          )}

          {/* Activity Log */}
          {activities.length > 0 && (
            <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
              <h3 className="text-lg font-medium text-white mb-4">Activity</h3>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-flowtrade-cyan" />
                    <div>
                      <p className="text-white text-sm">{activity.action}</p>
                      {activity.details && (
                        <p className="text-gray-500 text-xs">{activity.details}</p>
                      )}
                      <p className="text-gray-500 text-xs">
                        {formatDateTime(activity.created_at)}
                        {activity.user && ` by ${activity.user.first_name || ''} ${activity.user.last_name || ''}`.trim()}
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
                <h3 className="text-lg font-semibold text-white">Delete Job</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete job <strong>{job.job_number}</strong>? 
              This will also delete all activity logs, materials, and photos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteJob}
                disabled={actionLoading === 'delete'}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
