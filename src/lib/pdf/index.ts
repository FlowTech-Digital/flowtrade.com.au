// Client-side PDF exports (browser only - these call doc.save()/FileReader).
export { downloadQuotePDF, generateQuotePDFBlob, generateQuotePDFDataURL } from './generateQuotePDF'
export { downloadInvoicePDF } from './downloadInvoicePDF'

// Server-side (CloudFlare Workers) quote PDF builder - use this in route
// handlers and for email attachments. Do NOT use generateQuotePDFBlob on the
// server: it emits a 3-line placeholder document, and generateQuotePDFDataURL
// calls FileReader, which does not exist on Workers.
export { buildQuotePDF, buildQuotePDFBase64 } from './server/buildQuotePDF'
export { ORG_PDF_COLUMNS, orgToBusinessInfo, composeOrgAddress } from './server/orgBusinessInfo'
