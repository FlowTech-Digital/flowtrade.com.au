import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import InvoicePDF, { type Invoice, type InvoiceLineItem, type BusinessInfo } from './InvoicePDF'

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
    // Use React.createElement for proper element creation in all runtime contexts
    // Type assertion needed because InvoicePDFProps doesn't extend DocumentProps
    // but InvoicePDF returns a Document element which is what renderToBuffer expects
    const element = React.createElement(InvoicePDF, { invoice, lineItems, businessInfo })
    const buffer = await renderToBuffer(element as React.ReactElement<any>)
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
