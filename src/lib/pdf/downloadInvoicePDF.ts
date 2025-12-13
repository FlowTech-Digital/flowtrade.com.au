'use client'

import type { Invoice, InvoiceLineItem, InvoiceCustomer, BusinessInfo } from './InvoicePDF'

/**
 * Download Invoice PDF using jsPDF (CloudFlare-compatible)
 * Replaces @react-pdf/renderer which has bundler incompatibilities
 */
export async function downloadInvoicePDF(invoice: Invoice): Promise<void> {
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
    
    let yPos = 20
    
    // Header - Business Info (left) and Invoice Title (right)
    doc.setFontSize(24)
    doc.setTextColor(...primaryColor)
    doc.text(invoice.business_info?.name || 'Your Business', 20, yPos)
    
    doc.setFontSize(28)
    doc.setTextColor(...textColor)
    doc.text('INVOICE', pageWidth - 20, yPos, { align: 'right' })
    
    yPos += 10
    
    // Business details
    doc.setFontSize(10)
    doc.setTextColor(...lightGray)
    if (invoice.business_info?.abn) {
      doc.text(`ABN: ${invoice.business_info.abn}`, 20, yPos)
      yPos += 5
    }
    if (invoice.business_info?.email) {
      doc.text(invoice.business_info.email, 20, yPos)
      yPos += 5
    }
    if (invoice.business_info?.phone) {
      doc.text(invoice.business_info.phone, 20, yPos)
      yPos += 5
    }
    if (invoice.business_info?.address) {
      doc.text(invoice.business_info.address, 20, yPos)
      yPos += 5
    }
    
    yPos += 10
    
    // Invoice details box (right side)
    const invoiceDetailsY = 35
    doc.setFontSize(10)
    doc.setTextColor(...textColor)
    doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 20, invoiceDetailsY, { align: 'right' })
    doc.text(`Date: ${formatDate(invoice.invoice_date)}`, pageWidth - 20, invoiceDetailsY + 6, { align: 'right' })
    doc.text(`Due: ${formatDate(invoice.due_date)}`, pageWidth - 20, invoiceDetailsY + 12, { align: 'right' })
    
    // Status badge
    const statusY = invoiceDetailsY + 20
    const statusText = invoice.status.toUpperCase()
    const statusColor = getStatusColor(invoice.status)
    doc.setFillColor(...statusColor)
    doc.roundedRect(pageWidth - 45, statusY - 4, 25, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(statusText, pageWidth - 32.5, statusY + 1, { align: 'center' })
    
    yPos = Math.max(yPos, 70)
    
    // Bill To section
    doc.setFontSize(12)
    doc.setTextColor(...primaryColor)
    doc.text('Bill To', 20, yPos)
    yPos += 7
    
    doc.setFontSize(11)
    doc.setTextColor(...textColor)
    const customerName = invoice.customer.company_name || 
      `${invoice.customer.first_name || ''} ${invoice.customer.last_name || ''}`.trim()
    doc.text(customerName, 20, yPos)
    yPos += 5
    
    doc.setFontSize(10)
    doc.setTextColor(...lightGray)
    if (invoice.customer.email) {
      doc.text(invoice.customer.email, 20, yPos)
      yPos += 5
    }
    if (invoice.customer.phone) {
      doc.text(invoice.customer.phone, 20, yPos)
      yPos += 5
    }
    
    // Customer address
    const addressParts = [
      invoice.customer.street_address,
      [invoice.customer.suburb, invoice.customer.state, invoice.customer.postcode].filter(Boolean).join(' ')
    ].filter(Boolean)
    
    addressParts.forEach(line => {
      doc.text(line, 20, yPos)
      yPos += 5
    })
    
    yPos += 10
    
    // Line items table
    const tableData = invoice.line_items.map(item => [
      item.description,
      item.quantity.toString(),
      item.unit,
      formatCurrency(item.unit_price),
      formatCurrency(item.line_total)
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        textColor: textColor
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    })
    
    // Get the final Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50
    yPos = finalY + 15
    
    // Totals section (right aligned)
    const totalsX = pageWidth - 70
    
    doc.setFontSize(10)
    doc.setTextColor(...textColor)
    doc.text('Subtotal:', totalsX, yPos)
    doc.text(formatCurrency(invoice.subtotal), pageWidth - 20, yPos, { align: 'right' })
    yPos += 7
    
    doc.text(`GST (${invoice.tax_rate}%):`, totalsX, yPos)
    doc.text(formatCurrency(invoice.gst_amount), pageWidth - 20, yPos, { align: 'right' })
    yPos += 7
    
    // Total with background
    doc.setFillColor(243, 244, 246) // Light gray background
    doc.rect(totalsX - 5, yPos - 5, pageWidth - totalsX + 5 - 15, 12, 'F')
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Total:', totalsX, yPos + 3)
    doc.text(formatCurrency(invoice.total), pageWidth - 20, yPos + 3, { align: 'right' })
    
    yPos += 20
    
    // Amount paid and balance due
    if (invoice.amount_paid > 0) {
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      doc.text('Amount Paid:', totalsX, yPos)
      doc.text(formatCurrency(invoice.amount_paid), pageWidth - 20, yPos, { align: 'right' })
      yPos += 7
      
      const balanceDue = invoice.total - invoice.amount_paid
      doc.setFont(undefined, 'bold')
      doc.setTextColor(...primaryColor)
      doc.text('Balance Due:', totalsX, yPos)
      doc.text(formatCurrency(balanceDue), pageWidth - 20, yPos, { align: 'right' })
      yPos += 15
    }
    
    // Notes section
    if (invoice.notes) {
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...lightGray)
      doc.text('Notes:', 20, yPos)
      yPos += 5
      doc.setTextColor(...textColor)
      
      const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 40)
      doc.text(splitNotes, 20, yPos)
      yPos += splitNotes.length * 5 + 10
    }
    
    // Payment terms
    if (invoice.payment_terms) {
      doc.setFontSize(10)
      doc.setTextColor(...lightGray)
      doc.text('Payment Terms:', 20, yPos)
      yPos += 5
      doc.setTextColor(...textColor)
      
      const splitTerms = doc.splitTextToSize(invoice.payment_terms, pageWidth - 40)
      doc.text(splitTerms, 20, yPos)
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setTextColor(...lightGray)
    doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' })
    
    // Download the PDF
    doc.save(`${invoice.invoice_number}.pdf`)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF. Please try again.')
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

function getStatusColor(status: string): [number, number, number] {
  switch (status.toLowerCase()) {
    case 'paid':
      return [34, 197, 94] // Green
    case 'sent':
      return [59, 130, 246] // Blue
    case 'overdue':
      return [239, 68, 68] // Red
    case 'draft':
    default:
      return [156, 163, 175] // Gray
  }
}
