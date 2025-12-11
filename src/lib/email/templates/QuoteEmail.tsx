// FlowTrade Quote Email Template
// Professional email template for sending quotes to customers

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

export interface QuoteEmailProps {
  customerName: string
  quoteNumber: string
  total: string
  validUntil: string
  businessName: string
  businessEmail?: string
  businessPhone?: string
  jobDescription?: string
  viewQuoteUrl?: string
}

export function QuoteEmail({
  customerName,
  quoteNumber,
  total,
  validUntil,
  businessName,
  businessEmail,
  businessPhone,
  jobDescription,
  viewQuoteUrl,
}: QuoteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Quote {quoteNumber} from {businessName} - {total}</Preview>
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
              Please find your quote attached. We&apos;ve prepared this estimate based on our 
              discussion and site assessment.
            </Text>

            {/* Quote Summary Box */}
            <Section style={quoteBox}>
              <Text style={quoteBoxTitle}>Quote Summary</Text>
              <Hr style={quoteBoxDivider} />
              <table style={quoteTable}>
                <tbody>
                  <tr>
                    <td style={quoteLabel}>Quote Number:</td>
                    <td style={quoteValue}>{quoteNumber}</td>
                  </tr>
                  <tr>
                    <td style={quoteLabel}>Total Amount:</td>
                    <td style={quoteTotalValue}>{total}</td>
                  </tr>
                  <tr>
                    <td style={quoteLabel}>Valid Until:</td>
                    <td style={quoteValue}>{validUntil}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {jobDescription && (
              <Section style={jobSection}>
                <Text style={jobTitle}>Job Description</Text>
                <Text style={jobText}>{jobDescription}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              This quote is valid until {validUntil}. If you have any questions or would 
              like to proceed, please don&apos;t hesitate to get in touch.
            </Text>

            {viewQuoteUrl && (
              <Section style={buttonSection}>
                <Link href={viewQuoteUrl} style={button}>
                  View Quote Online
                </Link>
              </Section>
            )}

            <Text style={paragraph}>
              Thank you for considering {businessName} for your project. We look forward 
              to working with you.
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
              This quote was sent via{' '}
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

const quoteBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid #e2e8f0',
}

const quoteBoxTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0a1628',
  margin: '0 0 12px 0',
}

const quoteBoxDivider = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
}

const quoteTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const quoteLabel = {
  fontSize: '14px',
  color: '#64748b',
  padding: '8px 0',
  verticalAlign: 'top',
}

const quoteValue = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '500',
  padding: '8px 0',
  textAlign: 'right' as const,
}

const quoteTotalValue = {
  fontSize: '20px',
  color: '#00d4aa',
  fontWeight: '700',
  padding: '8px 0',
  textAlign: 'right' as const,
}

const jobSection = {
  backgroundColor: '#fefce8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
  border: '1px solid #fef08a',
}

const jobTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#854d0e',
  margin: '0 0 8px 0',
}

const jobText = {
  fontSize: '14px',
  color: '#713f12',
  margin: '0',
  lineHeight: '1.5',
}

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
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

export default QuoteEmail
