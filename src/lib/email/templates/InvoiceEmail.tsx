// FlowTrade Invoice Email Template
// Professional email template for sending invoices to customers

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

export interface InvoiceEmailProps {
  customerName: string
  invoiceNumber: string
  total: string
  dueDate: string
  issueDate: string
  businessName: string
  businessEmail?: string
  businessPhone?: string
  jobDescription?: string
  viewInvoiceUrl?: string
  payNowUrl?: string
}

export function InvoiceEmail({
  customerName,
  invoiceNumber,
  total,
  dueDate,
  issueDate,
  businessName,
  businessEmail,
  businessPhone,
  jobDescription,
  viewInvoiceUrl,
  payNowUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} from {businessName} - {total} due {dueDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerText}>{businessName}</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi {customerName},</Text>
            
            <Text style={paragraph}>
              Please find your invoice attached. Payment is due by {dueDate}.
            </Text>

            {/* Invoice Summary Box */}
            <Section style={invoiceBox}>
              <Text style={invoiceBoxTitle}>Invoice Summary</Text>
              <Hr style={invoiceBoxDivider} />
              <table style={invoiceTable}>
                <tbody>
                  <tr>
                    <td style={invoiceLabel}>Invoice Number:</td>
                    <td style={invoiceValue}>{invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style={invoiceLabel}>Issue Date:</td>
                    <td style={invoiceValue}>{issueDate}</td>
                  </tr>
                  <tr>
                    <td style={invoiceLabel}>Due Date:</td>
                    <td style={invoiceDueValue}>{dueDate}</td>
                  </tr>
                  <tr>
                    <td style={invoiceLabel}>Amount Due:</td>
                    <td style={invoiceTotalValue}>{total}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {jobDescription && (
              <Section style={jobSection}>
                <Text style={jobTitle}>Work Completed</Text>
                <Text style={jobText}>{jobDescription}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              Please ensure payment is made by {dueDate} to avoid any late fees. 
              If you have any questions about this invoice, please don&apos;t hesitate to get in touch.
            </Text>

            {/* Action Buttons */}
            <Section style={buttonSection}>
              {payNowUrl && (
                <Link href={payNowUrl} style={payButton}>
                  Pay Now
                </Link>
              )}
              {viewInvoiceUrl && (
                <Link href={viewInvoiceUrl} style={payNowUrl ? viewButton : button}>
                  View Invoice Online
                </Link>
              )}
            </Section>

            <Text style={paragraph}>
              Thank you for your business. We appreciate your prompt payment.
            </Text>

            <Text style={signature}>
              Kind regards,<br />
              {businessName}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              {businessName}
              {businessEmail && <><br />{businessEmail}</>}
              {businessPhone && <><br />{businessPhone}</>}
            </Text>
            <Text style={footerSubtext}>
              This invoice was sent via{' '}
              <Link href="https://flowtrade.com.au" style={footerLink}>
                FlowTrade
              </Link>
              {' '}- Smart Estimating for Australian Trades
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  marginTop: '40px',
  marginBottom: '40px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}

const header = {
  backgroundColor: '#0a1628',
  padding: '30px 40px',
}

const headerText = {
  color: '#00d4aa',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
}

const content = {
  padding: '40px',
}

const greeting = {
  fontSize: '18px',
  color: '#1a1a1a',
  marginBottom: '20px',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#4a4a4a',
  marginBottom: '20px',
}

const invoiceBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid #e2e8f0',
}

const invoiceBoxTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0a1628',
  margin: '0 0 12px 0',
}

const invoiceBoxDivider = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
}

const invoiceTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const invoiceLabel = {
  fontSize: '14px',
  color: '#64748b',
  padding: '8px 0',
  verticalAlign: 'top',
}

const invoiceValue = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '500',
  padding: '8px 0',
  textAlign: 'right' as const,
}

const invoiceDueValue = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '600',
  padding: '8px 0',
  textAlign: 'right' as const,
}

const invoiceTotalValue = {
  fontSize: '20px',
  color: '#00d4aa',
  fontWeight: '700',
  padding: '8px 0',
  textAlign: 'right' as const,
}

const jobSection = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
  border: '1px solid #bbf7d0',
}

const jobTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#166534',
  margin: '0 0 8px 0',
}

const jobText = {
  fontSize: '14px',
  color: '#15803d',
  margin: '0',
  lineHeight: '1.5',
}

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const payButton = {
  backgroundColor: '#00d4aa',
  color: '#0a1628',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '6px',
  display: 'inline-block',
  marginRight: '12px',
}

const viewButton = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '6px',
  display: 'inline-block',
}

const button = {
  backgroundColor: '#00d4aa',
  color: '#0a1628',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '6px',
  display: 'inline-block',
}

const signature = {
  fontSize: '15px',
  color: '#4a4a4a',
  lineHeight: '1.6',
}

const footer = {
  padding: '24px 40px',
  backgroundColor: '#f8fafc',
}

const footerDivider = {
  borderColor: '#e2e8f0',
  margin: '0 0 20px 0',
}

const footerText = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0 0 12px 0',
  lineHeight: '1.5',
}

const footerSubtext = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0',
}

const footerLink = {
  color: '#00d4aa',
  textDecoration: 'none',
}

export default InvoiceEmail
