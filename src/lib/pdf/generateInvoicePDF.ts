// DEPRECATED: This file used @react-pdf/renderer which is incompatible with CloudFlare
// The invoice PDF generation has been migrated to jsPDF
// See: src/lib/pdf/downloadInvoicePDF.ts for the new implementation

export type { Invoice, InvoiceLineItem, BusinessInfo } from './InvoicePDF'

/**
 * @deprecated Use downloadInvoicePDF from './downloadInvoicePDF' instead
 * This function relied on @react-pdf/renderer's server-side renderToBuffer
 * which is incompatible with CloudFlare Workers runtime.
 */
export async function generateInvoicePDFBuffer(): Promise<Buffer> {
  throw new Error(
    'generateInvoicePDFBuffer is deprecated. Use downloadInvoicePDF from @/lib/pdf for client-side PDF generation.'
  )
}

/**
 * @deprecated Use downloadInvoicePDF from './downloadInvoicePDF' instead
 */
export async function generateInvoicePDFBytes(): Promise<Uint8Array> {
  throw new Error(
    'generateInvoicePDFBytes is deprecated. Use downloadInvoicePDF from @/lib/pdf for client-side PDF generation.'
  )
}
