'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Users, Loader2, AlertCircle } from 'lucide-react'
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
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 mt-1">Manage your customer database</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-flowtrade-cyan" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-flowtrade-navy-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          {customers.length === 0 ? (
            <>
              <h3 className="text-lg font-medium text-white mb-2">No customers yet</h3>
              <p className="text-gray-400 mb-6">Get started by adding your first customer</p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Customer
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
              <p className="text-gray-400">Try adjusting your search terms</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Customer</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-white font-medium">{deleteConfirm.company_name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
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
