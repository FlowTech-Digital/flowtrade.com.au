// Quote PDF exports (jsPDF-based)
export { downloadQuotePDF, generateQuotePDFBlob, generateQuotePDFDataURL } from './generateQuotePDF'

// Invoice PDF exports (jsPDF-based)
export { downloadInvoicePDF } from './downloadInvoicePDF'

// Note: InvoicePDF.tsx and QuotePDF.tsx are deprecated React PDF components
// that don't work with CloudFlare. Use the jsPDF-based functions above instead.
