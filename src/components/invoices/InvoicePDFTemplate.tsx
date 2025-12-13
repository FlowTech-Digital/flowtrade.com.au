// DEPRECATED: This file used @react-pdf/renderer which is incompatible with CloudFlare
// The invoice PDF generation has been migrated to jsPDF
// See: src/lib/pdf/downloadInvoicePDF.ts for the new implementation

export const InvoicePDFTemplate = () => {
  throw new Error('InvoicePDFTemplate is deprecated. Use downloadInvoicePDF from @/lib/pdf instead.')
}

export default InvoicePDFTemplate
