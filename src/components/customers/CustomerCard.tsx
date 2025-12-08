'use client'

import { Building2, User, Mail, Phone, MapPin, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { Customer } from '@/types/customer'

interface CustomerCardProps {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export default function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatAddress = () => {
    const parts = [
      customer.address_line1,
      customer.suburb,
      customer.state,
      customer.postcode,
    ].filter(Boolean)
    return parts.join(', ') || null
  }

  return (
    <div className="bg-flowtrade-navy-light border border-flowtrade-navy-lighter rounded-xl p-5 hover:border-flowtrade-cyan/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-flowtrade-cyan/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-flowtrade-cyan" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{customer.business_name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <User className="w-3 h-3" />
              <span>{customer.contact_name}</span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-white hover:bg-flowtrade-navy-lighter rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 bg-flowtrade-navy-lighter border border-flowtrade-navy rounded-lg shadow-xl py-1 min-w-[120px] z-10">
              <button
                onClick={() => {
                  onEdit(customer)
                  setShowMenu(false)
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-flowtrade-navy transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete(customer)
                  setShowMenu(false)
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-flowtrade-navy transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2">
        {customer.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-500" />
            <a
              href={`mailto:${customer.email}`}
              className="text-gray-300 hover:text-flowtrade-cyan transition-colors"
            >
              {customer.email}
            </a>
          </div>
        )}

        {customer.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-500" />
            <a
              href={`tel:${customer.phone}`}
              className="text-gray-300 hover:text-flowtrade-cyan transition-colors"
            >
              {customer.phone}
            </a>
          </div>
        )}

        {formatAddress() && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
            <span className="text-gray-400">{formatAddress()}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mt-4 pt-4 border-t border-flowtrade-navy-lighter flex items-center justify-between">
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            customer.status === 'active'
              ? 'bg-green-500/10 text-green-400'
              : customer.status === 'inactive'
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-gray-500/10 text-gray-400'
          }`}
        >
          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
        </span>
        {customer.abn && (
          <span className="text-xs text-gray-500">ABN: {customer.abn}</span>
        )}
      </div>
    </div>
  )
}
