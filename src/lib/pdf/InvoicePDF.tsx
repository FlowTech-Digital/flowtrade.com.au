import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

// Types
export type InvoiceCustomer = {
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

export type InvoiceLineItem = {
  id: string
  item_order: number
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

export type Invoice = {
  id: string
  invoice_number: string
  status: string
  subtotal: number
  gst_amount: number
  discount_amount: number | null
  total: number
  amount_paid: number
  amount_due: number | null
  issue_date: string
  due_date: string
  payment_terms: string | null
  notes: string | null
  footer_text: string | null
  customer: InvoiceCustomer
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
  lineItems: InvoiceLineItem[]
  businessInfo?: BusinessInfo
}

// Styles
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
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#00D4AA',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
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
    color: '#0A1628',
    marginBottom: 5,
  },
  businessNameWithLogo: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0A1628',
    marginBottom: 5,
  },
  businessInfo: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#00D4AA',
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#0A1628',
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 9,
    color: '#666666',
  },
  statusBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusDue: {
    backgroundColor: '#FEF3C7',
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  statusTextPaid: {
    color: '#065F46',
  },
  statusTextDue: {
    color: '#92400E',
  },
  statusTextOverdue: {
    color: '#991B1B',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0A1628',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 100,
    color: '#666666',
    fontSize: 9,
  },
  value: {
    flex: 1,
    color: '#0A1628',
    fontSize: 10,
  },
  customerInfoBlock: {
    marginBottom: 0,
  },
  customerName: {
    color: '#0A1628',
    fontSize: 10,
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 30,
  },
  column: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0A1628',
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    width: 50,
    textAlign: 'center',
  },
  colUnit: {
    width: 50,
    textAlign: 'center',
  },
  colPrice: {
    width: 80,
    textAlign: 'right',
  },
  colTotal: {
    width: 80,
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsBox: {
    width: 250,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    color: '#666666',
    fontSize: 10,
  },
  totalValue: {
    color: '#0A1628',
    fontSize: 10,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#00D4AA',
  },
  grandTotalLabel: {
    color: '#0A1628',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    color: '#00D4AA',
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  amountDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  amountDueLabel: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  amountDueValue: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  amountPaidLabel: {
    color: '#065F46',
    fontSize: 10,
  },
  amountPaidValue: {
    color: '#065F46',
    fontSize: 10,
  },
  notesSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0A1628',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 9,
    color: '#666666',
    lineHeight: 1.4,
  },
  paymentSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1E40AF',
    marginBottom: 5,
  },
  paymentText: {
    fontSize: 9,
    color: '#1E40AF',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  footerCustomText: {
    fontSize: 8,
    color: '#666666',
    marginTop: 4,
  },
})

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const getCustomerName = (customer: InvoiceCustomer): string => {
  if (customer.company_name) return customer.company_name
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
}

const getCustomerAddress = (customer: InvoiceCustomer): string => {
  const parts = [
    customer.street_address,
    customer.suburb,
    customer.state,
    customer.postcode,
  ].filter(Boolean)
  return parts.join(', ')
}

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return { badge: styles.statusPaid, text: styles.statusTextPaid }
    case 'overdue':
      return { badge: styles.statusOverdue, text: styles.statusTextOverdue }
    default:
      return { badge: styles.statusDue, text: styles.statusTextDue }
  }
}

// Default business info
const defaultBusinessInfo: BusinessInfo = {
  name: 'Your Business Name',
  abn: 'ABN: XX XXX XXX XXX',
  email: 'contact@yourbusiness.com.au',
  phone: '0400 000 000',
  address: 'Sydney, NSW',
  logo_url: null,
}

export default function InvoicePDF({ invoice, lineItems, businessInfo = defaultBusinessInfo }: InvoicePDFProps) {
  const customerAddress = getCustomerAddress(invoice.customer)
  const hasLogo = businessInfo.logo_url && businessInfo.logo_url.length > 0
  const statusStyle = getStatusStyle(invoice.status)
  const amountDue = invoice.amount_due ?? (invoice.total - invoice.amount_paid)
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {hasLogo && (
              <Image src={businessInfo.logo_url!} style={styles.logo} />
            )}
            <Text style={hasLogo ? styles.businessNameWithLogo : styles.businessName}>
              {businessInfo.name}
            </Text>
            <Text style={styles.businessInfo}>{businessInfo.abn}</Text>
            <Text style={styles.businessInfo}>{businessInfo.email}</Text>
            <Text style={styles.businessInfo}>{businessInfo.phone}</Text>
            <Text style={styles.businessInfo}>{businessInfo.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.invoiceDate}>Issue Date: {formatDate(invoice.issue_date)}</Text>
            <Text style={styles.invoiceDate}>Due Date: {formatDate(invoice.due_date)}</Text>
            <View style={[styles.statusBadge, statusStyle.badge]}>
              <Text style={[styles.statusText, statusStyle.text]}>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <View style={styles.customerInfoBlock}>
                <Text style={styles.customerName}>{getCustomerName(invoice.customer)}</Text>
                {invoice.customer.email && (
                  <Text style={styles.customerDetail}>{invoice.customer.email}</Text>
                )}
                {invoice.customer.phone && (
                  <Text style={styles.customerDetail}>{invoice.customer.phone}</Text>
                )}
                {customerAddress && (
                  <Text style={styles.customerDetail}>{customerAddress}</Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Terms</Text>
              <Text style={styles.value}>{invoice.payment_terms || 'Due on receipt'}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit</Text>
              <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>

            {/* Table Rows */}
            {lineItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={[styles.value, styles.colDescription]}>{item.description}</Text>
                <Text style={[styles.value, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.value, styles.colUnit]}>{item.unit}</Text>
                <Text style={[styles.value, styles.colPrice]}>{formatCurrency(item.unit_price)}</Text>
                <Text style={[styles.value, styles.colTotal]}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount_amount && invoice.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>-{formatCurrency(invoice.discount_amount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST (10%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.gst_amount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total (inc GST)</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
            </View>
            {invoice.amount_paid > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.amountPaidLabel}>Amount Paid</Text>
                <Text style={styles.amountPaidValue}>-{formatCurrency(invoice.amount_paid)}</Text>
              </View>
            )}
            {amountDue > 0 && (
              <View style={styles.amountDueRow}>
                <Text style={styles.amountDueLabel}>Amount Due</Text>
                <Text style={styles.amountDueValue}>{formatCurrency(amountDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentText}>
            Please ensure payment is made by {formatDate(invoice.due_date)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by FlowTrade • flowtrade.com.au
          </Text>
          {invoice.footer_text && (
            <Text style={styles.footerCustomText}>{invoice.footer_text}</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}
