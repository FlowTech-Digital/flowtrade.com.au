'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  DollarSign
} from 'lucide-react'
import CustomerModal from '@/components/customers/CustomerModal'
import type { Customer, CustomerFormData } from '@/types/customer'

// Quote type for customer's quotes
type Quote = {
  id: string
  quote_number: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
  total: number
  created_at: string
  valid_until: string
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: Clock, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  sent: { label: 'Sent', icon: Send, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  viewed: { label: 'Viewed', icon: Eye, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  declined: { label: 'Declined', icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export default function CustomerDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch customer and their quotes
  useEffect(() => {
    async function fetchData() {
      if (!user || !customerId) return

      const supabase = createClient()
      if (!supabase) {
        setError('Failed to connect to database')
        setLoading(false)
        return
      }

      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (customerError || !customerData) {
        setError(customerError?.message || 'Customer not found')
        setLoading(false)
        return
      }

      setCustomer(customerData)

      // Fetch customer's quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('id, quote_number, status, total, created_at, valid_until')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      setQuotes(quotesData || [])
      setLoading(false)
    }

    fetchData()
  }, [user, customerId])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Calculate revenue summary
  const getRevenueSummary = () => {
    const totalQuoted = quotes.reduce((sum, q) => sum + q.total, 0)
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted')
    const acceptedRevenue = acceptedQuotes.reduce((sum, q) => sum + q.total, 0)
    const pendingQuotes = quotes.filter(q => ['draft', 'sent', 'viewed'].includes(q.status))
    const pendingRevenue = pendingQuotes.reduce((sum, q) => sum + q.total, 0)
    
    return {
      totalQuoted,
      acceptedRevenue,
      pendingRevenue,
      quoteCount: quotes.length,
      acceptedCount: acceptedQuotes.length
    }
  }

  // Format address
  const formatAddress = () => {
    if (!customer) return null
    const parts = [
      customer.address_line1,
      customer.address_line2,
      customer.suburb,
      customer.state,
      customer.postcode
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : null
  }

  // Handle save customer (edit)
  const handleSaveCustomer = async (formData: CustomerFormData) => {
    if (!customer) return
    setIsSaving(true)

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setIsSaving(false)
      return
    }

    const cleanData = {
      business_name: formData.business_name,
      contact_name: formData.contact_name,
      email: formData.email || null,
      phone: formData.phone || null,
      address_line1: formData.address_line1 || null,
      address_line2: formData.address_line2 || null,
      suburb: formData.suburb || null,
      state: formData.state || null,
      postcode: formData.postcode || null,
      country: formData.country || 'Australia',
      abn: formData.abn.replace(/\s/g, '') || null,
      notes: formData.notes || null,
    }

    const { data, error: updateError } = await supabase
      .from('customers')
      .update(cleanData)
      .eq('id', customer.id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setCustomer(data)
    setIsEditModalOpen(false)
    setIsSaving(false)
  }

  // Handle delete customer
  const handleDeleteCustomer = async () => {
    if (!customer) return
    setIsDeleting(true)

    const supabase = createClient()
    if (!supabase) {
      setError('Failed to connect to database')
      setIsDeleting(false)
      return
    }

    // Soft delete (archive)
    const { error: deleteError } = await supabase
      .from('customers')
      .update({ status: 'archived' })
      .eq('id', customer.id)

    if (deleteError) {
      setError(deleteError.message)
      setIsDeleting(false)
      return
    }

    router.push('/customers')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-flowtrade-cyan animate-spin" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error || 'Customer not found'}</p>
        <button
          onClick={() => router.push('/customers')}
          className="text-flowtrade-cyan hover:underline"
        >
          Back to Customers
        </button>
      </div>
    )
  }

  const revenue = getRevenueSummary()
  const address = formatAddress()

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/customers')}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-flowtrade-cyan/20 rounded-full flex items-center justify-center">
                <Building className="h-6 w-6 text-flowtrade-cyan" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{customer.business_name}</h1>
                <p className="text-gray-400">{customer.contact_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/quotes/new?customer=${customer.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Quote
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-flowtrade-navy-lighter text-white rounded-lg hover:bg-flowtrade-navy transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-lg font-medium text-white mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-flowtrade-cyan" />
                  <div>
                    <p className="text-xs text-gray-500">Contact Name</p>
                    <p className="text-white">{customer.contact_name}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-flowtrade-cyan" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <a href={`mailto:${customer.email}`} className="text-white hover:text-flowtrade-cyan">
                        {customer.email}
                      </a>
                    </div>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-flowtrade-cyan" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <a href={`tel:${customer.phone}`} className="text-white hover:text-flowtrade-cyan">
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-flowtrade-cyan mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-white">{address}</p>
                    </div>
                  </div>
                )}
                {customer.abn && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-flowtrade-cyan" />
                    <div>
                      <p className="text-xs text-gray-500">ABN</p>
                      <p className="text-white">{customer.abn}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {customer.notes && (
              <div className="mt-6 pt-6 border-t border-flowtrade-navy-lighter">
                <p className="text-xs text-gray-500 mb-2">Notes</p>
                <p className="text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Quote History */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter overflow-hidden">
            <div className="px-6 py-4 border-b border-flowtrade-navy-lighter flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Quote History</h3>
              <span className="text-sm text-gray-400">{quotes.length} quote{quotes.length !== 1 ? 's' : ''}</span>
            </div>
            
            {quotes.length > 0 ? (
              <div className="divide-y divide-flowtrade-navy-lighter">
                {quotes.map((quote) => {
                  const StatusIcon = STATUS_CONFIG[quote.status]?.icon || Clock
                  const statusConfig = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft
                  const isExpired = new Date(quote.valid_until) < new Date() && quote.status !== 'accepted'
                  
                  return (
                    <div
                      key={quote.id}
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                      className="px-6 py-4 hover:bg-flowtrade-navy-lighter/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-white font-medium">{quote.quote_number}</p>
                            <p className="text-sm text-gray-400">{formatDate(quote.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                            {isExpired && quote.status !== 'expired' && ' (Expired)'}
                          </span>
                          <span className="text-white font-medium">{formatCurrency(quote.total)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No quotes yet</p>
                <button
                  onClick={() => router.push(`/quotes/new?customer=${customer.id}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create First Quote
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Revenue Summary */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-cyan/30 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Revenue Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Quoted</span>
                </div>
                <span className="text-white font-medium">{formatCurrency(revenue.totalQuoted)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Accepted</span>
                </div>
                <span className="text-green-400 font-medium">{formatCurrency(revenue.acceptedRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Clock className="h-4 w-4" />
                  <span>Pending</span>
                </div>
                <span className="text-yellow-400 font-medium">{formatCurrency(revenue.pendingRevenue)}</span>
              </div>
              <div className="border-t border-flowtrade-navy-lighter pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Quotes</span>
                  <span className="text-white">{revenue.quoteCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-400">Accepted</span>
                  <span className="text-white">{revenue.acceptedCount} ({revenue.quoteCount > 0 ? Math.round((revenue.acceptedCount / revenue.quoteCount) * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter p-6">
            <h3 className="text-lg font-medium text-white mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  customer.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-white">{formatDate(customer.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-white">{formatDate(customer.updated_at)}</span>
              </div>
              {customer.country && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Country</span>
                  <span className="text-white">{customer.country}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveCustomer}
        customer={customer}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-flowtrade-navy-light rounded-xl border border-flowtrade-navy-lighter w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Customer</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong>{customer.business_name}</strong>?
              {quotes.length > 0 && (
                <span className="block mt-2 text-yellow-400">
                  Warning: This customer has {quotes.length} quote{quotes.length !== 1 ? 's' : ''} associated.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
