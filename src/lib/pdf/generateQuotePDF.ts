'use client'

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
  logo_url?: string | null
}

interface GeneratePDFOptions {
  quote: Quote
  lineItems: LineItem[]
  businessInfo?: BusinessInfo
}

/**
 * Load an image URL as base64 data URL for jsPDF
 * Handles CORS by fetching through browser and converting via FileReader
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to load logo:', error)
    return null
  }
}

/**
 * Determine image type from base64 data URL
 */
function getImageTypeFromBase64(base64: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (base64.includes('image/png')) return 'PNG'
  if (base64.includes('image/webp')) return 'WEBP'
  return 'JPEG'
}

/**
 * Download Quote PDF using jsPDF (CloudFlare-compatible)
 * Replaces @react-pdf/renderer which has bundler incompatibilities
 */
export async function downloadQuotePDF(options: GeneratePDFOptions): Promise<void> {
  const { quote, lineItems, businessInfo } = options

  try {
    // Dynamic import jsPDF to ensure browser-only loading
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246] // Blue
    const textColor: [number, number, number] = [31, 41, 55] // Dark gray
    const lightGray: [number, number, number] = [156, 163, 175]
    const greenColor: [number, number, number] = [34, 197, 94]
    
    let yPos = 20
    
    // Header - Logo (if available) + Business Info (left) and Quote Title (right)
    let businessNameX = 20 // Default position without logo
    
    // Try to load and render business logo
    if (businessInfo?.logo_url) {
      const logoBase64 = await loadImageAsBase64(businessInfo.logo_url)
      if (logoBase64) {
        try {
          const imageType = getImageTypeFromBase64(logoBase64)
          // Logo: 30x30px at position (20, 12) - slightly above text baseline
          doc.addImage(logoBase64, imageType, 20, 12, 30, 30)
          businessNameX = 55 // Shift business name to right of logo
        } catch (imgError) {
          console.error('Failed to add logo to PDF:', imgError)
          // Continue without logo
        }
      }
    }
    
    doc.setFontSize(24)
    doc.setTextColor(...primaryColor)
    doc.text(businessInfo?.name || 'Your Business', businessNameX, yPos)
    
    doc.setFontSize(28)
    doc.setTextColor(...textColor)
    doc.text('QUOTE', pageWidth - 20, yPos, { align: 'right' })
    
    yPos += 10
    
    // Business details (positioned relative to logo)
    doc.setFontSize(10)
    doc.setTextColor(...lightGray)
    if (businessInfo?.abn) {
      doc.text(`ABN: ${businessInfo.abn}`, businessNameX, yPos)
      yPos += 5
    }
    if (businessInfo?.email) {
      doc.text(businessInfo.email, businessNameX, yPos)
      yPos += 5
    }
    if (businessInfo?.phone) {
      doc.text(businessInfo.phone, businessNameX, yPos)
      yPos += 5
    }
    if (businessInfo?.address) {
      doc.text(businessInfo.address, businessNameX, yPos)
      yPos += 5
    }
    
    yPos += 10
    
    // Quote details box (right side)
    const quoteDetailsY = 35
    doc.setFontSize(10)
    doc.setTextColor(...textColor)
    doc.text(`Quote #: ${quote.quote_number}`, pageWidth - 20, quoteDetailsY, { align: 'right' })
    if (quote.version > 1) {
      doc.text(`Version: ${quote.version}`, pageWidth - 20, quoteDetailsY + 6, { align: 'right' })
    }
    doc.text(`Date: ${formatDate(quote.created_at)}`, pageWidth - 20, quoteDetailsY + (quote.version > 1 ? 12 : 6), { align: 'right' })
    doc.text(`Valid Until: ${formatDate(quote.valid_until)}`, pageWidth - 20, quoteDetailsY + (quote.version > 1 ? 18 : 12), { align: 'right' })
    
    // Status badge
    const statusY = quoteDetailsY + (quote.version > 1 ? 26 : 20)
    const statusText = quote.status.toUpperCase()
    const statusColor = getStatusColor(quote.status)
    doc.setFillColor(...statusColor)
    doc.roundedRect(pageWidth - 45, statusY - 4, 25, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(statusText, pageWidth - 32.5, statusY + 1, { align: 'center' })
    
    yPos = Math.max(yPos, 75)
    
    // Customer section
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.text('Customer', 20, yPos)
    yPos += 7
    
    doc.setFontSize(11)
    doc.setTextColor(...textColor)
    const customerName = quote.customer.company_name || 
      `${quote.customer.first_name || ''} ${quote.customer.last_name || ''}`.trim()
    doc.text(customerName, 20, yPos)
    yPos += 5
    
    doc.setFontSize(10)
    doc.setTextColor(...lightGray)
    if (quote.customer.email) {
      doc.text(quote.customer.email, 20, yPos)
      yPos += 5
    }
    if (quote.customer.phone) {
      doc.text(quote.customer.phone, 20, yPos)
      yPos += 5
    }
    
    // Customer address - filter to non-null strings only
    const addressParts = [
      quote.customer.street_address,
      [quote.customer.suburb, quote.customer.state, quote.customer.postcode].filter(Boolean).join(' ')
    ].filter((part): part is string => typeof part === 'string' && part.length > 0)
    
    addressParts.forEach(line => {
      doc.text(line, 20, yPos)
      yPos += 5
    })
    
    yPos += 5
    
    // Job Site section (if different from customer address)
    if (quote.job_site_address) {
      doc.setFontSize(12)
      doc.setTextColor(...primaryColor)
      doc.text('Job Site', 20, yPos)
      yPos += 7
      
      doc.setFontSize(10)
      doc.setTextColor(...textColor)
      const siteLines = doc.splitTextToSize(quote.job_site_address, 80)
      doc.text(siteLines, 20, yPos)
      yPos += siteLines.length * 5 + 5
    }
    
    // Job Description
    if (quote.job_description) {
      doc.setFontSize(12)
      doc.setTextColor(...primaryColor)
      doc.text('Job Description', 20, yPos)
      yPos += 7
      
      doc.setFontSize(10)
      doc.setTextColor(...textColor)
      const descLines = doc.splitTextToSize(quote.job_description, pageWidth - 40)
      doc.text(descLines, 20, yPos)
      yPos += descLines.length * 5 + 10
    }
    
    // Line items table - separate required and optional
    const requiredItems = lineItems.filter(item => !item.is_optional)
    const optionalItems = lineItems.filter(item => item.is_optional)
    
    // Required items
    if (requiredItems.length > 0) {
      const tableData = requiredItems.map(item => [
        capitalizeFirst(item.item_type),
        item.description,
        item.quantity.toString(),
        item.unit,
        formatCurrency(item.unit_price),
        formatCurrency(item.line_total)
      ])
      
      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 9,
          textColor: textColor
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      })
      
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    }
    
    // Optional items
    if (optionalItems.length > 0) {
      doc.setFontSize(11)
      doc.setTextColor(...primaryColor)
      doc.text('Optional Items', 20, yPos)
      yPos += 7
      
      const optionalTableData = optionalItems.map(item => [
        capitalizeFirst(item.item_type),
        item.description,
        item.quantity.toString(),
        item.unit,
        formatCurrency(item.unit_price),
        formatCurrency(item.line_total)
      ])
      
      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
        body: optionalTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [156, 163, 175], // Gray for optional
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 9,
          textColor: textColor,
          fontStyle: 'italic'
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      })
      
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    }
    
    yPos += 5
    
    // Totals section (right aligned)
    const totalsX = pageWidth - 70
    
    doc.setFontSize(10)
    doc.setTextColor(...textColor)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', totalsX, yPos)
    doc.text(formatCurrency(quote.subtotal), pageWidth - 20, yPos, { align: 'right' })
    yPos += 7
    
    doc.text(`GST (${quote.tax_rate}%):`, totalsX, yPos)
    doc.text(formatCurrency(quote.gst_amount), pageWidth - 20, yPos, { align: 'right' })
    yPos += 7
    
    // Total with background
    doc.setFillColor(243, 244, 246) // Light gray background
    doc.rect(totalsX - 5, yPos - 5, pageWidth - totalsX + 5 - 15, 12, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', totalsX, yPos + 3)
    doc.text(formatCurrency(quote.total), pageWidth - 20, yPos + 3, { align: 'right' })
    
    yPos += 20
    
    // Deposit section
    if (quote.deposit_required && (quote.deposit_amount || quote.deposit_percentage)) {
      doc.setFillColor(236, 253, 245) // Light green background
      doc.rect(20, yPos - 5, pageWidth - 40, 20, 'F')
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...greenColor)
      doc.text('Deposit Required', 25, yPos + 3)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const depositText = quote.deposit_percentage 
        ? `${quote.deposit_percentage}% deposit (${formatCurrency(quote.deposit_amount || 0)}) required to commence work`
        : `${formatCurrency(quote.deposit_amount || 0)} deposit required to commence work`
      doc.text(depositText, 25, yPos + 11)
      
      yPos += 25
    }
    
    // Customer notes
    if (quote.customer_notes) {
      doc.setFontSize(10)
      doc.setTextColor(...lightGray)
      doc.setFont('helvetica', 'normal')
      doc.text('Notes:', 20, yPos)
      yPos += 5
      doc.setTextColor(...textColor)
      
      const splitNotes = doc.splitTextToSize(quote.customer_notes, pageWidth - 40)
      doc.text(splitNotes, 20, yPos)
      yPos += splitNotes.length * 5 + 10
    }
    
    // Terms and conditions
    if (quote.terms_and_conditions) {
      // Check if we need a new page
      if (yPos > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(10)
      doc.setTextColor(...lightGray)
      doc.text('Terms & Conditions:', 20, yPos)
      yPos += 5
      doc.setTextColor(...textColor)
      doc.setFontSize(8)
      
      const splitTerms = doc.splitTextToSize(quote.terms_and_conditions, pageWidth - 40)
      doc.text(splitTerms, 20, yPos)
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setTextColor(...lightGray)
    doc.text('Thank you for considering our services!', pageWidth / 2, footerY, { align: 'center' })
    
    // Download the PDF
    doc.save(`${quote.quote_number}.pdf`)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

/**
 * Generate a PDF blob for a quote (useful for email attachments, etc.)
 * Note: This is a simplified version - lineItems available in options.lineItems if full implementation needed
 */
export async function generateQuotePDFBlob(options: GeneratePDFOptions): Promise<Blob> {
  const { quote, businessInfo } = options

  try {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    
    // Create document using same logic as downloadQuotePDF
    // For brevity, create a simple version for blob generation
    const doc = new jsPDF()
    
    let businessNameX = 20
    
    // Try to load and render business logo
    if (businessInfo?.logo_url) {
      const logoBase64 = await loadImageAsBase64(businessInfo.logo_url)
      if (logoBase64) {
        try {
          const imageType = getImageTypeFromBase64(logoBase64)
          doc.addImage(logoBase64, imageType, 20, 12, 30, 30)
          businessNameX = 55
        } catch (imgError) {
          console.error('Failed to add logo to PDF blob:', imgError)
        }
      }
    }
    
    doc.setFontSize(24)
    doc.text(businessInfo?.name || 'Quote', businessNameX, 20)
    doc.setFontSize(14)
    doc.text(`Quote #: ${quote.quote_number}`, 20, 50)
    doc.text(`Total: ${formatCurrency(quote.total)}`, 20, 60)
    
    return doc.output('blob')
  } catch (error) {
    console.error('Error generating PDF blob:', error)
    throw new Error('Failed to generate PDF.')
  }
}

/**
 * Generate a PDF data URL for preview
 */
export async function generateQuotePDFDataURL(options: GeneratePDFOptions): Promise<string> {
  try {
    const blob = await generateQuotePDFBlob(options)
    
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

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount)
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getStatusColor(status: string): [number, number, number] {
  switch (status.toLowerCase()) {
    case 'accepted':
      return [34, 197, 94] // Green
    case 'sent':
      return [59, 130, 246] // Blue
    case 'expired':
      return [239, 68, 68] // Red
    case 'draft':
    default:
      return [156, 163, 175] // Gray
  }
}
