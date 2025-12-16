'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Pencil,
  Loader2,
  CheckCircle,
  XCircle,
  Calendar,
  Wrench,
  Pause,
  FileText,
  ArrowRight
} from 'lucide-react'

type Job = {
  id: string
  job_number: string
  status: string
  quoted_total: number
  actual_total: number | null
  scheduled_date: string | null
  created_at: string
  completed_at: string | null
  job_notes: string | null
  customer: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
  } | null
  quote: {
    id: string
    quote_number: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-900/30', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-900/30', icon: Wrench },
  on_hold: { label: 'On Hold', color: 'text-orange-400', bg: 'bg-orange-900/30', icon: Pause },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/30', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-900/30', icon: XCircle },
  invoiced: { label: 'Invoiced', color: 'text-purple-400', bg: 'bg-purple-900/30', icon: FileText },
}

export default function JobsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchJobs() {
      if (!user) return

      const supabase = createClient()
      if (!supabase) {
        setLoading(false)
        return
      }

      // Get user's org_id first
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

      // Fetch jobs with customer and quote info
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          status,
          quoted_total,
          actual_total,
          scheduled_date,
          created_at,
          completed_at,
          job_notes,
          customer:customers(
            id,
            first_name,
            last_name,
            company_name
          ),
          quote:quotes(
            id,
            quote_number
          )
        `)
        .eq('org_id', userData.org_id)
        .order('created_at', { ascending: false })

      if (jobsError) {
        console.error('Failed to fetch jobs:', jobsError)
      } else {
        setJobs(jobsData || [])
      }

      setLoading(false)
    }

    fetchJobs()
  }, [user])

  // Filter jobs based on search and status
  const filteredJobs = jobs.filter(job => {
    const customerName = job.customer 
      ? `${job.customer.first_name || ''} ${job.customer.last_name || ''} ${job.customer.company_name || ''}`
      : ''
    
    const matchesSearch = searchTerm === '' || 
      job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.job_notes && job.job_notes.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Get customer display name
  const getCustomerName = (customer: Job['customer']) => {
    if (!customer) return 'No Customer'
    if (customer.company_name) return customer.company_name
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['scheduled']
    if (!config) return null
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border border-current/20`}>
        <Icon className="h-3 w-3" />
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-flowtrade-navy-lighter">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-gray-400 mt-1">Track and manage your active jobs</p>
        </div>
        <button
          onClick={() => router.push('/jobs/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-card"
        >
          <Plus className="h-5 w-5" />
          New Job
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent cursor-pointer min-w-[160px]"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        // Empty State
        <div className="bg-flowtrade-navy-light rounded-xl border-2 border-dashed border-flowtrade-navy-lighter p-12 text-center">
          <div className="w-16 h-16 bg-flowtrade-navy-lighter rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {jobs.length === 0 ? 'No jobs yet' : 'No matching jobs'}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {jobs.length === 0 
              ? 'Create your first job manually or convert an accepted quote to get started.'
              : 'Try adjusting your search or filter to find what you\'re looking for.'
            }
          </p>
          {jobs.length === 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push('/jobs/new')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Job
              </button>
              <button
                onClick={() => router.push('/quotes')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-flowtrade-navy-lighter text-white font-medium rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors border border-flowtrade-navy-border"
              >
                <ArrowRight className="h-5 w-5" />
                View Quotes
              </button>
            </div>
          )}
        </div>
      ) : (
        // Jobs Table
        <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-flowtrade-navy-dark/50 border-b-2 border-flowtrade-navy-lighter">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Job #</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quoted</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quote #</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flowtrade-navy-lighter">
                {filteredJobs.map((job, index) => (
                  <tr 
                    key={job.id} 
                    className={`
                      hover:bg-flowtrade-navy-hover transition-colors cursor-pointer
                      ${index % 2 === 0 ? 'bg-flowtrade-navy-light' : 'bg-flowtrade-navy-dark/30'}
                    `}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-semibold">{job.job_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">{getCustomerName(job.customer)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-semibold">{formatCurrency(job.quoted_total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400">{formatDate(job.scheduled_date)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {job.quote ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/quotes/${job.quote!.id}`)
                          }}
                          className="text-flowtrade-cyan hover:text-flowtrade-cyan/80 text-sm font-medium transition-colors"
                        >
                          {job.quote.quote_number}
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 bg-flowtrade-navy/50 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/jobs/${job.id}`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-md transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/jobs/${job.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {jobs.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 px-2">
          <span>
            Showing {filteredJobs.length} of {jobs.length} jobs
          </span>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-flowtrade-cyan hover:text-flowtrade-cyan-light transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}
