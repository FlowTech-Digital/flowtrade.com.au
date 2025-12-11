'use client'

import { useState, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'

type InvoiceCustomer = {
  first_name: string | null
  last_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
}

type InvoiceJob = {
  job_number: string
  job_notes: string | null
}

type InvoiceData = {
  invoice_number: string
  invoice_date: string
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  customer: InvoiceCustomer | null
  job: InvoiceJob | null
}

type BusinessInfo = {
  name: string
  abn: string
  address: string
  email: string
  phone: string
  logo_url?: string | null
}

type InvoicePDFDownloadProps = {
  invoice: InvoiceData
  className?: string
  variant?: 'primary' | 'secondary'
}

export function InvoicePDFDownload({
  invoice,
  className = '',
  variant = 'primary',
}: InvoicePDFDownloadProps) {
  const { user } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)

  // Fetch organization info for the PDF
  useEffect(() => {
    async function fetchOrgInfo() {
      if (!user) return
      
      const supabase = createClient()
      if (!supabase) return

      // Get user's org_id
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData?.org_id) return

      // Get organization details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, abn, email, phone, address_line1, suburb, state, postcode, logo_url')
        .eq('id', userData.org_id)
        .single()

      if (orgData) {
        // Build address string
        const addressParts = [
          orgData.address_line1,
          [orgData.suburb, orgData.state, orgData.postcode].filter(Boolean).join(' ')
        ].filter(Boolean)

        setBusinessInfo({
          name: orgData.name || 'Your Business Name',
          abn: orgData.abn || '00 000 000 000',
          address: addressParts.join(', ') || 'Your Business Address',
          email: orgData.email || 'contact@yourbusiness.com',
          phone: orgData.phone || '0400 000 000',
          logo_url: orgData.logo_url,
        })
      }
    }

    fetchOrgInfo()
  }, [user])

  const handleDownload = async () => {
    setGenerating(true)
    
    try {
      // Use fetched business info or defaults
      const business: BusinessInfo = businessInfo || {
        name: 'Your Business Name',
        abn: '00 000 000 000',
        address: 'Your Business Address',
        email: 'contact@yourbusiness.com',
        phone: '0400 000 000',
      }

      // Dynamically import @react-pdf/renderer to avoid SSR issues
      // This is required for CloudFlare Pages edge runtime compatibility
      const [{ pdf }, { InvoicePDFTemplate }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./InvoicePDFTemplate')
      ])
      
      // Generate PDF blob
      const blob = await pdf(
        <InvoicePDFTemplate invoice={invoice} business={business} />
      ).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoice_number}.pdf`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Cleanup
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setGenerating(false)
    }
  }

  const baseStyles = 'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
  const variantStyles = variant === 'primary'
    ? 'bg-flowtrade-cyan text-flowtrade-navy hover:bg-flowtrade-cyan/90'
    : 'bg-flowtrade-navy-lighter text-white hover:bg-flowtrade-navy-lighter/80'

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {generating ? 'Generating...' : 'Download PDF'}
    </button>
  )
}

export default InvoicePDFDownload
