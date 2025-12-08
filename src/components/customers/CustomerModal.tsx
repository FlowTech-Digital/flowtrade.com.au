'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Customer, CustomerFormData } from '@/types/customer'
import { AUSTRALIAN_STATES } from '@/types/customer'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CustomerFormData) => Promise<void>
  customer?: Customer | null
  isLoading?: boolean
}

const initialFormData: CustomerFormData = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'Australia',
  abn: '',
  notes: '',
}

export default function CustomerModal({
  isOpen,
  onClose,
  onSave,
  customer,
  isLoading = false,
}: CustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<CustomerFormData>>({})

  const isEditing = !!customer

  useEffect(() => {
    if (customer) {
      setFormData({
        business_name: customer.business_name,
        contact_name: customer.contact_name,
        email: customer.email || '',
        phone: customer.phone || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        suburb: customer.suburb || '',
        state: customer.state || '',
        postcode: customer.postcode || '',
        country: customer.country || 'Australia',
        abn: customer.abn || '',
        notes: customer.notes || '',
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
  }, [customer, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when field changes
    if (errors[name as keyof CustomerFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<CustomerFormData> = {}

    if (!formData.business_name.trim()) {
      newErrors.business_name = 'Business name is required'
    }
    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    if (formData.abn && !/^\d{11}$/.test(formData.abn.replace(/\s/g, ''))) {
      newErrors.abn = 'ABN must be 11 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSave(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-flowtrade-navy-lighter">
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Info Section */}
            <div>
              <h3 className="text-sm font-medium text-flowtrade-cyan mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    value={formData.business_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-flowtrade-navy border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent ${
                      errors.business_name ? 'border-red-500' : 'border-flowtrade-navy-lighter'
                    }`}
                    placeholder="e.g., Smith Plumbing"
                  />
                  {errors.business_name && (
                    <p className="text-red-400 text-xs mt-1">{errors.business_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-flowtrade-navy border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent ${
                      errors.contact_name ? 'border-red-500' : 'border-flowtrade-navy-lighter'
                    }`}
                    placeholder="e.g., John Smith"
                  />
                  {errors.contact_name && (
                    <p className="text-red-400 text-xs mt-1">{errors.contact_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-flowtrade-navy border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-flowtrade-navy-lighter'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    placeholder="0412 345 678"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="text-sm font-medium text-flowtrade-cyan mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    placeholder="Street address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    placeholder="Unit, suite, etc. (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Suburb</label>
                  <input
                    type="text"
                    name="suburb"
                    value={formData.suburb}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    placeholder="Suburb"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                  >
                    <option value="">Select state</option>
                    {AUSTRALIAN_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Postcode</label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
                    placeholder="2000"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            {/* Business Details Section */}
            <div>
              <h3 className="text-sm font-medium text-flowtrade-cyan mb-4">Business Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">ABN</label>
                  <input
                    type="text"
                    name="abn"
                    value={formData.abn}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-flowtrade-navy border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent ${
                      errors.abn ? 'border-red-500' : 'border-flowtrade-navy-lighter'
                    }`}
                    placeholder="12 345 678 901"
                  />
                  {errors.abn && (
                    <p className="text-red-400 text-xs mt-1">{errors.abn}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent resize-none"
                    placeholder="Additional notes about this customer..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-flowtrade-navy-lighter">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
