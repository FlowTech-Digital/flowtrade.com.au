'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { uploadLogo, updateOrgLogo, deleteLogo } from '@/lib/supabase/storage'
import { Building2, Mail, Phone, FileText, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react'

type Organization = {
  id: string
  name: string
  email: string | null
  phone: string | null
  abn: string | null
  logo_url: string | null
  primary_trade: string | null
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    abn: ''
  })
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)

  // Fetch organization data
  useEffect(() => {
    async function fetchOrg() {
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

      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, email, phone, abn, logo_url, primary_trade')
        .eq('id', userData.org_id)
        .single()

      if (orgError) {
        console.error('Failed to get org:', orgError)
        setLoading(false)
        return
      }

      setOrg(orgData)
      setFormData({
        name: orgData.name || '',
        email: orgData.email || '',
        phone: orgData.phone || '',
        abn: orgData.abn || ''
      })
      setLoading(false)
    }

    fetchOrg()
  }, [user])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Save organization settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return

    setSaving(true)
    setMessage(null)

    const supabase = createClient()
    if (!supabase) {
      setMessage({ type: 'error', text: 'Database not available' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('organizations')
      .update({
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        abn: formData.abn || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', org.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully' })
      setOrg(prev => prev ? { ...prev, ...formData } : null)
    }
    setSaving(false)
  }

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!org) return

    setUploading(true)
    setMessage(null)

    const result = await uploadLogo(file, org.id)

    if (result.success && result.url) {
      // Delete old logo if exists
      if (org.logo_url) {
        await deleteLogo(org.logo_url, org.id)
      }
      
      // Update database
      const updated = await updateOrgLogo(org.id, result.url)
      
      if (updated) {
        setOrg(prev => prev ? { ...prev, logo_url: result.url! } : null)
        setMessage({ type: 'success', text: 'Logo uploaded successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save logo URL' })
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Upload failed' })
    }

    setUploading(false)
  }, [org])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  // Remove logo
  const handleRemoveLogo = async () => {
    if (!org?.logo_url) return

    setUploading(true)
    await deleteLogo(org.logo_url, org.id)
    await updateOrgLogo(org.id, null)
    setOrg(prev => prev ? { ...prev, logo_url: null } : null)
    setMessage({ type: 'success', text: 'Logo removed' })
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your organization settings and branding</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-800 text-green-400'
            : 'bg-red-900/30 border border-red-800 text-red-400'
        }`}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Logo Upload Section */}
      <div className="bg-flowtrade-navy-light rounded-xl p-6 mb-6 border border-flowtrade-navy-lighter">
        <h2 className="text-lg font-semibold text-white mb-4">Business Logo</h2>
        
        <div className="flex items-start gap-6">
          {/* Current Logo Preview */}
          <div className="flex-shrink-0">
            {org?.logo_url ? (
              <div className="relative group">
                <img 
                  src={org.logo_url} 
                  alt="Business logo" 
                  className="w-24 h-24 object-contain rounded-lg bg-white p-2"
                />
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="absolute -top-2 -right-2 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg bg-flowtrade-navy-lighter flex items-center justify-center">
                <Building2 className="h-10 w-10 text-gray-600" />
              </div>
            )}
          </div>

          {/* Upload Zone */}
          <div className="flex-1">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging 
                  ? 'border-flowtrade-cyan bg-flowtrade-cyan/10' 
                  : 'border-flowtrade-navy-lighter hover:border-gray-600'
              }`}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-flowtrade-cyan mx-auto" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm mb-2">
                    Drag and drop your logo here, or
                  </p>
                  <label className="inline-block">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="text-flowtrade-cyan hover:text-flowtrade-cyan/80 cursor-pointer text-sm font-medium">
                      browse to upload
                    </span>
                  </label>
                  <p className="text-gray-600 text-xs mt-2">
                    PNG, JPG, SVG or WebP (max 2MB)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details Form */}
      <form onSubmit={handleSave} className="bg-flowtrade-navy-light rounded-xl p-6 border border-flowtrade-navy-lighter">
        <h2 className="text-lg font-semibold text-white mb-4">Organization Details</h2>
        
        <div className="space-y-4">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              <Building2 className="h-4 w-4 inline mr-2" />
              Business Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              <Mail className="h-4 w-4 inline mr-2" />
              Business Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@yourbusiness.com.au"
              className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              <Phone className="h-4 w-4 inline mr-2" />
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0400 000 000"
              className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
            />
          </div>

          {/* ABN */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              <FileText className="h-4 w-4 inline mr-2" />
              ABN
            </label>
            <input
              type="text"
              name="abn"
              value={formData.abn}
              onChange={handleChange}
              placeholder="XX XXX XXX XXX"
              className="w-full px-4 py-2 bg-flowtrade-navy border border-flowtrade-navy-lighter rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-flowtrade-cyan focus:border-transparent"
            />
          </div>

          {/* Primary Trade (read-only) */}
          {org?.primary_trade && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Primary Trade
              </label>
              <input
                type="text"
                value={org.primary_trade.charAt(0).toUpperCase() + org.primary_trade.slice(1)}
                disabled
                className="w-full px-4 py-2 bg-flowtrade-navy-lighter border border-flowtrade-navy-lighter rounded-lg text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-600 mt-1">Contact support to change your primary trade</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-flowtrade-cyan text-flowtrade-navy font-medium rounded-lg hover:bg-flowtrade-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
