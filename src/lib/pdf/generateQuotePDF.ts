'use client'

import { pdf } from '@react-pdf/renderer'
import QuotePDF from './QuotePDF'
import { createElement } from 'react'

// Types matching QuotePDF
type Customer = {
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
}

type LineItem = {
  id: string
  item_order: number
  item_type: 'labor' | 'materials' | 'equipment' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  is_optional: boolean
}

type Quote = {
  id: string
  quote_number: string
  version: number
  status: string
  job_site_address: string
  job_description: string
  subtotal: number
  tax_rate: number
  gst_amount: number
  total: number
  deposit_required: boolean
  deposit_amount: number | null
  deposit_percentage: number | null
  valid_until: string
  terms_and_conditions: string | null
  customer_notes: string | null
  created_at: string
  customer: Customer
}

type BusinessInfo = {
  name: string
  abn: string
  email: string
  phone: string
  address: string
}

interface GeneratePDFOptions {
  quote: Quote
  lineItems: LineItem[]
  businessInfo?: BusinessInfo
}

/**
 * Generate and download a PDF for a quote
 */
export async function downloadQuotePDF(options: GeneratePDFOptions): Promise<void> {
  const { quote, lineItems, businessInfo } = options

  try {
    // Create the PDF document using createElement to avoid JSX in .ts file
    const doc = createElement(QuotePDF, { quote, lineItems, businessInfo })
    
    // Generate the PDF blob
    const blob = await pdf(doc).toBlob()

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${quote.quote_number}.pdf`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

/**
 * Generate a PDF blob for a quote (useful for email attachments, etc.)
 */
export async function generateQuotePDFBlob(options: GeneratePDFOptions): Promise<Blob> {
  const { quote, lineItems, businessInfo } = options

  try {
    const doc = createElement(QuotePDF, { quote, lineItems, businessInfo })
    const blob = await pdf(doc).toBlob()
    return blob
  } catch (error) {
    console.error('Error generating PDF blob:', error)
    throw new Error('Failed to generate PDF.')
  }
}

/**
 * Generate a PDF data URL for preview
 */
export async function generateQuotePDFDataURL(options: GeneratePDFOptions): Promise<string> {
  const { quote, lineItems, businessInfo } = options

  try {
    const doc = createElement(QuotePDF, { quote, lineItems, businessInfo })
    const blob = await pdf(doc).toBlob()
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error generating PDF data URL:', error)
    throw new Error('Failed to generate PDF preview.')
  }
}
