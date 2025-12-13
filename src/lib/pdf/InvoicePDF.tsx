// DEPRECATED: This file used @react-pdf/renderer which is incompatible with CloudFlare
// The invoice PDF generation has been migrated to jsPDF
// See: src/lib/pdf/downloadInvoicePDF.ts for the new implementation

// Export types only (for compatibility with downloadInvoicePDF.ts)
export type InvoiceCustomer = {
  id?: string
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

export type InvoiceLineItem = {
  id: string
  item_order?: number
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

export type Invoice = {
  id?: string
  invoice_number: string
  status: string
  subtotal: number
  tax_rate: number
  gst_amount: number
  total: number
  amount_paid: number
  invoice_date: string
  due_date: string
  payment_terms: string | null
  notes: string | null
  customer: InvoiceCustomer
  line_items: InvoiceLineItem[]
  business_info?: BusinessInfo
}

export type BusinessInfo = {
  name: string
  abn: string
  email: string
  phone: string
  address: string
  logo_url?: string | null
}

export interface InvoicePDFProps {
  invoice: Invoice
  lineItems?: InvoiceLineItem[]
  businessInfo?: BusinessInfo
}

// Stub component - throws error if used
export default function InvoicePDF(_props: InvoicePDFProps) {
  throw new Error('InvoicePDF is deprecated. Use downloadInvoicePDF from @/lib/pdf instead.')
}
