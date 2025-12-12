'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

// Define types for the invoice data
type InvoiceCustomer = {
  first_name: string | null
  last_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
}

type InvoiceJob = {
  job_number: string
  job_notes: string | null
}

type InvoiceData = {
  invoice_number: string
  invoice_date: string
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  customer: InvoiceCustomer | null
  job: InvoiceJob | null
}

type BusinessInfo = {
  name: string
  abn: string
  address: string
  email: string
  phone: string
  logo_url?: string | null
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#0891b2',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: 'contain',
    marginBottom: 10,
  },
  businessName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#0891b2',
  },
  businessNameWithLogo: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  logoSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoBlock: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.5,
  },
  infoTextBold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  datesSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  dateBlock: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0891b2',
    padding: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colDescription: {
    width: '60%',
  },
  colAmount: {
    width: '40%',
    textAlign: 'right',
  },
  tableText: {
    fontSize: 10,
    color: '#1e293b',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: '45%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 10,
    color: '#1e293b',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0891b2',
    borderRadius: 4,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 9,
    color: '#94a3b8',
  },
  paymentTerms: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  paymentTermsLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginBottom: 4,
  },
  paymentTermsText: {
    fontSize: 9,
    color: '#92400e',
  },
})

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '—'
  return format(new Date(dateString), 'd MMMM yyyy')
}

const getCustomerName = (customer: InvoiceCustomer | null): string => {
  if (!customer) return 'No Customer'
  if (customer.company_name) return customer.company_name
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unnamed'
}

const getCustomerAddress = (customer: InvoiceCustomer | null): string[] => {
  if (!customer) return []
  const lines: string[] = []
  if (customer.address_line1) lines.push(customer.address_line1)
  if (customer.address_line2) lines.push(customer.address_line2)
  const cityLine = [customer.suburb, customer.state, customer.postcode].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)
  return lines
}

type InvoicePDFTemplateProps = {
  invoice: InvoiceData
  business: BusinessInfo
}

export function InvoicePDFTemplate({ invoice, business }: InvoicePDFTemplateProps) {
  const customerAddress = getCustomerAddress(invoice.customer)
  const hasLogo = business.logo_url && business.logo_url.length > 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {hasLogo && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image doesn't support alt prop
              <Image src={business.logo_url!} style={styles.logo} />
            )}
            <Text style={hasLogo ? styles.businessNameWithLogo : styles.businessName}>
              {business.name}
            </Text>
            {!hasLogo && (
              <Text style={styles.logoSubtext}>Trade Job Management</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Business & Customer Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>From</Text>
            <Text style={styles.infoTextBold}>{business.name}</Text>
            <Text style={styles.infoText}>ABN: {business.abn}</Text>
            <Text style={styles.infoText}>{business.address}</Text>
            <Text style={styles.infoText}>{business.email}</Text>
            <Text style={styles.infoText}>{business.phone}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoTextBold}>{getCustomerName(invoice.customer)}</Text>
            {invoice.customer?.company_name && invoice.customer?.first_name && (
              <Text style={styles.infoText}>
                Attn: {invoice.customer.first_name} {invoice.customer.last_name}
              </Text>
            )}
            {customerAddress.map((line, i) => (
              <Text key={i} style={styles.infoText}>{line}</Text>
            ))}
            {invoice.customer?.email && (
              <Text style={styles.infoText}>{invoice.customer.email}</Text>
            )}
            {invoice.customer?.phone && (
              <Text style={styles.infoText}>{invoice.customer.phone}</Text>
            )}
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.datesSection}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Invoice Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.invoice_date)}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.due_date)}</Text>
          </View>
          {invoice.job && (
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Job Reference</Text>
              <Text style={styles.dateValue}>{invoice.job.job_number}</Text>
            </View>
          )}
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.tableHeaderText}>Amount</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colDescription}>
              <Text style={styles.tableText}>
                {invoice.job?.job_notes || `Services as per ${invoice.job?.job_number || 'agreement'}`}
              </Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.tableText}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST ({invoice.tax_rate}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.tax_amount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentTerms}>
          <Text style={styles.paymentTermsLabel}>Payment Terms</Text>
          <Text style={styles.paymentTermsText}>
            Payment is due within 14 days of invoice date. Please reference invoice number {invoice.invoice_number} with your payment.
          </Text>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your business • {business.name} • ABN {business.abn}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default InvoicePDFTemplate
