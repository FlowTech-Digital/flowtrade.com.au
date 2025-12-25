'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Users, Loader2, AlertCircle, Briefcase, FileText } from 'lucide-react'
import { customerService } from '@/services/customerService'
import CustomerCard from '@/components/customers/CustomerCard'
import CustomerModal from '@/components/customers/CustomerModal'
import type { Customer, CustomerFormData } from '@/types/customer'

// Helper function to get full contact name
const getContactName = (customer: Customer) => {
  const parts = [customer.first_name, customer.last_name].filter(Boolean)
  return parts.join(' ')
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch customers on mount
  useEffect(() => {
    loadCustomers()
  }, [])

  // Filter customers when search changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.company_name.toLowerCase().includes(query) ||
            getContactName(c).toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, customers])

  const loadCustomers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await customerService.getCustomers()
      setCustomers(data)
    } catch (err) {
      console.error('Error loading customers:', err)
      setError('Failed to load customers. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (customer?: Customer) => {
    setEditingCustomer(customer || null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCustomer(null)
  }

  const handleSaveCustomer = async (formData: CustomerFormData) => {
    try {
      setIsSaving(true)
      
      // Convert empty strings to null for optional fields
      const cleanData = {
        company_name: formData.company_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        address_line1: formData.address_line1 || null,
        address_line2: formData.address_line2 || null,
        suburb: formData.suburb || null,
        state: formData.state || null,
        postcode: formData.postcode || null,
        country: formData.country || 'Australia',
        abn: formData.abn.replace(/\s/g, '') || null,
        notes: formData.notes || null,
      }

      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, cleanData)
      } else {
        await customerService.createCustomer(cleanData)
      }

      await loadCustomers()
      handleCloseModal()
    } catch (err) {
      console.error('Error saving customer:', err)
      setError('Failed to save customer. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!deleteConfirm) return

    try {
      setIsDeleting(true)
      await customerService.archiveCustomer(deleteConfirm.id)
      await loadCustomers()
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting customer:', err)
      setError('Failed to delete customer. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-flowtrade-navy-lighter">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Customers</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage your customer database</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-lg shadow-flowtrade-cyan/20 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Summary Stats - 2 columns on mobile, 3 on desktop */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Overview</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-purple-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-purple-400/5 hover:shadow-purple-400/10 hover:border-purple-400/40 hover:ring-2 hover:ring-purple-400/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-purple-400/20 rounded-xl ring-2 ring-purple-400/30 group-hover:ring-purple-400/50 transition-all">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{customers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-flowtrade-cyan/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-flowtrade-cyan/5 hover:shadow-flowtrade-cyan/10 hover:border-flowtrade-cyan/40 hover:ring-2 hover:ring-flowtrade-cyan/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-flowtrade-cyan/20 rounded-xl ring-2 ring-flowtrade-cyan/30 group-hover:ring-flowtrade-cyan/50 transition-all">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-flowtrade-cyan" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">With Email</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{customers.filter(c => c.email).length}</p>
              </div>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-amber-400/20 rounded-xl p-3 sm:p-4 shadow-lg shadow-amber-400/5 hover:shadow-amber-400/10 hover:border-amber-400/40 hover:ring-2 hover:ring-amber-400/20 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-amber-400/20 rounded-xl ring-2 ring-amber-400/30 group-hover:ring-amber-400/50 transition-all">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-400">Business</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{customers.filter(c => c.abn).length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Mobile Optimized */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">Search</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-flowtrade-navy-lighter p-3 sm:p-4 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 bg-flowtrade-navy border-2 border-flowtrade-navy-lighter rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
            />
          </div>
          {searchQuery && (
            <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-sm text-gray-500">
                Showing {filteredCustomers.length} of {customers.length} customers
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-flowtrade-cyan hover:text-flowtrade-cyan/80 transition-colors"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert - Mobile Optimized */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-lg shadow-red-500/10">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-red-500/20 rounded-lg flex-shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            </div>
            <p className="text-sm sm:text-base text-red-400">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors w-full sm:w-auto text-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content - Mobile Optimized Cards Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider px-2 sm:px-3 py-1 sm:py-1.5 bg-flowtrade-navy rounded-lg border border-flowtrade-navy-lighter">All Customers</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-flowtrade-navy-lighter to-transparent"></div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-16 sm:py-20">
            <Loader2 className="w-8 h-8 animate-spin text-flowtrade-cyan" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy rounded-xl border-2 border-dashed border-flowtrade-navy-lighter p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-400/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-2 ring-purple-400/20">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
            </div>
            {customers.length === 0 ? (
              <>
                <h3 className="text-base sm:text-lg font-medium text-white mb-2">No customers yet</h3>
                <p className="text-sm sm:text-base text-gray-400 mb-6">Get started by adding your first customer</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors shadow-lg shadow-flowtrade-cyan/20 w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5" />
                  Add Customer
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base sm:text-lg font-medium text-white mb-2">No results found</h3>
                <p className="text-sm sm:text-base text-gray-400 mb-6">Try adjusting your search terms</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-flowtrade-navy-lighter text-white font-medium rounded-lg hover:bg-flowtrade-navy-lighter/80 transition-colors border-2 border-flowtrade-navy-border w-full sm:w-auto"
                >
                  Clear Search
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onEdit={handleOpenModal}
                onDelete={setDeleteConfirm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal - Mobile Optimized */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-gradient-to-br from-flowtrade-navy-light to-flowtrade-navy border-2 border-red-500/30 rounded-xl shadow-2xl shadow-red-500/10 p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Delete Customer</h3>
            <p className="text-sm sm:text-base text-gray-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{deleteConfirm.company_name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors w-full sm:w-auto text-center"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 w-full sm:w-auto"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
