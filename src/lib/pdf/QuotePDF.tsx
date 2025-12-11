'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

// Types
type Customer = {
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

type LineItem = {
  id: string
  item_order: number
  item_type: 'labor' | 'materials' | 'equipment' | 'other'
  description: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  is_optional: boolean
}

type Quote = {
  id: string
  quote_number: string
  version: number
  status: string
  job_site_address: string
  job_description: string
  subtotal: number
  tax_rate: number
  gst_amount: number
  total: number
  deposit_required: boolean
  deposit_amount: number | null
  deposit_percentage: number | null
  valid_until: string
  terms_and_conditions: string | null
  customer_notes: string | null
  created_at: string
  customer: Customer
}

interface QuotePDFProps {
  quote: Quote
  lineItems: LineItem[]
  businessInfo?: {
    name: string
    abn: string
    email: string
    phone: string
    address: string
  }
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
  businessName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#0A1628',
    marginBottom: 5,
  },
  businessInfo: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  quoteTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#00D4AA',
    marginBottom: 5,
  },
  quoteNumber: {
    fontSize: 12,
    color: '#0A1628',
    marginBottom: 2,
  },
  quoteDate: {
    fontSize: 9,
    color: '#666666',
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
  tableRowOptional: {
    opacity: 0.6,
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
  itemType: {
    fontSize: 7,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  optionalTag: {
    fontSize: 7,
    color: '#9CA3AF',
    fontStyle: 'italic',
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
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  depositLabel: {
    color: '#666666',
    fontSize: 9,
  },
  depositValue: {
    color: '#0A1628',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
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
  termsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFFBEB',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
    marginBottom: 5,
  },
  termsText: {
    fontSize: 8,
    color: '#78350F',
    lineHeight: 1.4,
  },
  validitySection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  validityText: {
    fontSize: 9,
    color: '#1E40AF',
    textAlign: 'center',
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

const getCustomerName = (customer: Customer): string => {
  if (customer.company_name) return customer.company_name
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'
}

const getCustomerAddress = (customer: Customer): string => {
  const parts = [
    customer.street_address,
    customer.suburb,
    customer.state,
    customer.postcode,
  ].filter(Boolean)
  return parts.join(', ')
}

// Default business info
const defaultBusinessInfo = {
  name: 'Your Business Name',
  abn: 'ABN: XX XXX XXX XXX',
  email: 'contact@yourbusiness.com.au',
  phone: '0400 000 000',
  address: 'Sydney, NSW',
}

export default function QuotePDF({ quote, lineItems, businessInfo = defaultBusinessInfo }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.businessName}>{businessInfo.name}</Text>
            <Text style={styles.businessInfo}>{businessInfo.abn}</Text>
            <Text style={styles.businessInfo}>{businessInfo.email}</Text>
            <Text style={styles.businessInfo}>{businessInfo.phone}</Text>
            <Text style={styles.businessInfo}>{businessInfo.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
            <Text style={styles.quoteDate}>Date: {formatDate(quote.created_at)}</Text>
            {quote.version > 1 && (
              <Text style={styles.quoteDate}>Version: {quote.version}</Text>
            )}
          </View>
        </View>

        {/* Customer & Job Details */}
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <Text style={styles.value}>{getCustomerName(quote.customer)}</Text>
              {quote.customer.email && (
                <Text style={styles.businessInfo}>{quote.customer.email}</Text>
              )}
              {quote.customer.phone && (
                <Text style={styles.businessInfo}>{quote.customer.phone}</Text>
              )}
              {getCustomerAddress(quote.customer) && (
                <Text style={styles.businessInfo}>{getCustomerAddress(quote.customer)}</Text>
              )}
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Site</Text>
              <Text style={styles.value}>{quote.job_site_address}</Text>
            </View>
          </View>
        </View>

        {/* Job Description */}
        {quote.job_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Description</Text>
            <Text style={styles.value}>{quote.job_description}</Text>
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Items</Text>
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
                  index % 2 === 1 && styles.tableRowAlt,
                  item.is_optional && styles.tableRowOptional,
                ]}
              >
                <View style={styles.colDescription}>
                  <Text style={styles.itemType}>{item.item_type}</Text>
                  <Text style={styles.value}>
                    {item.description}
                    {item.is_optional && <Text style={styles.optionalTag}> (Optional)</Text>}
                  </Text>
                </View>
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
              <Text style={styles.totalValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST ({quote.tax_rate}%)</Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.gst_amount)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total (inc GST)</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(quote.total)}</Text>
            </View>
            {quote.deposit_required && (
              <View style={styles.depositRow}>
                <Text style={styles.depositLabel}>Deposit Required</Text>
                <Text style={styles.depositValue}>
                  {quote.deposit_percentage
                    ? `${quote.deposit_percentage}% (${formatCurrency((quote.total * quote.deposit_percentage) / 100)})`
                    : formatCurrency(quote.deposit_amount || 0)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Customer Notes */}
        {quote.customer_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{quote.customer_notes}</Text>
          </View>
        )}

        {/* Validity */}
        <View style={styles.validitySection}>
          <Text style={styles.validityText}>
            This quote is valid until {formatDate(quote.valid_until)}
          </Text>
        </View>

        {/* Terms & Conditions */}
        {quote.terms_and_conditions && (
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>{quote.terms_and_conditions}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by FlowTrade • flowtrade.com.au
          </Text>
        </View>
      </Page>
    </Document>
  )
}
