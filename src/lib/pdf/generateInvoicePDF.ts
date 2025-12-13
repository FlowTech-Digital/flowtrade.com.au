import { renderToBuffer } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import InvoicePDF, { type Invoice, type InvoiceLineItem, type BusinessInfo, type InvoicePDFProps } from './InvoicePDF'

export type { Invoice, InvoiceLineItem, BusinessInfo }

interface GenerateInvoicePDFOptions {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
  businessInfo?: BusinessInfo
}

/**
 * Generate a PDF buffer for an invoice (server-side)
 * This is suitable for API routes and server components
 */
export async function generateInvoicePDFBuffer(options: GenerateInvoicePDFOptions): Promise<Buffer> {
  const { invoice, lineItems, businessInfo } = options

  try {
    // Create the PDF document using createElement
    const doc = createElement(InvoicePDF, { invoice, lineItems, businessInfo } as InvoicePDFProps) as ReactElement
    
    // Generate the PDF buffer (server-side compatible)
    const buffer = await renderToBuffer(doc)
    return buffer
  } catch (error) {
    console.error('Error generating invoice PDF buffer:', error)
    throw new Error('Failed to generate invoice PDF.')
  }
}

/**
 * Generate a PDF and return as Uint8Array (for Response body)
 */
export async function generateInvoicePDFBytes(options: GenerateInvoicePDFOptions): Promise<Uint8Array> {
  const buffer = await generateInvoicePDFBuffer(options)
  return new Uint8Array(buffer)
}
